import { generateKeyPairSync, randomBytes } from "node:crypto";
import net from "node:net";
import os from "node:os";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createApiApp,
  createLogger,
  createRuntimePool,
  createTestPools,
  loadApiConfig,
  testDatabase,
  type TestPools,
} from "../testing";
import { importAuthKeys } from "../auth/keys";
import type { PoolSettings } from "../config";
import { createHealthHandler } from "./health";

// GET /health against the real test database (PS-08, G0-38, G0-46 a).

let pools: TestPools;
beforeAll(() => {
  pools = createTestPools();
});
afterAll(async () => {
  await pools.end();
});

function capture() {
  const lines: string[] = [];
  const logger = createLogger({ service: "api", level: "debug", destination: { write: (c: string) => void lines.push(c) } });
  return { lines, logger };
}

async function appFor(settings: PoolSettings, expectedRole = "ledger_app") {
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const config = loadApiConfig(
    {
      NODE_ENV: "development",
      LEDGER_APP_DATABASE_URL: `postgresql://${settings.user}:${encodeURIComponent(settings.password)}@${settings.host}:${settings.port}/${settings.database}`,
      JWT_PRIVATE_KEY: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
      JWT_PUBLIC_KEY: publicKey.export({ type: "spki", format: "pem" }).toString(),
      PORTAL_JWT_SECRET: randomBytes(48).toString("base64"),
    },
    { appDir: os.tmpdir() },
  );
  if (config.mode !== "full") throw new Error("expected full mode");
  const { lines, logger } = capture();
  const db = createRuntimePool({ settings: config.database, logger, expectedRole, max: 2 });
  const app = createApiApp({ config, logger, db, auth: await importAuthKeys(config) });
  return { app, db, lines };
}

describe("GET /health in full mode", () => {
  it("200 {status: ok, mode: full} with a reachable, migrated test database", async () => {
    const { app, db } = await appFor(testDatabase().app);
    try {
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: "ok", mode: "full" });
      expect(res.headers["cache-control"]).toBe("no-store");
    } finally {
      await db.end();
    }
  });

  it("503 within 3 seconds when the database is unreachable (a closed local port)", async () => {
    const server = net.createServer();
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as net.AddressInfo;
    await new Promise<void>((resolve) => server.close(() => resolve()));
    const { app, db, lines } = await appFor({ ...testDatabase().app, host: "127.0.0.1", port });
    try {
      const started = Date.now();
      const res = await request(app).get("/health");
      expect(Date.now() - started).toBeLessThan(3000);
      expect(res.status).toBe(503);
      expect(res.body).toEqual({ status: "unavailable", mode: "full" });
      const warning = lines.map((l) => JSON.parse(l)).find((l) => l.message === "Health check failed");
      expect(warning).toBeDefined();
      expect(lines.join("\n")).not.toContain(testDatabase().app.password);
    } finally {
      await db.end();
    }
  });

  it("503 when the pool's connection is refused by the role self-check (the owner's URL), and the log names the condition", async () => {
    const { app, db, lines } = await appFor(testDatabase().migration);
    try {
      const res = await request(app).get("/health");
      expect(res.status).toBe(503);
      expect(res.body).toEqual({ status: "unavailable", mode: "full" });
      const refusal = lines.map((l) => JSON.parse(l)).find((l) => l.message.includes("runtime role self-check"));
      expect(refusal).toMatchObject({ level: "ERROR", condition: "unexpected role" });
      expect(lines.join("\n")).not.toContain(testDatabase().migration.password);
    } finally {
      await db.end();
    }
  });

  it("50 concurrent requests cause exactly one connection checkout", async () => {
    const { db } = await appFor(testDatabase().app);
    let checkouts = 0;
    const counting = {
      ...db,
      withClient: ((fn: never) => {
        checkouts++;
        return db.withClient(fn);
      }) as typeof db.withClient,
    };
    try {
      const handler = createHealthHandler({ mode: "full" } as never, capture().logger, counting);
      const statuses = await Promise.all(
        Array.from({ length: 50 }, async () => {
          let status = 0;
          const res = { status: (code: number) => ((status = code), { json: () => undefined }) };
          await handler({} as never, res as never, () => undefined);
          return status;
        }),
      );
      expect(statuses.every((status) => status === 200)).toBe(true);
      expect(checkouts).toBe(1);
    } finally {
      await db.end();
    }
  });
});
