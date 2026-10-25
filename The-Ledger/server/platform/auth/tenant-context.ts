import type { Request, RequestHandler } from "express";
import {
  createExecutionContext,
  expireContext,
  toCompanyId,
  type Actor,
} from "../context/execution-context";
import { setRequestContext } from "../context/request-store";
import { runWithLogContext, type LogContext } from "../context/request-context";
import { UnauthenticatedError } from "../errors/app-error";
import { logContextOf } from "../http/request-id";
import type { AuthKeys } from "./keys";
import {
  TokenExpiredError,
  verifyPlatformToken,
  verifyPortalToken,
  type PlatformTokenClaims,
  type PortalTokenClaims,
} from "./jwt";

// PS-10 and PS-11, Phase 0 spec §4.3: the token middleware that builds the tenant context.
//
// The Authorization header must match exactly `Bearer <three base64url segments>`: the
// scheme in that case, one space, at most 4 096 characters. Anything else is a 401 before
// any parsing (R2-14). Tokens are never read from a cookie or a query parameter, and never
// logged. Not done in Phase 0: role checks (Phase 2), the tenant-active check (OQ-12), and
// checking the user still exists (Phase 2).

const BEARER = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/;
const MAX_HEADER_LENGTH = 4096;

const NOT_AUTHENTICATED = "Authentication is required.";
const EXPIRED = "Your session has expired.";

/** Extracts the token, or undefined if the header is missing, too long, or not exactly `Bearer <jwt>`. */
function bearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (typeof header !== "string" || header.length > MAX_HEADER_LENGTH) return undefined;
  return BEARER.exec(header)?.[1];
}

function authenticator<Claims>(
  verify: (token: string) => Promise<Claims>,
  toContext: (claims: Claims) => { companyId: string; actor: Actor; userId: string },
): RequestHandler {
  return async (req, res, next) => {
    const token = bearerToken(req);
    if (token === undefined) {
      next(new UnauthenticatedError(NOT_AUTHENTICATED));
      return;
    }

    let claims: Claims;
    try {
      claims = await verify(token);
    } catch (error) {
      next(
        error instanceof TokenExpiredError
          ? new UnauthenticatedError(EXPIRED, { code: "TOKEN_EXPIRED" })
          : new UnauthenticatedError(NOT_AUTHENTICATED, { invalidToken: true }),
      );
      return;
    }

    // The claims have been through the Zod schema, so this cannot fail on shape; it still
    // goes through the factory, which is the only way to a genuine context.
    const log: LogContext = logContextOf(req) ?? {};
    let built: ReturnType<typeof toContext>;
    try {
      built = toContext(claims);
    } catch (error) {
      next(error);
      return;
    }
    const context = createExecutionContext({
      companyId: toCompanyId(built.companyId),
      actor: built.actor,
      ...(log.requestId === undefined ? {} : { requestId: log.requestId }),
    });

    // Request contexts die when the response finishes or closes (spec §4.1).
    const expire = () => expireContext(context);
    res.once("finish", expire);
    res.once("close", expire);
    // The client may have disconnected while the token was being verified: the response has
    // then already finished or closed, and those events will not fire again.
    if (res.writableFinished || res.destroyed) expire();

    setRequestContext(req, context);
    // companyId and userId join the request's log context, so every later line (the request
    // line included) carries them.
    log.companyId = context.companyId;
    log.userId = built.userId;
    runWithLogContext(log, () => next());
  };
}

/** PS-10: platform access tokens on `/api/v1`. */
export function createPlatformAuth(keys: Pick<AuthKeys, "platform">): RequestHandler {
  return authenticator<PlatformTokenClaims>(
    (token) => verifyPlatformToken(token, keys.platform),
    (claims) => ({
      companyId: claims.company_id,
      userId: claims.sub,
      actor: { kind: "user", userId: claims.sub, role: claims.role },
    }),
  );
}

/** PS-11: portal access tokens on `/portal/v1`. */
export function createPortalAuth(keys: Pick<AuthKeys, "portal">): RequestHandler {
  return authenticator<PortalTokenClaims>(
    (token) => verifyPortalToken(token, keys.portal),
    (claims) => ({
      companyId: claims.company_id,
      userId: claims.sub,
      actor: { kind: "portal_user", portalAccountId: claims.sub, clientId: claims.client_id, role: "client" },
    }),
  );
}
