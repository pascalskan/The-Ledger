import { generateKeyPairSync, randomBytes, randomUUID } from "node:crypto";
import os from "node:os";
import express, { Router, type Express } from "express";
import request from "supertest";
import { SignJWT } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { loadApiConfig, type FullApiConfig } from "../config";
import { contextOf } from "../context/request-store";
import { isContextExpired, type ExecutionContext } from "../context/execution-context";
import { createErrorHandler } from "../errors/error-handler";
import { createApiApp } from "../http/app";
import { notFoundHandler } from "../http/not-found";
import { requestId } from "../http/request-id";
import { requestLogger } from "../http/request-logger";
import { securityHeaders } from "../http/security-headers";
import { createLogger } from "../logging/logger";
import { importAuthKeys, type AuthKeys } from "./keys";
import { signPlatformToken, signPortalToken } from "./jwt";
import { createPlatformAuth, createPortalAuth } from "./tenant-context";

// PS-10 and PS-11 (G0-31 to G0-35 at unit level).

const MARK = "MARKER-3e8b70";
const company = randomUUID();
const user = randomUUID();
const portalAccount = randomUUID();
const client = randomUUID();

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

const platformToken = (role: "ceo" | "pm" | "worker" = "pm") =>
  signPlatformToken({ sub: user, company_id: company, role, email: "pm@example.test" }, auth.platform);
const portalToken = () =>
  signPortalToken({ sub: portalAccount, company_id: company, client_id: client, role: "client" }, auth.portal);

function capture() {
  const lines: string[] = [];
  return {
    lines,
    destination: { write: (chunk: string) => void lines.push(chunk) },
    records: () => lines.map((line) => JSON.parse(line) as Record<string, any>),
  };
}

/** The platform and portal pipelines with a probe route that returns what `contextOf(req)` gives. */
function build() {
  const out = capture();
  const logger = createLogger({ service: "api", level: "debug", destination: out.destination });
  const captured: { context?: ExecutionContext; handlerRuns: number } = { handlerRuns: 0 };
  const app: Express = express();
  app.use(requestId);
  app.use(requestLogger(logger));

  const probe = (surface: "api" | "portal") => {
    const router = Router();
    router.get("/__probe", (req, res) => {
      captured.handlerRuns++;
      const context = contextOf(req);
      captured.context = context;
      res.json({ surface, context });
    });
    router.get("/__probe/late", (req, res) => {
      // Used after the response: the context must be dead.
      captured.context = contextOf(req);
      res.json({ ok: true });
    });
    return router;
  };
  const errorHandler = createErrorHandler(logger);
  app.use("/api/v1", securityHeaders, express.json(), createPlatformAuth(auth), probe("api"), notFoundHandler, errorHandler);
  app.use("/portal/v1", securityHeaders, express.json(), createPortalAuth(auth), probe("portal"), notFoundHandler, errorHandler);
  return { app, out, captured };
}

const bearer = (token: string) => `Bearer ${token}`;

