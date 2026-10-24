import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import { runWithLogContext, type LogContext } from "../context/request-context";
import { trackRoute } from "./route-template";

export const REQUEST_ID_HEADER = "X-Request-Id";

/** The log context of a request, kept so that handlers that run outside the async scope can reuse it. */
const contexts = new WeakMap<object, LogContext>();

export function logContextOf(req: object): LogContext | undefined {
  return contexts.get(req);
}

/**
 * PS-05. Generates a request ID, sets `X-Request-Id`, and runs the rest of the
 * request inside the log context `{ requestId }`. Any inbound `X-Request-Id` is
 * ignored, so a client cannot inject values into logs.
 */
export const requestId: RequestHandler = (req, res, next) => {
  const context: LogContext = { requestId: randomUUID() };
  contexts.set(req, context);
  trackRoute(req);
  res.setHeader(REQUEST_ID_HEADER, context.requestId!);
  runWithLogContext(context, () => next());
};
