import type { Response } from "express";

export interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
    requestId: string;
  };
}

/**
 * Writes the error envelope (Phase 0 spec §6.3):
 * `{ error: { code, message, details, requestId } }`. `details` is always present.
 * `requestId` is the one PS-05 put in the `X-Request-Id` header.
 */
export function sendErrorEnvelope(
  res: Response,
  status: number,
  code: string,
  message: string,
  details: Record<string, unknown> = {},
): void {
  const header = res.getHeader("X-Request-Id");
  const body: ErrorEnvelope = {
    error: { code, message, details, requestId: typeof header === "string" ? header : "" },
  };
  res.status(status).json(body);
}