describe("platform-token middleware (PS-10)", () => {
  it("(G0-31) builds a genuine context from the token and serves it through contextOf", async () => {
    const { app, captured } = build();
    const res = await request(app).get("/api/v1/__probe").set("Authorization", bearer(await platformToken("pm")));
    expect(res.status).toBe(200);
    expect(res.body.context).toEqual({
      companyId: company,
      actor: { kind: "user", userId: user, role: "pm" },
      causation: null,
      requestId: res.headers["x-request-id"],
    });
    expect(Object.isFrozen(captured.context)).toBe(true);
  });

  it("the context dies when the response finishes", async () => {
    const { app, captured } = build();
    await request(app).get("/api/v1/__probe/late").set("Authorization", bearer(await platformToken()));
    expect(captured.context).toBeDefined();
    expect(isContextExpired(captured.context!)).toBe(true);
  });

  it("adds companyId and userId to the request line and to later log lines", async () => {
    const { app, out } = build();
    await request(app).get("/api/v1/__probe").set("Authorization", bearer(await platformToken()));
    const line = out.records().find((r) => r.message === "request")!;
    expect(line).toMatchObject({ companyId: company, userId: user, statusCode: 200, route: "/api/v1/__probe" });
  });

  it("never logs the token", async () => {
    const { app, out } = build();
    const token = await platformToken();
    await request(app).get("/api/v1/__probe").set("Authorization", bearer(token));
    await request(app).get("/api/v1/__probe").set("Authorization", bearer(`${token}x`));
    expect(out.lines.join("\n")).not.toContain(token.split(".")[1]);
    expect(out.lines.join("\n")).not.toContain(token.split(".")[2]);
  });

  describe("401 cases (G0-32), the handler never runs", () => {
    async function expectUnauthenticated(
      authorization: string | undefined,
      expected: { code: string; challenge: string; message: string } = {
        code: "UNAUTHENTICATED",
        challenge: 'Bearer error="invalid_token"',
        message: "Authentication is required.",
      },
      path = "/api/v1/__probe",
    ) {
      const { app, captured } = build();
      const req = request(app).get(path);
      const res = await (authorization === undefined ? req : req.set("Authorization", authorization));
      expect(res.status).toBe(401);
      expect(res.body.error).toMatchObject({ code: expected.code, message: expected.message, details: {} });
      expect(res.body.error.requestId).toBe(res.headers["x-request-id"]);
      expect(res.headers["www-authenticate"]).toBe(expected.challenge);
      expect(captured.handlerRuns).toBe(0);
    }

    it("(a) no Authorization header: plain Bearer challenge", async () => {
      await expectUnauthenticated(undefined, { code: "UNAUTHENTICATED", challenge: "Bearer", message: "Authentication is required." });
    });

    it("(b) a Basic scheme", async () => {
      await expectUnauthenticated("Basic dXNlcjpwYXNz", { code: "UNAUTHENTICATED", challenge: "Bearer", message: "Authentication is required." });
    });

    it("(c) an expired token is 401 TOKEN_EXPIRED", async () => {
      const now = Math.floor(Date.now() / 1000);
      const expired = await new SignJWT({ company_id: company, role: "pm", email: "a@b.c", iat: now - 1000, exp: now - 100 })
        .setProtectedHeader({ alg: "ES256" })
        .setSubject(user)
        .setIssuer("the-ledger")
        .setAudience("ledger-platform")
        .sign(auth.platform.privateKey);
      await expectUnauthenticated(bearer(expired), { code: "TOKEN_EXPIRED", challenge: 'Bearer error="invalid_token"', message: "Your session has expired." });
    });

    it("(d) one signature byte changed", async () => {
      const [h, p, s] = (await platformToken()).split(".");
      const bytes = Buffer.from(s!, "base64url");
      bytes[0] = bytes[0]! ^ 0xff;
      await expectUnauthenticated(bearer(`${h}.${p}.${bytes.toString("base64url")}`));
    });

    it("(f) an HS256 token with platform claims signed with the portal secret", async () => {
      const now = Math.floor(Date.now() / 1000);
      const token = await new SignJWT({ company_id: company, role: "pm", email: "a@b.c", iat: now, exp: now + 600 })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(user)
        .setIssuer("the-ledger")
        .setAudience("ledger-platform")
        .sign(auth.portal);
      await expectUnauthenticated(bearer(token));
    });

    it("(m) a valid token in the query string only, or only in a cookie", async () => {
      const { app, captured } = build();
      const token = await platformToken();
      const query = await request(app).get(`/api/v1/__probe?access_token=${token}&token=${token}`);
      const cookie = await request(app).get("/api/v1/__probe").set("Cookie", `access_token=${token}; token=${token}`);
      expect([query.status, cookie.status]).toEqual([401, 401]);
      expect(captured.handlerRuns).toBe(0);
    });

    it.each([
      ["(r) the scheme in lower case", (t: string) => `bearer ${t}`],
      ["(r) the scheme in upper case", (t: string) => `BEARER ${t}`],
      ["(r) two spaces after the scheme", (t: string) => `Bearer  ${t}`],
      ["a tab after the scheme", (t: string) => `Bearer\t${t}`],
      ["(t) two tokens separated by a comma", (t: string) => `Bearer ${t},${t}`],
      ["(t) two tokens separated by a space", (t: string) => `Bearer ${t} ${t}`],
      ["no scheme", (t: string) => t],
      ["a token with only two segments", (t: string) => `Bearer ${t.split(".").slice(0, 2).join(".")}`],
      ["an empty token", () => "Bearer "],
    ])("%s", async (_label, make) => {
      await expectUnauthenticated(make(await platformToken()), {
        code: "UNAUTHENTICATED",
        challenge: "Bearer",
        message: "Authentication is required.",
      });
    });

    it("(s) a 5 000-character Authorization header is refused before any parsing", async () => {
      await expectUnauthenticated(`Bearer ${"a".repeat(5000)}.b.c`, {
        code: "UNAUTHENTICATED",
        challenge: "Bearer",
        message: "Authentication is required.",
      });
    });

    it("an invalid token's response and log carry no part of the token", async () => {
      const { app, out } = build();
      const res = await request(app).get("/api/v1/__probe").set("Authorization", `Bearer ${MARK}.${MARK}.${MARK}`);
      expect(res.status).toBe(401);
      expect(JSON.stringify(res.body)).not.toContain(MARK);
      expect(out.lines.join("\n")).not.toContain(MARK);
    });
  });
});

