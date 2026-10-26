import express, { Router, type Express, type RequestHandler } from "express";
import type { Logger } from "pino";
import { createPlatformAuth, createPortalAuth } from "../auth/tenant-context";
import type { AuthKeys } from "../auth/keys";
import { API_BACKEND_VARIABLES, type ApiConfig } from "../config/env";
import type { DbPool } from "../db/client";
import { sendErrorEnvelope } from "../errors/error-envelope";
import { createErrorHandler } from "../errors/error-handler";
import { buildRegistries, type Registries } from "../registry/build-registries";
import type { ModuleRegistration } from "../registry/types";
import { createHealthHandler } from "./health";
import { notFoundHandler } from "./not-found";
import { requestId } from "./request-id";
import { requestLogger } from "./request-logger";
import { securityHeaders } from "./security-headers";

export interface CreateApiAppOptions {
  readonly config: ApiConfig;
  readonly logger: Logger;
  /** The `ledger_app` pool. Required in full mode; unused (and never opened) in frontend-only mode. */
  readonly db?: DbPool;
  /** The imported token keys. Required in full mode. */
  readonly auth?: AuthKeys;
  /**
   * The modules to mount (full mode). The registries are built here, for the API process.
   * An entry point that needs the registries first (to install their runner) builds them
   * with `buildRegistries` and passes `registries` instead.
   */
  readonly modules?: readonly ModuleRegistration[];
  readonly registries?: Registries;
}

// JSON only, 1 MB (BACKEND_API_ARCHITECTURE.md, API Security Standards). Mounted on
// the API and portal routers only, so SPA and Vite paths never pass through a parser.
const jsonBodyParser: RequestHandler = express.json({ limit: "1mb" });

const NOT_CONFIGURED: RequestHandler = (_req, res) => {
  sendErrorEnvelope(res, 503, "BACKEND_NOT_CONFIGURED", "The backend is not configured.");
};

/**
 * PS-04. Builds the Express app in this order (frontend serving is mounted last
 * by the caller, PS-02 step 5):
 *
 *   1. request ID and context     2. request logger
 *   3. GET /health
 *   4. /api/v1       parser, public routes, platform-token auth, module routers, not-found, errors
 *   5. /api          anything else under /api: not-found (or 503 in frontend-only mode)
 *   6. /portal/v1    parser, public routes, portal-token auth, module routers, not-found, errors
 *   7. everything else falls through to the caller's frontend handlers
 *
 * Each module's router is mounted only at its own namespace, so its router-level middleware
 * never runs on another module's paths. Public routes are mounted at their exact method and
 * path before token middleware, and nowhere else. It is a function
 * so that gate tests can build the same app. It opens no socket and, in
 * frontend-only mode, no database connection.
 */
export function createApiApp({ config, logger, db, auth, modules, registries }: CreateApiAppOptions): Express {
  const app = express();
  app.disable("x-powered-by"); // for the whole app, frontend included
  // trust proxy stays false: Phase 0 reads no client address or protocol (RP-07).

  app.use(requestId);
  app.use(requestLogger(logger));

  app.get("/health", securityHeaders, createHealthHandler(config, logger, db));

  const errorHandler = createErrorHandler(logger);

  if (config.mode === "frontend_only") {
    logger.warn(
      { variables: API_BACKEND_VARIABLES },
      "Backend not configured: running in frontend-only mode",
    );
    app.use("/api", securityHeaders, NOT_CONFIGURED);
    app.use("/portal/v1", securityHeaders, NOT_CONFIGURED);
    return app;
  }

  // Full mode.
  if (auth === undefined) throw new Error("Full mode needs the imported token keys");
  if (db === undefined) throw new Error("Full mode needs a database pool");
  const wired =
    registries ??
    buildRegistries({ modules: modules ?? [], process: "api", pool: db, logger, nodeEnv: config.nodeEnv });

  const surfaces = [
    { surface: "api" as const, mount: "/api/v1", authenticate: createPlatformAuth(auth), routers: wired.apiRouters },
    { surface: "portal" as const, mount: "/portal/v1", authenticate: createPortalAuth(auth), routers: wired.portalRouters },
  ];
  for (const { surface, mount, authenticate, routers } of surfaces) {
    const publicRouter = Router();
    for (const route of wired.publicRoutes.filter((r) => r.surface === surface)) {
      (publicRouter as unknown as Record<string, (path: string, handler: RequestHandler) => void>)[
        route.method.toLowerCase()
      ]!(route.path, route.handler);
    }
    const moduleRouter = Router();
    for (const { namespace, router } of routers) moduleRouter.use(namespace, router);
    app.use(mount, securityHeaders, jsonBodyParser, publicRouter, authenticate, moduleRouter, notFoundHandler, errorHandler);
    if (surface === "api") app.use("/api", securityHeaders, notFoundHandler, errorHandler);
  }
  return app;
}
