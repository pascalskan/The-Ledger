import type { RequestHandler } from "express";
import type { Logger } from "pino";
import { runWithLogContext } from "../context/request-context";
import { logContextOf } from "./request-id";
import { routeTemplate } from "./route-template";

const LOGGED_PREFIXES = ["/api/", "/portal/v1/"];
const LOGGED_EXACT = ["/api", "/portal/v1", "/health"];

function isLoggedPath(path: string): boolean {
  return LOGGED_EXACT.includes(path) || LOGGED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

/**
 * PS-06. Writes exactly one line per API, portal or health request, when the
 * response finishes. It reads only the method, the matched route template, the
 * status code, a monotonic duration and the request's log context. It never
 * reads a body, query string, header or raw path, and it does not patch
 * `res.json` or `res.send`. The level is INFO, except DEBUG for `/health`.
 */
export function requestLogger(logger: Logger): RequestHandler {
  return (req, res, next) => {
    // Decided now, from the pathname alone: req.path is relative to the mount point later.
    if (!isLoggedPath(req.path)) return next();
    const isHealth = req.path === "/health";
    const started = process.hrtime.bigint();
    const context = logContextOf(req);

    res.on("finish", () => {
      const durationMs = Math.round(Number(process.hrtime.bigint() - started) / 1e4) / 100;
      const fields = {
        method: req.method,
        route: routeTemplate(req),
        statusCode: res.statusCode,
        durationMs,
      };
      // The store is shared and mutable, so companyId and userId set by authentication are included.
      const write = () =>
        isHealth ? logger.debug(fields, "request") : logger.info(fields, "request");
      if (context) runWithLogContext(context, write);
      else write();
    });
    next();
  };
}
