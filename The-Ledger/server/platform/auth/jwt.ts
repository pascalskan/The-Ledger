import { errors, jwtVerify, SignJWT } from "jose";
import { z } from "zod";

// PS-09, Phase 0 spec §4.3: JWT utilities. No I/O, no transaction, nothing logged. Tokens
// are never logged.
//
// Platform access token: ES256 (P-256), aud "ledger-platform". Portal access token:
// HS256 with PORTAL_JWT_SECRET, aud "ledger-portal". Both: iss "the-ledger", 15 minutes.
// The two types use different algorithms, keys and audiences, so neither is ever accepted
// in the other's place.

export const TOKEN_ISSUER = "the-ledger";
export const PLATFORM_AUDIENCE = "ledger-platform";
export const PORTAL_AUDIENCE = "ledger-portal";
export const TOKEN_LIFETIME_SECONDS = 900;

/** A key `jose` accepts: a CryptoKey, a Node KeyObject, or raw bytes. */
export type JoseKey = Parameters<typeof jwtVerify>[1];
export type JoseSigningKey = Parameters<SignJWT["sign"]>[0];

export interface PlatformKeys {
  readonly privateKey: JoseSigningKey;
  readonly publicKey: JoseKey;
}

/** The token expired. The only failure the verifier distinguishes. */
export class TokenExpiredError extends Error {
  constructor() {
    super("The token has expired");
    this.name = "TokenExpiredError";
  }
}

/** Every other failure: signature, algorithm, issuer, audience, claim shape, malformed token. It never says which. */
export class TokenInvalidError extends Error {
  constructor() {
    super("The token is not valid");
    this.name = "TokenInvalidError";
  }
}

// zod's own uuid check is kept here: the claims are parsed by zod object schemas, and it accepts the same
// eight-four-four-four-twelve form as the platform's isUuid (context/uuid.ts).
const uuid = z.string().uuid();

// iat and exp are integers with 0 < exp - iat <= 900: a token minted by anything with a
// longer lifetime is refused even before it expires.
const timing = z.object({
  iat: z.number().int(),
  exp: z.number().int(),
});

const platformClaimsSchema = z
  .object({
    sub: uuid,
    company_id: uuid,
    role: z.enum(["ceo", "pm", "worker"]),
    email: z.string().min(1).max(320),
  });

const portalClaimsSchema = z
  .object({
    sub: uuid,
    company_id: uuid,
    client_id: uuid,
    role: z.literal("client"),
  });

export type PlatformTokenClaims = z.infer<typeof platformClaimsSchema>;
export type PortalTokenClaims = z.infer<typeof portalClaimsSchema>;

const registered = z.object({
  iss: z.literal(TOKEN_ISSUER),
  aud: z.string(),
});

function checkTiming(payload: Record<string, unknown>): void {
  const parsed = timing.safeParse(payload);
  if (!parsed.success) throw new TokenInvalidError();
  const { iat, exp } = parsed.data;
  const lifetime = exp - iat;
  if (lifetime <= 0 || lifetime > TOKEN_LIFETIME_SECONDS) throw new TokenInvalidError();
  // A token issued in the future is refused explicitly, with no clock tolerance (R2-14).
  if (iat > Math.floor(Date.now() / 1000)) throw new TokenInvalidError();
}

async function verifyToken<T>(
  token: string,
  key: JoseKey,
  options: { algorithm: "ES256" | "HS256"; audience: string },
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
): Promise<T> {
  let payload: Record<string, unknown>;
  try {
    const result = await jwtVerify(token, key, {
      issuer: TOKEN_ISSUER,
      audience: options.audience,
      algorithms: [options.algorithm],
      requiredClaims: ["iss", "aud", "sub", "iat", "exp"],
      maxTokenAge: "15m",
      clockTolerance: 0,
    });
    payload = result.payload as Record<string, unknown>;
  } catch (error) {
    // Only a token whose `exp` has passed is "expired", which the frontend answers by refreshing.
    // jose also reports a token older than maxTokenAge as JWTExpired (claim "iat"): that one is
    // a token this platform never signs (lifetime over 15 minutes), so it is simply invalid.
    if (error instanceof errors.JWTExpired && error.claim === "exp") throw new TokenExpiredError();
    throw new TokenInvalidError();
  }
  checkTiming(payload);
  if (!registered.safeParse(payload).success) throw new TokenInvalidError();
  // Only the typed claims leave this function; nothing downstream reads the raw payload.
  const { iss: _iss, aud: _aud, iat: _iat, exp: _exp, ...claims } = payload;
  const parsed = schema.safeParse(claims);
  if (!parsed.success) throw new TokenInvalidError();
  return parsed.data;
}

/** Verifies a platform access token (ES256). Throws TokenExpiredError or TokenInvalidError. */
export function verifyPlatformToken(token: string, keys: Pick<PlatformKeys, "publicKey">): Promise<PlatformTokenClaims> {
  return verifyToken(token, keys.publicKey, { algorithm: "ES256", audience: PLATFORM_AUDIENCE }, platformClaimsSchema);
}

/** Verifies a portal access token (HS256). Throws TokenExpiredError or TokenInvalidError. */
export function verifyPortalToken(token: string, secret: JoseKey): Promise<PortalTokenClaims> {
  return verifyToken(token, secret, { algorithm: "HS256", audience: PORTAL_AUDIENCE }, portalClaimsSchema);
}

/**
 * Signs a platform access token. The claims are validated with the same schema the verifier
 * uses, so the platform can never sign a token it would then refuse. `iss`, `aud`, `iat` and
 * `exp` are set here, with a 15-minute lifetime. First called by Phase 2 (login).
 */
export async function signPlatformToken(
  claims: PlatformTokenClaims,
  keys: Pick<PlatformKeys, "privateKey">,
): Promise<string> {
  const valid = platformClaimsSchema.parse(claims);
  return new SignJWT({ company_id: valid.company_id, role: valid.role, email: valid.email })
    .setProtectedHeader({ alg: "ES256" })
    .setSubject(valid.sub)
    .setIssuer(TOKEN_ISSUER)
    .setAudience(PLATFORM_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_LIFETIME_SECONDS}s`)
    .sign(keys.privateKey);
}

/** Signs a portal access token. First called by Phase 6a (portal login). */
export async function signPortalToken(claims: PortalTokenClaims, secret: JoseSigningKey): Promise<string> {
  const valid = portalClaimsSchema.parse(claims);
  return new SignJWT({ company_id: valid.company_id, client_id: valid.client_id, role: valid.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(valid.sub)
    .setIssuer(TOKEN_ISSUER)
    .setAudience(PORTAL_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_LIFETIME_SECONDS}s`)
    .sign(secret);
}
