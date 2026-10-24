import type { RequestHandler } from "express";

/**
 * Phase 0 spec §6.2. Set on every `/api`, `/portal/v1` and `/health` response and
 * NEVER on the frontend, so Replit's webview iframe keeps working (RP-07). No CORS
 * headers are set anywhere: the frontend is same-origin.
 */
export const securityHeaders: RequestHandler = (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  next();
};
