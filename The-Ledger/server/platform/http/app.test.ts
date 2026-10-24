import { generateKeyPairSync, randomBytes } from "node:crypto";
import os from "node:os";
import type { Express } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { loadApiConfig } from "../config/env";
import { createLogger } from "../logging/logger";
import { createApiApp } from "./app";

const MARK = "MARKER-a77e02";

function capture() {
  const lines: string[] = [];
  return {
    lines,
    destination: { write: (chunk: string) => void lines.push(chunk) },
    records: () => lines.map((line) => JSON.parse(line) as Record<string, any>),
  };
}

const options = { appDir: os.tmpdir() };

function frontendOnlyConfig() {
  return loadApiConfig({ NODE_ENV: "development" }, options);
}

function fullConfig() {
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  return loadApiConfig(
    {
      NODE_ENV: "development",
      LEDGER_APP_DATABASE_URL: "postgresql://ledger_app:pw@127.0.0.1:55432/ledger_test",
      JWT_PRIVATE_KEY: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
      JWT_PUBLIC_KEY: publicKey.export({ type: "spki", format: "pem" }).toString(),
      PORTAL_JWT_SECRET: randomBytes(48).toString("base64"),
    },
    options,
  );
}

/** The app with a sentinel standing in for frontend serving, mounted last as PS-02 does. */
function build(config: ReturnType<typeof loadApiConfig>) {
  const out = capture();
  const logger = createLogger({ service: "api", level: "debug", destination: out.destination });
  const app: Express = createApiApp({ config, logger });
  app.use((req, res) => {
    res.status(200).type("html").send(`<html>frontend ${req.method}</html>`);
  });
  return { app, out };
}

describe("frontend-only mode (G0-37, G0-30)", () => {
  it("API and portal paths answer 503 BACKEND_NOT_CONFIGURED and never reach the frontend", async () => {
    const { app } = build(frontendOnlyConfig());
    for (const path of ["/api/v1/x", "/api/foo", "/api", "/api/v2/x", "/portal/v1/x", "/portal/v1"]) {
      const res = await request(app).get(path);
      expect(res.status, path).toBe(503);
      expect(res.body.error, path).toMatchObject({
        code: "BACKEND_NOT_CONFIGURED",
        message: "The backend is not configured.",
        details: {},
      });
      expect(res.body.error.requestId).toBe(res.headers["x-request-id"]);
      expect(res.headers["content-type"]).toContain("application/json");
    }
    const post = await request(app).post("/api/v1/x").send({ a: 1 });
    expect(post.status).toBe(503);
  });

  it("/health is 200 {status: ok, mode: frontend_only}, with no other keys", async () => {
    const { app } = build(frontendOnlyConfig());
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", mode: "frontend_only" });
  });

  it("frontend paths, including /portal and /portal/:section, reach the frontend", async () => {
    const { app } = build(frontendOnlyConfig());
    for (const path of ["/", "/portal", "/portal/projects", "/portal/projects/123", "/portal/v1x", "/apiary"]) {
      const res = await request(app).get(path);
      expect(res.status, path).toBe(200);
      expect(res.text, path).toContain("frontend");
    }
  });

  it("logs exactly one start-up WARN, naming the four variables and no values", () => {
    const { out } = build(frontendOnlyConfig());
    const warnings = out.records().filter((r) => r.level === "WARN");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      message: "Backend not configured: running in frontend-only mode",
      variables: ["LEDGER_APP_DATABASE_URL", "JWT_PRIVATE_KEY", "JWT_PUBLIC_KEY", "PORTAL_JWT_SECRET"],
    });
  });

  it("opens no socket of its own and the parser is not mounted on frontend paths", async () => {
    const { app } = build(frontendOnlyConfig());
    // Malformed JSON to a frontend path is not parsed, so it is not an error.
    const res = await request(app)
      .post("/some/page")
      .set("Content-Type", "application/json")
      .send(`{${MARK}`);
    expect(res.status).toBe(200);
    // ... and a request to an API path in this mode never parses it either.
    const api = await request(app).post("/api/v1/x").set("Content-Type", "application/json").send(`{${MARK}`);
    expect(api.status).toBe(503);
  });
});