describe("portal-token middleware (PS-11)", () => {
  it("(G0-34) builds a portal_user context with the token's company", async () => {
    const { app } = build();
    const res = await request(app).get("/portal/v1/__probe").set("Authorization", bearer(await portalToken()));
    expect(res.status).toBe(200);
    expect(res.body.context).toEqual({
      companyId: company,
      actor: { kind: "portal_user", portalAccountId: portalAccount, clientId: client, role: "client" },
      causation: null,
      requestId: res.headers["x-request-id"],
    });
  });

  it("(G0-33) token types cannot be swapped, and neither handler runs", async () => {
    const { app, captured } = build();
    const onApi = await request(app).get("/api/v1/__probe").set("Authorization", bearer(await portalToken()));
    const onPortal = await request(app).get("/portal/v1/__probe").set("Authorization", bearer(await platformToken()));
    expect([onApi.status, onPortal.status]).toEqual([401, 401]);
    expect(onApi.headers["www-authenticate"]).toBe('Bearer error="invalid_token"');
    expect(captured.handlerRuns).toBe(0);
  });

  it("applies the same header rules", async () => {
    const { app } = build();
    const token = await portalToken();
    for (const header of [undefined, `bearer ${token}`, `Bearer  ${token}`, `Basic ${token}`]) {
      const req = request(app).get("/portal/v1/__probe");
      const res = await (header === undefined ? req : req.set("Authorization", header));
      expect(res.status).toBe(401);
    }
  });
});

describe("createApiApp in full mode (G0-35)", () => {
  function fullApp() {
    const out = capture();
    const logger = createLogger({ service: "api", level: "debug", destination: out.destination });
    const app = createApiApp({
      config,
      logger,
      auth,
      db: { role: "ledger_app", withClient: async () => { throw new Error("no database in this test"); }, end: async () => undefined },
    });
    app.use((_req, res) => void res.status(200).type("html").send("<html>frontend</html>"));
    return { app, out };
  }

  it("unmatched paths: 404 with a valid token, 401 without one, 404 for /api/foo, 404 on the portal with a portal token", async () => {
    const { app } = fullApp();
    const withToken = await request(app).get("/api/v1/nothing").set("Authorization", bearer(await platformToken()));
    const without = await request(app).get("/api/v1/nothing");
    const foo = await request(app).get("/api/foo");
    const portal = await request(app).get("/portal/v1/nothing").set("Authorization", bearer(await portalToken()));
    expect([withToken.status, without.status, foo.status, portal.status]).toEqual([404, 401, 404, 404]);
    for (const res of [withToken, without, foo, portal]) {
      expect(res.headers["content-type"]).toContain("application/json");
      expect(res.text).not.toContain("<html");
    }
    expect(withToken.body.error.code).toBe("NOT_FOUND");
    expect(without.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("a request line for an authenticated 404 carries companyId and userId and route <unmatched>", async () => {
    const { app, out } = fullApp();
    await request(app).get("/api/v1/nothing").set("Authorization", bearer(await platformToken()));
    const line = out.records().find((r) => r.message === "request")!;
    expect(line).toMatchObject({ statusCode: 404, route: "<unmatched>", companyId: company, userId: user });
  });

  it("an unauthenticated request line has no companyId", async () => {
    const { app, out } = fullApp();
    await request(app).get("/api/v1/nothing");
    const line = out.records().find((r) => r.message === "request")!;
    expect(line).toMatchObject({ statusCode: 401 });
    expect(line).not.toHaveProperty("companyId");
  });

  it("full mode needs the keys and, for /health, a pool", () => {
    const logger = createLogger({ service: "api", level: "fatal" });
    expect(() => createApiApp({ config, logger, db: { role: "x", withClient: async () => undefined as never, end: async () => undefined } })).toThrow(/token keys/);
    expect(() => createApiApp({ config, logger, auth })).toThrow(/database pool/);
  });
});
