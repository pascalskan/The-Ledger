import { generateKeyPairSync, randomBytes, randomUUID } from "node:crypto";
import { SignJWT, UnsecuredJWT } from "jose";
import { describe, expect, it } from "vitest";
import { loadApiConfig, type FullApiConfig } from "../config";
import { importAuthKeys, type AuthKeys } from "./keys";
import {
  signPlatformToken,
  signPortalToken,
  TokenExpiredError,
  TokenInvalidError,
  verifyPlatformToken,
  verifyPortalToken,
} from "./jwt";

// PS-09 and the verification rules of §4.3 (G0-32, G0-33 at unit level).

function pem() {
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  return {
    privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    publicKey: publicKey.export({ type: "spki", format: "pem" }).toString(),
  };
}

function config(keys = pem(), secret = randomBytes(48).toString("base64")): FullApiConfig {
  const loaded = loadApiConfig(
    {
      NODE_ENV: "development",
      LEDGER_APP_DATABASE_URL: "postgresql://ledger_app:pw@127.0.0.1:55432/ledger_test",
      JWT_PRIVATE_KEY: keys.privateKey,
      JWT_PUBLIC_KEY: keys.publicKey,
      PORTAL_JWT_SECRET: secret,
    },
    { appDir: process.cwd() + "/does-not-exist" },
  );
  if (loaded.mode !== "full") throw new Error("expected full mode");
  return loaded;
}

const keySet = pem();
const configA = config(keySet);
let auth: AuthKeys;
const authPromise = importAuthKeys(configA).then((k) => (auth = k));

const company = randomUUID();
const user = randomUUID();
const client = randomUUID();
const platformClaims = { sub: user, company_id: company, role: "pm" as const, email: "pm@example.test" };
const portalClaims = { sub: randomUUID(), company_id: company, client_id: client, role: "client" as const };
const now = () => Math.floor(Date.now() / 1000);

/** Hand-crafted platform-style token, so each rule can be broken on its own. */
async function craft(
  overrides: {
    payload?: Record<string, unknown>;
    iat?: number | null;
    exp?: number | null;
    iss?: string;
    aud?: string;
    alg?: "ES256" | "HS256";
    key?: Parameters<SignJWT["sign"]>[0];
    omit?: string[];
  } = {},
): Promise<string> {
  await authPromise;
  const payload: Record<string, unknown> = { company_id: company, role: "pm", email: "pm@example.test", ...overrides.payload };
  for (const key of overrides.omit ?? []) delete payload[key];
  const iat = overrides.iat === undefined ? now() : overrides.iat;
  const exp = overrides.exp === undefined ? now() + 600 : overrides.exp;
  if (iat !== null) payload.iat = iat;
  if (exp !== null) payload.exp = exp;
  const jwt = new SignJWT(payload)
    .setProtectedHeader({ alg: overrides.alg ?? "ES256" })
    .setSubject(user)
    .setIssuer(overrides.iss ?? "the-ledger")
    .setAudience(overrides.aud ?? "ledger-platform");
  return jwt.sign(overrides.key ?? (overrides.alg === "HS256" ? auth.portal : auth.platform.privateKey));
}

async function rejection(promise: Promise<unknown>): Promise<Error> {
  return promise.then(
    () => {
      throw new Error("expected the token to be refused");
    },
    (error: Error) => error,
  );
}

describe("the loader and jose agree on the keys", () => {
  it("jose imports exactly the keys the loader accepted, and a token signs and verifies", async () => {
    await authPromise;
    const token = await signPlatformToken(platformClaims, auth.platform);
    expect(await verifyPlatformToken(token, auth.platform)).toEqual(platformClaims);
    const portal = await signPortalToken(portalClaims, auth.portal);
    expect(await verifyPortalToken(portal, auth.portal)).toEqual(portalClaims);
  });

  it("the portal secret is the DECODED random bytes", async () => {
    await authPromise;
    const bytes = randomBytes(40);
    const decoded = await importAuthKeys(config(pem(), bytes.toString("base64url")));
    const secret = decoded.portal as unknown as { export(): Buffer };
    expect(secret.export().equals(bytes)).toBe(true);
  });
});

