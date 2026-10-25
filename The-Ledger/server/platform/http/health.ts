import type { RequestHandler } from "express";
import type { Logger } from "pino";
import type { ApiConfig } from "../config/env";
import type { DbPool } from "../db/client";

// PS-08. `GET /health`. No authentication. The body holds only the status and the mode:
// no version, host, database name or error text.
//
// Frontend-only mode answers `200 {"status":"ok","mode":"frontend_only"}` and opens no
// database connection. Full mode acquires a pooled connection (through `withClient`, so the
// runtime role self-check applies) and runs `SELECT 1`, with a 2-second timeout.
//
// One check at a time (R2-15): concurrent requests share one in-flight check, and its
// result is reused for 1 second, so a flood of health requests uses at most one pool
// connection and cannot exhaust the pool.

export const HEALTH_TIMEOUT_MS = 2_000;
export const HEALTH_CACHE_MS = 1_000;

export function createHealthHandler(config: ApiConfig, logger: Logger, db?: DbPool): RequestHandler {
  if (config.mode === "frontend_only") {
    return (_req, res) => {
      res.status(200).json({ status: "ok", mode: "frontend_only" });
    };
  }
  if (db === undefined) {
    throw new Error("Full mode needs a database pool for /health");
  }

  let inFlight: Promise<boolean> | undefined;
  let cached: { ok: boolean; at: number } | undefined;

  async function runCheck(pool: DbPool): Promise<boolean> {
    let timer: NodeJS.Timeout | undefined;
    try {
      const timeout = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error("The health check timed out")), HEALTH_TIMEOUT_MS);
      });
      await Promise.race([pool.withClient((client) => client.query("SELECT 1")), timeout]);
      return true;
    } catch (error) {
      // Through the error serializer, never the raw error.
      logger.warn({ err: error }, "Health check failed");
      return false;
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }

  function check(pool: DbPool): Promise<boolean> {
    if (cached !== undefined && Date.now() - cached.at < HEALTH_CACHE_MS) {
      return Promise.resolve(cached.ok);
    }
    if (inFlight === undefined) {
      inFlight = runCheck(pool).then((ok) => {
        cached = { ok, at: Date.now() };
        inFlight = undefined;
        return ok;
      });
    }
    return inFlight;
  }

  return async (_req, res) => {
    const ok = await check(db);
    res.status(ok ? 200 : 503).json({ status: ok ? "ok" : "unavailable", mode: "full" });
  };
}
