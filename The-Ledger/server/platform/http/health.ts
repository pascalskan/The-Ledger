import type { RequestHandler } from "express";
import type { Logger } from "pino";
import type { ApiConfig } from "../config/env";

/**
 * PS-08. `GET /health`. No authentication. The body holds only the status and the
 * mode: no version, host, database name or error text.
 *
 * Frontend-only mode answers `200 {"status":"ok","mode":"frontend_only"}`.
 * The full-mode check (a pooled `SELECT 1`, 2-second timeout, one shared check) needs
 * the database client and arrives with commits 4 and 6. Until then a full-mode API has
 * no database, so it honestly reports itself unavailable.
 */
export function createHealthHandler(config: ApiConfig, logger: Logger): RequestHandler {
  if (config.mode === "frontend_only") {
    return (_req, res) => {
      res.status(200).json({ status: "ok", mode: "frontend_only" });
    };
  }
  return (_req, res) => {
    logger.warn("Health check: the database client is not available yet");
    res.status(503).json({ status: "unavailable", mode: "full" });
  };
}