describe("signing", () => {
  it("sets iss, aud, iat and a 15-minute exp", async () => {
    await authPromise;
    const token = await signPlatformToken(platformClaims, auth.platform);
    const payload = JSON.parse(Buffer.from(token.split(".")[1]!, "base64url").toString()) as Record<string, unknown>;
    expect(payload).toMatchObject({ iss: "the-ledger", aud: "ledger-platform", sub: user, company_id: company, role: "pm" });
    expect((payload.exp as number) - (payload.iat as number)).toBe(900);
    expect(Math.abs((payload.iat as number) - now())).toBeLessThanOrEqual(2);
    const portal = JSON.parse(Buffer.from((await signPortalToken(portalClaims, auth.portal)).split(".")[1]!, "base64url").toString());
    expect(portal).toMatchObject({ iss: "the-ledger", aud: "ledger-portal", client_id: client, role: "client" });
    expect(portal).not.toHaveProperty("email");
  });

  it("refuses to sign claims the verifier would refuse", async () => {
    await authPromise;
    for (const bad of [
      { ...platformClaims, company_id: "not-a-uuid" },
      { ...platformClaims, role: "client" },
      { ...platformClaims, sub: "x" },
      { ...platformClaims, email: "" },
      { sub: user, role: "pm", email: "a@b.c" },
    ]) {
      await expect(signPlatformToken(bad as never, auth.platform)).rejects.toThrow();
    }
    await expect(signPortalToken({ ...portalClaims, role: "ceo" } as never, auth.portal)).rejects.toThrow();
    await expect(signPortalToken({ ...portalClaims, client_id: "x" }, auth.portal)).rejects.toThrow();
  });
});

describe("platform token verification (G0-32)", () => {
  it("accepts a well-formed token", async () => {
    await expect(verifyPlatformToken(await craft(), auth.platform)).resolves.toEqual(platformClaims);
  });

  it("(c) an expired token is TokenExpiredError, and only that case is distinguished", async () => {
    const expired = await craft({ iat: now() - 1000, exp: now() - 100 });
    expect(await rejection(verifyPlatformToken(expired, auth.platform))).toBeInstanceOf(TokenExpiredError);
  });

  it("(d) a changed signature byte", async () => {
    const token = await craft();
    const [h, p, s] = token.split(".");
    const bytes = Buffer.from(s!, "base64url");
    bytes[bytes.length - 1] = bytes[bytes.length - 1]! ^ 0xff;
    expect(await rejection(verifyPlatformToken(`${h}.${p}.${bytes.toString("base64url")}`, auth.platform))).toBeInstanceOf(TokenInvalidError);
  });

  it("(e) alg none", async () => {
    const token = new UnsecuredJWT({ company_id: company, role: "pm", email: "x@y.z" })
      .setSubject(user)
      .setIssuer("the-ledger")
      .setAudience("ledger-platform")
      .setIssuedAt()
      .setExpirationTime("10m")
      .encode();
    expect(await rejection(verifyPlatformToken(token, auth.platform))).toBeInstanceOf(TokenInvalidError);
  });

  it("(f) algorithm confusion: an HS256 token with platform claims, signed with the portal secret", async () => {
    const token = await craft({ alg: "HS256", key: auth.portal });
    expect(await rejection(verifyPlatformToken(token, auth.platform))).toBeInstanceOf(TokenInvalidError);
    // ... and signed with the PUBLIC key text as an HMAC secret
    const hmacWithPublic = await craft({ alg: "HS256", key: Buffer.from(keySet.publicKey) as never });
    expect(await rejection(verifyPlatformToken(hmacWithPublic, auth.platform))).toBeInstanceOf(TokenInvalidError);
  });

  it("(g) an ES256 token signed by a different key pair", async () => {
    const other = await importAuthKeys(config());
    const token = await craft({ key: other.platform.privateKey });
    expect(await rejection(verifyPlatformToken(token, auth.platform))).toBeInstanceOf(TokenInvalidError);
  });

  it.each([
    ["(h) the wrong aud", { aud: "ledger-portal" }],
    ["(i) the wrong iss", { iss: "someone-else" }],
    ["(j) no company_id", { omit: ["company_id"] }],
    ["(k) company_id not a UUID", { payload: { company_id: "not-a-uuid" } }],
    ["(l) role client in a platform token", { payload: { role: "client" } }],
    ["an unknown role", { payload: { role: "admin" } }],
    ["no email", { omit: ["email"] }],
    ["(n) no exp", { exp: null }],
    ["no iat", { iat: null }],
    ["(o) exp 24 hours after iat", { exp: now() + 86400 }],
    ["exp exactly 901 seconds after iat", { iat: now(), exp: now() + 901 }],
    ["(p) iat 10 minutes in the future", { iat: now() + 600, exp: now() + 1200 }],
    ["(q) a non-integer iat", { iat: now() + 0.5 - 10 }],
    ["a non-integer exp", { exp: now() + 599.5 }],
  ] as const)("%s is TokenInvalidError", async (_label, overrides) => {
    const token = await craft(overrides as never);
    const error = await rejection(verifyPlatformToken(token, auth.platform));
    expect(error).toBeInstanceOf(TokenInvalidError);
    expect(error).not.toBeInstanceOf(TokenExpiredError);
  });

  it("accepts exp exactly 900 seconds after iat, and tolerates extra claims", async () => {
    await expect(verifyPlatformToken(await craft({ iat: now() - 5, exp: now() - 5 + 900 }), auth.platform)).resolves.toBeDefined();
    const claims = await verifyPlatformToken(await craft({ payload: { sid: "abc" } }), auth.platform);
    expect(claims).not.toHaveProperty("sid");
  });

  it("garbage and malformed tokens are TokenInvalidError", async () => {
    for (const bad of ["", "x", "a.b", "a.b.c", "a.b.c.d", "eyJ.eyJ.sig"]) {
      expect(await rejection(verifyPlatformToken(bad, auth.platform))).toBeInstanceOf(TokenInvalidError);
    }
  });

  it("an invalid token's error does not say which check failed", async () => {
    const errors = await Promise.all([
      rejection(verifyPlatformToken(await craft({ iss: "x" }), auth.platform)),
      rejection(verifyPlatformToken(await craft({ aud: "x" }), auth.platform)),
      rejection(verifyPlatformToken(await craft({ omit: ["company_id"] }), auth.platform)),
    ]);
    expect(new Set(errors.map((e) => e.message)).size).toBe(1);
  });
});

