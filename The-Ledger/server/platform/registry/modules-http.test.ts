import { generateKeyPairSync, randomBytes, randomUUID } from "node:crypto";
import os from "node:os";
import { setTimeout as sleep } from "node:timers/promises";
import { Router } from "express";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { importAuthKeys, type AuthKeys } from "../auth/keys";
import { signPlatformToken, signPortalToken } from "../auth/jwt";
import { loadApiConfig, type FullApiConfig } from "../config";
import type { DbPool } from "../db/client";
import { createApiApp } from "../http/app";
import { createLogger } from "../logging/logger";
import type { ModuleRegistration } from "./types";

// Namespaces, public routes, contextOf and the route template through nested routers
// (spec 4.8, G0-48, the trackRoute case of PS-06).

const company = randomUUID();
const user = randomUUID();
let config: FullApiConfig;
let auth: AuthKeys;

beforeAll(async () => {
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const loaded = loadApiConfig(
    {
      NODE_ENV: "development",
      LEDGER_APP_DATABASE_URL: "postgresql://ledger_app:pw@127.0.0.1:55432/ledger_test",
      JWT_PRIVATE_KEY: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
      JWT_PUBLIC_KEY: publicKey.export({ type: "spki", format: "pem" }).toString(),
      PORTAL_JWT_SECRET: randomBytes(48).toString("base64"),
    },
    { appDir: os.tmpdir() },
  );
  if (loaded.mode !== "full") throw new Error("expected full mode");
  config = loaded;
  auth = await importAuthKeys(config);
});

const db: DbPool = { role: "ledger_app", withClient: async () => ({}) as never, end: async () => undefined };
const token = () => signPlatformToken({ sub: user, company_id: company, role: "pm", email: "pm@example.test" }, auth.platform);
const portalToken = () =>
  signPortalToken({ sub: randomUUID(), company_id: company, client_id: randomUUID(), role: "client" }, auth.portal);

const alpha: ModuleRegistration = {
  name: "alpha",
  apiRouters: {
    "/__alpha": (deps) => {
      const router = Router();
      // router-level middleware: must never run on another module's paths
      router.use((_req, res, next) => {
        res.setHeader("X-Alpha", "1");
        next();
      });
      router.get("/items/:id", (req, res) => void res.json({ company: deps.contextOf(req).companyId }));
      router.get("/slow", async (req, res) => {
        await sleep(0);
        // contextOf does not depend on AsyncLocalStorage (spec 4.8)
        res.json({ company: deps.contextOf(req).companyId });
      });
      router.get("/boom/:id", (_req, _res, next) => next(new Error("alpha failed")));
      const nested = Router();
      nested.get("/things/:thingId", (req, res) => void res.json({ thing: req.params.thingId }));
      nested.get("/broken/:thingId", (_req, _res, next) => next(new Error("nested failed")));
      router.use("/sub", nested);
      return router;
    },
  },
  portalRouters: {
    "/__alpha": (deps) => {
      const router = Router();
      router.get("/mine/:id", (req, res) => void res.json({ actor: deps.contextOf(req).actor.kind }));
      return router;
    },
  },
  publicRoutes: [
    { surface: "api", method: "POST", path: "/__alpha/login", handler: () => (_req, res) => void res.json({ public: true }) },
    {
      surface: "api",
      method: "GET",
      path: "/__alpha/whoami",
      handler: (deps) => (req, res) => void res.json({ company: deps.contextOf(req).companyId }),
    },
  ],
};
const beta: ModuleRegistration = {
  name: "beta",
  apiRouters: {
    "/__beta": () => {
      const router = Router();
      router.get("/x", (_req, res) => void res.json({ beta: true }));
      return router;
    },
  },
};

function build(modules: readonly ModuleRegistration[]) {
  const lines: string[] = [];
  const logger = createLogger({ service: "api", level: "debug", destination: { write: (c: string) => void lines.push(c) } });
  const app = createApiApp({ config, logger, db, auth, modules });
  const records = () => lines.map((l) => JSON.parse(l) as Record<string, any>);
  return { app, lines, records };
}

describe("module routers (G0-48)", () => {
  it("(a) a module's router-level middleware never runs on another module's paths", async () => {
    const { app } = build([alpha, beta]);
    const bearer = `Bearer ${await token()}`;
    const onBeta = await request(app).get("/api/v1/__beta/x").set("Authorization", bearer);
    expect(onBeta.status).toBe(200);
    expect(onBeta.headers).not.toHaveProperty("x-alpha");
    const onAlpha = await request(app).get("/api/v1/__alpha/items/1").set("Authorization", bearer);
    expect(onAlpha.status).toBe(200);
    expect(onAlpha.headers["x-alpha"]).toBe("1");
    const unmatched = await request(app).get("/api/v1/__zeta/x").set("Authorization", bearer);
    expect(unmatched.status).toBe(404);
    expect(unmatched.headers).not.toHaveProperty("x-alpha");
  });

  it("module routers are behind token auth, and read the context only through contextOf", async () => {
    const { app } = build([alpha]);
    expect((await request(app).get("/api/v1/__alpha/items/1")).status).toBe(401);
    const res = await request(app).get("/api/v1/__alpha/items/1").set("Authorization", `Bearer ${await token()}`);
    expect(res.body).toEqual({ company });
  });

  it("(e) contextOf still works after an await outside AsyncLocalStorage's scope", async () => {
    const { app } = build([alpha]);
    const res = await request(app).get("/api/v1/__alpha/slow").set("Authorization", `Bearer ${await token()}`);
    expect(res.body).toEqual({ company });
  });

  it("a portal router is behind the portal token, and a platform token does not open it", async () => {
    const { app } = build([alpha]);
    const ok = await request(app).get("/portal/v1/__alpha/mine/1").set("Authorization", `Bearer ${await portalToken()}`);
    expect(ok.body).toEqual({ actor: "portal_user" });
    const swapped = await request(app).get("/portal/v1/__alpha/mine/1").set("Authorization", `Bearer ${await token()}`);
    expect(swapped.status).toBe(401);
  });
});

