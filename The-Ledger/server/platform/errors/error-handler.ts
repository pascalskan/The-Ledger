import type { ErrorRequestHandler } from "express";
import type { Logger } from "pino";
import { ZodError } from "zod";
import { routeTemplate } from "../http/route-template";
import { isErrorObject } from "../logging/error-serializer";
import { AppError, UnauthenticatedError } from "./app-error";
import { sendErrorEnvelope } from "./error-envelope";

// PS-07, Phase 0 spec §6.3. The error handler knows only AppError, ZodError, the
// body parser's errors, other http-errors-style client errors, and "anything
// else". The response carries a fixed message (an AppError's own safeMessage is
// the only message passed through), never a stack trace, database text or an
// error's own message.

interface Described {
  status: number;
  code: string;
  message: string;
  details: Record<string, unknown>;
  /** Log level for the error line; 4xx are DEBUG, 5xx are ERROR. */
  level: "debug" | "error";
}

function issueDetails(error: ZodError): Record<string, unknown> {
  const details: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_root";
    (details[key] ??= []).push(issue.message);
  }
  return details;
}

function describe(error: unknown): Described {
  if (error instanceof AppError) {
    return {
      status: error.status,
      code: error.code,
      message: error.safeMessage,
      details: { ...(error.details ?? {}) },
      level: error.status >= 500 ? "error" : "debug",
    };
  }
  if (error instanceof ZodError) {
    return {
      status: 400,
      code: "VALIDATION_ERROR",
      message: "Request validation failed.",
      details: issueDetails(error),
      level: "debug",
    };
  }
  if (isErrorObject(error)) {
    const source = error as unknown as {
      type?: unknown;
      status?: unknown;
      statusCode?: unknown;
      expose?: unknown;
    };
    const type = typeof source.type === "string" ? source.type : undefined;
    const status = typeof source.status === "number" ? source.status : source.statusCode;
    const clientStatus =
      typeof status === "number" && status >= 400 && status <= 499 ? status : undefined;

    if (type === "entity.parse.failed") {
      return {
        status: 400,
        code: "MALFORMED_JSON",
        message: "Request body is not valid JSON.",
        details: {},
        level: "debug",
      };
    }
    if (type === "entity.too.large") {
      return {
        status: 413,
        code: "PAYLOAD_TOO_LARGE",
        message: "Request body is too large.",
        details: {},
        level: "debug",
      };
    }
    if (type === "charset.unsupported" || type === "encoding.unsupported") {
      return {
        status: 415,
        code: "UNSUPPORTED_MEDIA_TYPE",
        message: "The request body's encoding is not supported.",
        details: {},
        level: "debug",
      };
    }
    // Other client errors: http-errors style (expose === true), or the router's
    // URIError for a path parameter that cannot be URL-decoded (R3-14).
    if (clientStatus !== undefined && (source.expose === true || error instanceof URIError)) {
      return {
        status: clientStatus,
        code: clientStatus === 400 ? "BAD_REQUEST" : "CLIENT_ERROR",
        message: "The request could not be processed.",
        details: {},
        level: "debug",
      };
    }
  }
  return {
    status: 500,
    code: "INTERNAL_ERROR",
    message: "An unexpected error occurred.",
    details: {},
    level: "error",
  };
}

/**
 * The global error handler for the API, portal and health routers. Errors raised
 * by Vite or static serving are not routed here and keep Express's default.
 */
export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (error, req, res, _next) => {
    const described = describe(error);
    const route = routeTemplate(req);

    // Only the serializer's safe form of an error is ever logged. A thrown value that
    // is not an Error (a string, an object) is never logged: only its type is.
    const logged = isErrorObject(error) ? { err: error } : { thrownType: typeof error };
    if (described.level === "error") {
      logger.error({ ...logged, method: req.method, route }, "Request failed");
    } else {
      logger.debug({ ...logged, status: described.status }, "Request rejected");
    }

    // If headers have already been sent, the handler only logs and ends the response.
    if (res.headersSent) {
      res.end();
      return;
    }
    if (described.status === 401) {
      const invalid = error instanceof UnauthenticatedError && error.invalidToken;
      res.setHeader("WWW-Authenticate", invalid ? 'Bearer error="invalid_token"' : "Bearer");
    }
    sendErrorEnvelope(res, described.status, described.code, described.message, described.details);
  };
}
