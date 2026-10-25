import pino, { type DestinationStream, type Logger, type LoggerOptions } from "pino";
import type { LogLevel } from "../config/env";
import { getLogContext } from "../context/request-context";
import { isErrorObject, isSafeError, safeError } from "./error-serializer";
import { redactUrlCredentials } from "./redact";

export { redactUrlCredentials };

// Phase 0 spec §4.7. One pino logger per process: JSON to stdout, no transports,
// no pino-pretty. Level is an upper-case label, `timestamp` is ISO 8601 and the
// message key is `message` (BACKEND_OBSERVABILITY_ARCHITECTURE.md, Log Structure).
//
// Errors are made safe WHEREVER they appear in a log call (R2-13, R3-13): as the first argument,
// under any key or array index of the logged object, in a child logger's bindings, as the message
// or as a format argument (`%o`, `%j`, `%s`), and behind a `toJSON`. Strings that carry URL
// credentials (`scheme://user:password@host`) lose them in the same pass.

export type Service = "api" | "worker" | "migrate";

/** Containers deeper than this are replaced, so nothing below the walk is logged unexamined (R3-13). */
const MAX_WALK_DEPTH = 3;
const DEPTH_LIMIT = "[depth limit]";

function hasToJSON(value: object): value is { toJSON(): unknown } {
  return typeof (value as { toJSON?: unknown }).toJSON === "function";
}

/**
 * Copies `value`, passing EVERY Error found at any key or array index, to a depth of 3, through
 * safeError; calls `toJSON` where an object has one and walks the result (so an Error wrapped
 * in a `toJSON`, and a URL, are examined); and removes URL credentials from every string. A
 * value at depth 4 or deeper is replaced by "[depth limit]". The root object is depth 0, its
 * values depth 1.
 */
function walk(value: unknown, depth: number): unknown {
  if (depth > MAX_WALK_DEPTH) return DEPTH_LIMIT;
  if (typeof value === "string") return redactUrlCredentials(value);
  if (typeof value !== "object" || value === null) return value;
  if (isErrorObject(value)) return safeError(value);
  if (isSafeError(value)) return value;
  if (hasToJSON(value)) {
    let json: unknown;
    try {
      json = value.toJSON();
    } catch {
      return "[unserializable]";
    }
    // A toJSON that returns itself (or an ancestor) ends at the depth limit.
    return walk(json, depth + 1);
  }
  if (Array.isArray(value)) return value.map((item) => walk(item, depth + 1));
  const copy: Record<string, unknown> = {};
  for (const key of Object.keys(value)) {
    let child: unknown;
    try {
      child = (value as Record<string, unknown>)[key];
    } catch {
      child = "[unreadable]";
    }
    copy[key] = walk(child, depth + 1);
  }
  return copy;
}

/** The `formatters.log` and `formatters.bindings` hooks: every error and credential made safe. */
export function makeLoggedObjectSafe(object: Record<string, unknown>): Record<string, unknown> {
  // The root is a plain object; its values are depth 1.
  const copy: Record<string, unknown> = {};
  for (const key of Object.keys(object)) copy[key] = walk(object[key], 1);
  return copy;
}

/** The message pino would otherwise take from a raw error (a PostgreSQL message quotes values). */
function safeMessageOf(error: unknown): string {
  const safe = safeError(error) as Record<string, unknown>;
  if (typeof safe.message === "string") return safe.message;
  if (typeof safe.name === "string") return safe.name;
  return "Error";
}

/**
 * The pino options, exposed so a test can build an UNPROTECTED logger (without
 * `formatters.log`) to prove its leak cases are not vacuous (G0-27(k)).
 */
export function buildLoggerOptions(service: Service, level: LogLevel = "info"): LoggerOptions {
  return {
    level,
    base: { service },
    messageKey: "message",
    timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
    formatters: {
      level: (label) => ({ level: label.toUpperCase() }),
      log: makeLoggedObjectSafe,
      // Child loggers (modules get one) carry bindings: examined by the same walk.
      bindings: makeLoggedObjectSafe,
    },
    // pino installs its own `err` serializer unless one is given, and that one would rewrite the
    // safe object formatters.log produces (it adds fields and re-reads message and stack). Ours
    // leaves a safe object alone. No other key needs one: formatters.log makes an Error safe
    // wherever it sits.
    serializers: { err: safeError },
    mixin: () => {
      const context = getLogContext();
      const fields: Record<string, string> = {};
      if (context?.requestId !== undefined) fields.requestId = context.requestId;
      if (context?.companyId !== undefined) fields.companyId = context.companyId;
      if (context?.userId !== undefined) fields.userId = context.userId;
      if (context?.runId !== undefined) fields.runId = context.runId;
      return fields;
    },
    hooks: {
      // EVERY argument goes through the walk, and none reaches pino as it was given:
      //  - pino copies an error's own message into the line's message when it is logged as
      //    `logger.error(err)` or `{ err }` without a message, and takes the message from
      //    the second argument even when that is an Error (`logger.error({ a: 1 }, err)`);
      //  - format arguments (`%o`, `%j`, `%s`) would print an Error's enumerable properties,
      //    `detail` and `where` included.
      // An Error in the message position becomes its safe one-line message; everywhere else a
      // safe copy replaces it.
      logMethod(args, method) {
        const first: unknown = args[0];
        const safeRest = (from: number, messagePosition: boolean): unknown[] =>
          args.slice(from).map((arg, index) => {
            if (messagePosition && index === 0 && isErrorObject(arg)) return safeMessageOf(arg);
            return walk(arg, 1);
          });
        let call: unknown[];
        if (isErrorObject(first)) {
          // logger.error(err[, msg, ...formatArgs])
          const rest = safeRest(1, true);
          call = [{ err: first }, typeof rest[0] === "string" ? rest[0] : safeMessageOf(first), ...rest.slice(1)];
        } else if (typeof first === "object" && first !== null) {
          // logger.error(obj[, msg, ...formatArgs])
          const rest = safeRest(1, true);
          const err = (first as Record<string, unknown>).err;
          if (
            rest[0] === undefined &&
            (first as Record<string, unknown>).message === undefined &&
            isErrorObject(err)
          ) {
            rest[0] = safeMessageOf(err);
          }
          call = [first, ...rest];
        } else {
          // logger.error("format string", ...formatArgs)
          call = args.map((arg) => walk(arg, 1));
        }
        return method.apply(this, call as unknown as Parameters<typeof method>);
      },
    },
  };
}

/**
 * Creates the process logger. `destination` is injectable for tests (an in-memory
 * stream); by default pino writes JSON to stdout.
 */
export function createLogger(
  options: { service: Service; level?: LogLevel; destination?: DestinationStream },
): Logger {
  const loggerOptions = buildLoggerOptions(options.service, options.level ?? "info");
  const logger = options.destination ? pino(loggerOptions, options.destination) : pino(loggerOptions);
  return protectChildBindings(logger);
}

/**
 * pino resets `formatters.bindings` for every child logger, so the formatter above only ever sees
 * the root bindings. A child's bindings (modules get one) are logged on every line the child
 * writes, so they go through the same walk here, before pino sees them. Children inherit this
 * `child`, so grandchildren are covered too.
 */
function protectChildBindings(logger: Logger): Logger {
  const originalChild = logger.child;
  logger.child = function (this: Logger, bindings, childOptions) {
    return originalChild.call(this, makeLoggedObjectSafe(bindings as Record<string, unknown>), childOptions);
  } as Logger["child"];
  return logger;
}

export type { Logger };