describe("public routes (G0-48 b to d)", () => {
  it("(b) a declared public route is reachable without a token", async () => {
    const { app } = build([alpha]);
    const res = await request(app).post("/api/v1/__alpha/login").send({});
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ public: true });
  });

  it("(c) only the declared method and path are public", async () => {
    const { app } = build([alpha]);
    expect((await request(app).get("/api/v1/__alpha/login")).status).toBe(401);
    expect((await request(app).post("/api/v1/__alpha/login/extra")).status).toBe(401);
    expect((await request(app).put("/api/v1/__alpha/login")).status).toBe(401);
  });

  it("(d) a public handler calling contextOf is a 500 INTERNAL_ERROR, with MissingRequestContextError in the log", async () => {
    const { app, records } = build([alpha]);
    const res = await request(app).get("/api/v1/__alpha/whoami");
    expect(res.status).toBe(500);
    expect(res.body.error).toMatchObject({ code: "INTERNAL_ERROR", message: "An unexpected error occurred." });
    const failure = records().find((r) => r.message === "Request failed");
    expect(failure!.err).toMatchObject({ name: "MissingRequestContextError" });
  });

  it("a public route is parsed with the JSON parser but its parse failure is still the 400 envelope", async () => {
    const { app } = build([alpha]);
    const res = await request(app).post("/api/v1/__alpha/login").set("Content-Type", "application/json").send("{bad");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("MALFORMED_JSON");
  });
});

describe("the route template through nested routers (PS-06, trackRoute)", () => {
  it("a route in a module router mounted at its namespace", async () => {
    const { app, records } = build([alpha]);
    await request(app).get("/api/v1/__alpha/items/MARKER-123").set("Authorization", `Bearer ${await token()}`);
    expect(records().find((r) => r.message === "request")!.route).toBe("/api/v1/__alpha/items/:id");
  });

  it("a route in a router nested inside the module's router", async () => {
    const { app, records } = build([alpha]);
    const res = await request(app).get("/api/v1/__alpha/sub/things/MARKER-456").set("Authorization", `Bearer ${await token()}`);
    expect(res.body).toEqual({ thing: "MARKER-456" });
    const line = records().find((r) => r.message === "request")!;
    expect(line.route).toBe("/api/v1/__alpha/sub/things/:thingId");
    expect(JSON.stringify(records())).not.toContain("MARKER-456");
  });

  it("on the error path, after the error has unwound the nested routers", async () => {
    const { app, records } = build([alpha]);
    const bearer = `Bearer ${await token()}`;
    await request(app).get("/api/v1/__alpha/boom/MARKER-789").set("Authorization", bearer);
    await request(app).get("/api/v1/__alpha/sub/broken/MARKER-789").set("Authorization", bearer);
    const all = records();
    const failures = all.filter((r) => r.message === "Request failed").map((r) => r.route);
    const requests = all.filter((r) => r.message === "request").map((r) => r.route);
    expect(failures).toEqual(["/api/v1/__alpha/boom/:id", "/api/v1/__alpha/sub/broken/:thingId"]);
    expect(requests).toEqual(failures);
    expect(JSON.stringify(all)).not.toContain("MARKER-789");
  });

  it("a public route has its own template, and an unmatched path in a namespace is <unmatched>", async () => {
    const { app, records } = build([alpha]);
    await request(app).post("/api/v1/__alpha/login").send({});
    await request(app).get("/api/v1/__alpha/nothing/here").set("Authorization", `Bearer ${await token()}`);
    const routes = records().filter((r) => r.message === "request").map((r) => r.route);
    expect(routes).toEqual(["/api/v1/__alpha/login", "<unmatched>"]);
  });
});

describe("startup", () => {
  it("createApiApp surfaces registry errors, before anything is mounted", () => {
    const logger = createLogger({ service: "api", level: "fatal" });
    expect(() =>
      createApiApp({ config, logger, db, auth, modules: [alpha, { name: "gamma", apiRouters: { "/__alpha": () => Router() } }] }),
    ).toThrow(/claimed by both/);
  });

  it("accepts prebuilt registries (the entry point's route)", async () => {
    const { buildRegistries } = await import("./build-registries");
    const logger = createLogger({ service: "api", level: "fatal" });
    const registries = buildRegistries({ modules: [beta], process: "api", pool: db, logger, nodeEnv: "test" });
    const app = createApiApp({ config, logger, db, auth, registries });
    const res = await request(app).get("/api/v1/__beta/x").set("Authorization", `Bearer ${await token()}`);
    expect(res.body).toEqual({ beta: true });
  });
});