describe("portal token verification and token types (G0-33)", () => {
  it("a platform token is refused by the portal verifier, and a portal token by the platform verifier", async () => {
    await authPromise;
    const platform = await signPlatformToken(platformClaims, auth.platform);
    const portal = await signPortalToken(portalClaims, auth.portal);
    expect(await rejection(verifyPortalToken(platform, auth.portal))).toBeInstanceOf(TokenInvalidError);
    expect(await rejection(verifyPlatformToken(portal, auth.platform))).toBeInstanceOf(TokenInvalidError);
  });

  it("applies the same lifetime and claim rules to portal tokens", async () => {
    await authPromise;
    const sign = (claims: Record<string, unknown>, iat: number, exp: number | null, aud = "ledger-portal") => {
      const payload: Record<string, unknown> = { ...claims, iat };
      if (exp !== null) payload.exp = exp;
      return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuer("the-ledger").setAudience(aud).setSubject(portalClaims.sub).sign(auth.portal);
    };
    const claims = { company_id: company, client_id: client, role: "client" };
    await expect(verifyPortalToken(await sign(claims, now(), now() + 600), auth.portal)).resolves.toMatchObject({ role: "client" });
    expect(await rejection(verifyPortalToken(await sign(claims, now() - 1000, now() - 100), auth.portal))).toBeInstanceOf(TokenExpiredError);
    for (const bad of [
      await sign(claims, now(), null),
      await sign(claims, now(), now() + 86400),
      await sign(claims, now() + 600, now() + 1200),
      await sign({ ...claims, client_id: undefined }, now(), now() + 600),
      await sign({ ...claims, role: "ceo" }, now(), now() + 600),
      await sign(claims, now(), now() + 600, "ledger-platform"),
    ]) {
      expect(await rejection(verifyPortalToken(bad, auth.portal))).toBeInstanceOf(TokenInvalidError);
    }
  });

  it("a portal token signed with a different secret", async () => {
    await authPromise;
    const other = await importAuthKeys(config(keySet));
    const token = await signPortalToken(portalClaims, other.portal);
    expect(await rejection(verifyPortalToken(token, auth.portal))).toBeInstanceOf(TokenInvalidError);
  });
});