describe("full mode pipeline (G0-35, G0-30)", () => {
  it("unmatched API and portal paths give 404 NOT_FOUND envelopes, never HTML", async () => {
    const { app } = build(fullConfig());
    for (const path of ["/api/v1/nothing", "/api/foo", "/api", "/api/v2/x", "/portal/v1/nothing"]) {
      const res = await request(app).get(path);
      expect(res.status, path).toBe(404);
      expect(res.body.error, path).toMatchObject({ code: "NOT_FOUND", message: "The requested resource was not found." });
      expect(res.headers["content-type"]).toContain("application/json");
    }
  });

  it("parses JSON on /api/v1 and /portal/v1 only, reporting malformed JSON as 400 MALFORMED_JSON", async () => {
    const { app } = build(fullConfig());
    for (const path of ["/api/v1/x", "/portal/v1/x"]) {
      const res = await request(app).post(path).set("Content-Type", "application/json").send(`{${MARK}`);
      expect(res.status, path).toBe(400);
      expect(res.body.error.code).toBe("MALFORMED_JSON");
      expect(JSON.stringify(res.body)).not.toContain(MARK);
    }
    const frontend = await request(app).post("/anywhere").set("Content-Type", "application/json").send(`{${MARK}`);
    expect(frontend.status).toBe(200);
  });

  it("limits the body to 1 MB with 413 PAYLOAD_TOO_LARGE", async () => {
    const { app } = build(fullConfig());
    const res = await request(app).post("/api/v1/x").send({ big: "x".repeat(1_100_000) });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("accepts no form bodies: urlencoded is not parsed", async () => {
    const { app } = build(fullConfig());
    const res = await request(app).post("/api/v1/x").type("form").send({ a: "1" });
    expect(res.status).toBe(404);
  });

  it("does not log a start-up WARN in full mode", () => {
    const { out } = build(fullConfig());
    expect(out.records().filter((r) => r.level === "WARN")).toEqual([]);
  });
});

describe("headers in both modes (G0-30, §6.2)", () => {
  const apiHeaders = {
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "x-frame-options": "DENY",
    "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
  };

  it.each([
    ["frontend-only", frontendOnlyConfig],
    ["full", fullConfig],
  ])("%s: /api, /portal/v1 and /health carry the security headers; the frontend does not", async (_label, config) => {
    const { app } = build(config());
    for (const path of ["/api/v1/x", "/api/foo", "/portal/v1/x", "/health"]) {
      const res = await request(app).get(path).set("Origin", "https://evil.example");
      for (const [name, value] of Object.entries(apiHeaders)) expect(res.headers[name], `${path} ${name}`).toBe(value);
    }
    const frontend = await request(app).get("/").set("Origin", "https://evil.example");
    expect(frontend.headers).not.toHaveProperty("x-frame-options");
    expect(frontend.headers).not.toHaveProperty("content-security-policy");
  });

  it.each([
    ["frontend-only", frontendOnlyConfig],
    ["full", fullConfig],
  ])("%s: no response has X-Powered-By or any CORS header", async (_label, config) => {
    const { app } = build(config());
    for (const path of ["/api/v1/x", "/api/foo", "/portal/v1/x", "/health", "/", "/portal/projects"]) {
      const res = await request(app).get(path).set("Origin", "https://evil.example");
      expect(res.headers, path).not.toHaveProperty("x-powered-by");
      expect(Object.keys(res.headers).filter((h) => h.startsWith("access-control-")), path).toEqual([]);
    }
  });

  it("a preflight request gets no CORS answer", async () => {
    const { app } = build(frontendOnlyConfig());
    const res = await request(app)
      .options("/api/v1/x")
      .set("Origin", "https://evil.example")
      .set("Access-Control-Request-Method", "POST");
    expect(Object.keys(res.headers).filter((h) => h.startsWith("access-control-"))).toEqual([]);
  });
});

describe("request IDs and the request line (G0-29)", () => {
  it("generates a server-side X-Request-Id and ignores the client's", async () => {
    const { app, out } = build(frontendOnlyConfig());
    const res = await request(app).get("/api/v1/x").set("X-Request-Id", `client-${MARK}`);
    const id = res.headers["x-request-id"];
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(id).not.toContain(MARK);
    expect(out.lines.join("\n")).not.toContain(MARK);
    const line = out.records().find((r) => r.message === "request");
    expect(line!.requestId).toBe(id);
  });

  it("writes exactly one request line per request, with the required fields", async () => {
    const { app, out } = build(fullConfig());
    await request(app).get("/api/v1/nothing?secret=" + MARK).set("Cookie", `session=${MARK}`);
    await request(app).post("/api/v1/nothing").send({ password: MARK });
    await request(app).get("/portal/v1/nothing");
    const lines = out.records().filter((r) => r.message === "request");
    expect(lines).toHaveLength(3);
    for (const line of lines) {
      expect(line.level).toBe("INFO");
      expect(new Date(line.timestamp).toISOString()).toBe(line.timestamp);
      expect(typeof line.requestId).toBe("string");
      expect(typeof line.durationMs).toBe("number");
      expect(line.route).toBe("<unmatched>");
      expect(line.statusCode).toBe(404);
      expect(line).not.toHaveProperty("companyId");
    }
    expect(lines.map((l) => l.method)).toEqual(["GET", "POST", "GET"]);
    expect(out.lines.join("\n")).not.toContain(MARK);
  });

  it("logs /health at DEBUG and frontend paths not at all", async () => {
    const { app, out } = build(frontendOnlyConfig());
    await request(app).get("/health");
    await request(app).get("/");
    await request(app).get("/portal/projects");
    await request(app).get("/assets/index.js");
    const lines = out.records().filter((r) => r.message === "request");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ level: "DEBUG", route: "/health", statusCode: 200 });
  });

  it("never logs the raw path or query string", async () => {
    const { app, out } = build(frontendOnlyConfig());
    await request(app).get(`/api/v1/${MARK}?token=${MARK}`);
    const line = out.records().find((r) => r.message === "request")!;
    for (const key of ["path", "url", "query", "originalUrl"]) expect(line).not.toHaveProperty(key);
    expect(out.lines.join("\n")).not.toContain(MARK);
  });
});
