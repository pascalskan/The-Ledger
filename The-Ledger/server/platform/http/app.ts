import express, { type Express, type RequestHandler } from "express";
import type { Logger } from "pino";
import { createPlatformAuth, createPortalAuth } from "../auth/tenant-context";
import type { AuthKeys } from "../auth/keys";
import { API_BACKEND_VARIABLES, type ApiConfig } from "../config/env";
import type { DbPool } from "../db/client";
import { sendErrorEnvelope } from "../errors/error-envelope";
import { createErrorHandler } from "../errors/error-handler";
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
 *   4. /api/v1       parser, [public routes], platform-token auth, [module routers], not-found, errors
 *   5. /api          anything else under /api: not-found (or 503 in frontend-only mode)
 *   6. /portal/v1    parser, [public routes], portal-token auth, [module routers], not-found, errors
 *   7. everything else falls through to the caller's frontend handlers
 *
 * The bracketed parts are added by commit 7 (module registry). It is a function
 * so that gate tests can build the same app. It opens no socket and, in
 * frontend-only mode, no database connection.
 */
export function createApiApp({ config, logger, db, auth }: CreateApiAppOptions): Express {
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
  app.use(
    "/api/v1",
    securityHeaders,
    jsonBodyParser,
    createPlatformAuth(auth),
    notFoundHandler,
    errorHandler,
  );
  app.use("/api", securityHeaders, notFoundHandler, errorHandler);
  app.use(
    "/portal/v1",
    securityHeaders,
    jsonBodyParser,
    createPortalAuth(auth),
    notFoundHandler,
    errorHandler,
  );
  return app;
}
