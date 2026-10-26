import type { Request } from "express";
import type { ExecutionContext } from "./execution-context";
import { MissingRequestContextError } from "../errors/platform-errors";

// Phase 0 spec PS-10 and §4.8: the per-request store that `contextOf(req)` reads. It is
// filled by the token middleware (PS-10, PS-11) and is a platform-private WeakMap keyed by
// the request object, so `contextOf` does not depend on AsyncLocalStorage: the context is
// found even after an `await` that left the request's async scope. Routers read the
// context only through `contextOf(req)`; there is no other way for a handler to get a
// company ID.

const contexts = new WeakMap<object, ExecutionContext>();

/** Platform-internal: called by the token middleware. */
export function setRequestContext(req: Request, context: ExecutionContext): void {
  contexts.set(req, context);
}

/**
 * The execution context of an authenticated request. Throws MissingRequestContextError (a
 * 500 programming error) on a request with none, for example inside a public route.
 */
export function contextOf(req: Request): ExecutionContext {
  const context = contexts.get(req);
  if (context === undefined) throw new MissingRequestContextError();
  return context;
}
