import type { Request } from "express";

/** The marker for a request that matched no route. */
export const UNMATCHED_ROUTE = "<unmatched>";
const MAX_ROUTE_LENGTH = 256;

/** The template captured at the moment Express matched the route (see trackRoute). */
const templates = new WeakMap<object, string>();

/**
 * Records the matched route template as Express matches it.
 *
 * `req.baseUrl + req.route.path` is only right while the matched route's router is
 * still the one running: when an error propagates out of a mounted router (the error
 * path, PS-07) Express has already restored `req.baseUrl` to the parent's, which would
 * drop the router's own mount path from the template. So the template is captured at
 * the moment `req.route` is assigned, when `req.baseUrl` is exactly the matched
 * router's. Called by PS-05 for every request; the last match wins.
 */
export function trackRoute(req: Request): void {
  let current: unknown;
  Object.defineProperty(req, "route", {
    configurable: true,
    enumerable: true,
    get: () => current,
    set: (value: unknown) => {
      current = value;
      const path = (value as { path?: unknown } | undefined)?.path;
      if (typeof path === "string") templates.set(req, `${req.baseUrl}${path}`);
    },
  });
}

/**
 * The matched route TEMPLATE (for example `/api/v1/jobs/:jobId`), capped at 256
 * characters. A request that matched no route is `<unmatched>`. The raw path, the
 * query string and the values of path parameters are never used (Phase 0 spec
 * §4.7, R2-13, R3-14).
 */
export function routeTemplate(req: Pick<Request, "baseUrl" | "route">): string {
  const tracked = templates.get(req);
  if (tracked !== undefined) return tracked.slice(0, MAX_ROUTE_LENGTH);
  const route = req.route as { path?: unknown } | undefined;
  if (route === undefined || typeof route.path !== "string") return UNMATCHED_ROUTE;
  return `${req.baseUrl}${route.path}`.slice(0, MAX_ROUTE_LENGTH);
}
