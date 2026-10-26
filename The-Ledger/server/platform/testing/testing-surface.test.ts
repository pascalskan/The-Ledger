import { generateKeyPairSync, randomBytes, randomUUID } from "node:crypto";
import os from "node:os";
import request from "supertest";
import { describe, expect, it } from "vitest";
import {
  createApiApp,
  createLogger,
  importAuthKeys,
  loadApiConfig,
  signPlatformToken,
  signPortalToken,
  verifyPlatformToken,
  type DbPool,
} from "./index";

// The test engineer builds full-mode apps from this surface alone (spec §9.1): the loader,
// the key import, token signing, createApiApp and the logger.
describe("the testing surface builds a full-mode app by itself", () => {
  it("loads a config, imports the keys, signs tokens and serves /health and an authenticated 404", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
    const config = loadApiConfig(
      {
        NODE_ENV: "development",
        LEDGER_APP_DATABASE_URL: "postgresql://ledger_app:pw@127.0.0.1:55432/ledger_test",
        JWT_PRIVATE_KEY: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
        JWT_PUBLIC_KEY: publicKey.export({ type: "spki", format: "pem" }).toString(),
        PORTAL_JWT_SECRET: randomBytes(48).toString("base64"),
      },
      { appDir: os.tmpdir() },
    );
    if (config.mode !== "full") throw new Error("expected full mode");
    const auth = await importAuthKeys(config);
    const db: DbPool = { role: "ledger_app", withClient: async () => ({}) as never, end: async () => undefined };
    const app = createApiApp({ config, logger: createLogger({ service: "api", level: "fatal" }), db, auth });

    const claims = { sub: randomUUID(), company_id: randomUUID(), role: "ceo" as const, email: "ceo@example.test" };
    const token = await signPlatformToken(claims, auth.platform);
    expect(await verifyPlatformToken(token, auth.platform)).toEqual(claims);
    const portal = await signPortalToken(
      { sub: randomUUID(), company_id: claims.company_id, client_id: randomUUID(), role: "client" },
      auth.portal,
    );

    expect((await request(app).get("/health")).body).toEqual({ status: "ok", mode: "full" });
    expect((await request(app).get("/api/v1/nothing").set("Authorization", `Bearer ${token}`)).status).toBe(404);
    expect((await request(app).get("/api/v1/nothing")).status).toBe(401);
    expect((await request(app).get("/api/v1/nothing").set("Authorization", `Bearer ${portal}`)).status).toBe(401);
  });
});
