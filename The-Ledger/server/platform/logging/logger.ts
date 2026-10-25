import pino, { type DestinationStream, type Logger, type LoggerOptions } from "pino";
import type { LogLevel } from "../config/env";
import { getLogContext } from "../context/request-context";
import { isErrorObject, isSafeError, safeError } from "./error-serializer";

// Phase 0 spec §4.7. One pino logger per process: JSON to stdout, no transports,
// no pino-pretty. Level is an upper-case label, `timestamp` is ISO 8601 and the
// message key is `message` (BACKEND_OBSERVABILITY_ARCHITECTURE.md, Log Structure).

export type Service = "api" | "worker" | "migrate";

/** Containers deeper than this are replaced, so nothing below the walk is logged unexamined (R3-13). */
const MAX_WALK_DEPTH = 3;
const DEPTH_LIMIT = "[depth limit]";

function isWalkable(value: unknown): value is object {
  if (typeof value !== "object" || value === null) return false;
  if (Array.isArray(value)) return true;
  // Date, Buffer, URL and similar serialize themselves.
  return typeof (value as { toJSON?: unknown }).toJSON !== "function";
}

/**
 * Copies `value`, passing EVERY Error found at any key or array index, to a depth
 * of 3, through safeError. A value at depth 4 or deeper is replaced by
 * "[depth limit]". The root object is depth 0, its values depth 1.
 */
function walk(value: unknown, depth: number): unknown {
  if (depth > MAX_WALK_DEPTH) return DEPTH_LIMIT;
  if (isErrorObject(value)) return safeError(value);
  if (isSafeError(value) || !isWalkable(value)) return value;
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

/** The `formatters.log` hook: makes every logged error safe, whatever key it is under. */
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
    },
    serializers: { err: safeError, error: safeError },
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
      // pino copies an error's own message into the log line's message when it is
      // logged as `logger.error(err)` or `{ err }` without a message. For a
      // PostgreSQL error that message quotes input, so supply the safe one first.
      logMethod(args, method) {
        const first: unknown = args[0];
        if (isErrorObject(first)) {
          const rest = args.slice(1) as [string?];
          const message = typeof rest[0] === "string" ? rest[0] : safeMessageOf(first);
          return method.apply(this, [{ err: first }, message] as unknown as Parameters<typeof method>);
        }
        if (
          typeof first === "object" &&
          first !== null &&
          args[1] === undefined &&
          (first as Record<string, unknown>).message === undefined &&
          isErrorObject((first as Record<string, unknown>).err)
        ) {
          const message = safeMessageOf((first as Record<string, unknown>).err);
          return method.apply(this, [first, message] as unknown as Parameters<typeof method>);
        }
        return method.apply(this, args);
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
  return options.destination
    ? pino(loggerOptions, options.destination)
    : pino(loggerOptions);
}

export type { Logger };
