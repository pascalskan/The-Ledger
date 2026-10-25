import { createSecretKey } from "node:crypto";
import { importPKCS8, importSPKI } from "jose";
import type { FullApiConfig } from "../config";
import type { JoseKey, JoseSigningKey, PlatformKeys } from "./jwt";

// Phase 0 spec PS-01 and §4.3. The loader (config/env.ts) has already checked that the
// PEM texts are a matching P-256 pair; this imports them with `jose` for signing and
// verification, once at start-up, in full mode only.

export interface AuthKeys {
  /** ES256 pair for platform access tokens. */
  readonly platform: PlatformKeys;
  /** HS256 secret (decoded PORTAL_JWT_SECRET) for portal access tokens. */
  readonly portal: JoseKey & JoseSigningKey;
}

export async function importAuthKeys(config: Pick<FullApiConfig, "jwt" | "portalSecret">): Promise<AuthKeys> {
  const [privateKey, publicKey] = await Promise.all([
    importPKCS8(config.jwt.privateKeyPem, "ES256"),
    importSPKI(config.jwt.publicKeyPem, "ES256"),
  ]);
  return Object.freeze({
    platform: Object.freeze({ privateKey, publicKey }),
    // createSecretKey(decoded): the secret is the decoded random bytes (spec §4.3)
    portal: createSecretKey(Buffer.from(config.portalSecret)) as JoseKey & JoseSigningKey,
  });
}
