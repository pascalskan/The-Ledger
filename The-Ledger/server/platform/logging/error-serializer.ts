import { types } from "node:util";
import { ZodError } from "zod";
import { AppError } from "../errors/app-error";
import { redactUrlCredentials } from "./redact";

// Phase 0 spec §4.7: the error serializer. It works from an ALLOWLIST: only the
// fields named in the spec's table are ever logged. Anything that can quote
// input (a PostgreSQL message, a parser message, a Zod issue, bound parameters)
// is never logged in its own words.
//
// Only the "any other error" kind has its message logged as written, so platform
// code and modules must never put input values into an error message.

export type SafeError = Readonly<Record<string, unknown>>;

/** Outputs of safeError, so serializing one again (the logger does it twice) changes nothing. */
const safeOutputs = new WeakSet<object>();

const MAX_CAUSE_DEPTH = 3;

function mark(output: Record<string, unknown>): SafeError {
  const frozen = Object.freeze(output);
  safeOutputs.add(frozen);
  return frozen;
}

export function isSafeError(value: unknown): boolean {
  return typeof value === "object" && value !== null && safeOutputs.has(value);
}

/** True for anything the platform treats as an error object. */
export function isErrorObject(value: unknown): value is Error {
  return value instanceof Error || types.isNativeError(value);
}

function stringField(source: object, key: string): string | undefined {
  const field = (source as Record<string, unknown>)[key];
  return typeof field === "string" && field !== "" ? field : undefined;
}

/** The driver's DatabaseError: a five-character SQLSTATE `code` and the protocol `severity` field. */
function isPostgresError(error: Error): boolean {
  const code = stringField(error, "code");
  return code !== undefined && /^[0-9A-Z]{5}$/.test(code) && stringField(error, "severity") !== undefined;
}

/** A database-library wrapper: has `query`, `params` or `parameters`, or a PostgreSQL error as `cause`. */
function isDatabaseWrapper(error: Error): boolean {
  const source = error as unknown as Record<string, unknown>;
  if ("query" in source || "params" in source || "parameters" in source) return true;
  return isErrorObject(error.cause) && isPostgresError(error.cause);
}

function isJsonParseError(error: Error): boolean {
  return (error as { type?: unknown }).type === "entity.parse.failed";
}

/**
 * http-errors style: `expose === true` and a status from 400 to 499 (Express and its
 * parsers). The router's URIError for a path parameter that cannot be URL-decoded
 * (R3-14) has a 400 status but no `expose`, and its message quotes the parameter, so
 * it is treated the same way.
 */
function isExposedClientError(error: Error): boolean {
  const source = error as unknown as { expose?: unknown; status?: unknown; statusCode?: unknown };
  const status = typeof source.status === "number" ? source.status : source.statusCode;
  if (typeof status !== "number" || status < 400 || status > 499) return false;
  return source.expose === true || error instanceof URIError;
}

function serialize(error: Error, level: number): SafeError {
  // 1. PostgreSQL error. The server's message is NEVER logged, for any SQLSTATE class.
  if (isPostgresError(error)) {
    const code = stringField(error, "code")!;
    const out: Record<string, unknown> = {
      name: error.name,
      pgCode: code,
      severity: stringField(error, "severity"),
      message: `PostgreSQL error ${code}`,
    };
    for (const key of ["schema", "table", "column", "constraint", "dataType"]) {
      const field = stringField(error, key);
      if (field !== undefined) out[key] = field;
    }
    return mark(out);
  }

  // 2. Database-library wrapper (its message holds the SQL and the bound values).
  if (isDatabaseWrapper(error)) {
    const out: Record<string, unknown> = { name: error.name, message: "Database query failed" };
    const cause = serializeCause(error, level);
    if (cause !== undefined) out.cause = cause;
    return mark(out);
  }

  // 3. JSON body-parser error (V8's message quotes the start of the body).
  if (isJsonParseError(error)) {
    return mark({ name: error.name, code: "MALFORMED_JSON" });
  }

  // 4. Other client errors from Express or its parsers (the message can quote input).
  if (isExposedClientError(error)) {
    const source = error as unknown as { type?: unknown; status?: unknown; statusCode?: unknown };
    const out: Record<string, unknown> = {};
    if (typeof source.type === "string") out.type = source.type;
    out.status = typeof source.status === "number" ? source.status : source.statusCode;
    return mark(out);
  }

  // 5. ZodError (issues can hold received values).
  if (error instanceof ZodError) {
    return mark({ name: error.name, code: "VALIDATION_ERROR", issueCount: error.issues.length });
  }

  // 6. AppError (details go to the client, not the log).
  if (error instanceof AppError) {
    return mark({
      name: error.name,
      code: error.code,
      status: error.status,
      safeMessage: error.safeMessage,
    });
  }

  // 7. Any other error: the only row whose message is logged as written (URL credentials removed).
  const out: Record<string, unknown> = { name: error.name };
  const code = (error as { code?: unknown }).code;
  if (typeof code === "string") out.code = code;
  // Credentials in a URL the error quotes ("could not reach postgres://u:pw@h/db") are removed.
  out.message = typeof error.message === "string" ? redactUrlCredentials(error.message) : "";
  if (typeof error.stack === "string") out.stack = redactUrlCredentials(error.stack);
  const cause = serializeCause(error, level);
  if (cause !== undefined) out.cause = cause;
  return mark(out);
}

/** Follows `cause` to a depth of three, applying the same table at each level. */
function serializeCause(error: Error, level: number): SafeError | string | undefined {
  const cause = error.cause;
  if (cause === undefined || cause === null) return undefined;
  if (level >= MAX_CAUSE_DEPTH) return "[depth limit]";
  if (!isErrorObject(cause)) return "[non-error cause]";
  return serialize(cause, level + 1);
}

/**
 * Makes an error safe to log. An already-safe object, and any value that is not an
 * Error, is returned unchanged (the logger's object walk has already examined the
 * contents of non-Error values).
 */
export function safeError<T>(value: T): T | SafeError {
  if (!isErrorObject(value)) return value;
  return serialize(value, 0);
}
