import express, { Router, type Express } from "express";
import pg from "pg";
import request from "supertest";
import { z } from "zod";
import { beforeEach, describe, expect, it } from "vitest";
import { notFoundHandler } from "../http/not-found";
import { requestId } from "../http/request-id";
import { requestLogger } from "../http/request-logger";
import { securityHeaders } from "../http/security-headers";
import { createLogger } from "../logging/logger";
import {
  AppError,
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthenticatedError,
  ValidationError,
} from "./app-error";
import { createErrorHandler } from "./error-handler";

const MARK = "MARKER-5c0de1";

function capture() {
  const lines: string[] = [];
  return {
    lines,
    destination: { write: (chunk: string) => void lines.push(chunk) },
    records: () => lines.map((line) => JSON.parse(line) as Record<string, any>),
  };
}

function postgresError(): Error {
  const error = new pg.DatabaseError(`invalid input syntax for type uuid: "${MARK}"`, 100, "error");
  return Object.assign(error, { severity: "ERROR", code: "22P02", detail: MARK });
}

/** The same chain createApiApp builds for /api/v1, with probe routes added. */
function build() {
  const out = capture();
  const logger = createLogger({ service: "api", level: "debug", destination: out.destination });
  const app: Express = express();
  app.disable("x-powered-by");
  app.use(requestId);
  app.use(requestLogger(logger));

  const probe = Router();
  probe.use((req, _res, next) => {
    if (req.path.startsWith("/boom/")) return next(new Error("router middleware failed"));
    next();
  });
  probe.post("/echo", (req, res) => void res.json({ received: req.body }));
  probe.post("/validate", (req, _res, next) => {
    try {
      z.object({ kind: z.enum(["a", "b"]) }).parse(req.body);
    } catch (error) {
      next(error);
    }
  });
  probe.get("/pg", (_req, _res, next) => next(postgresError()));
  probe.get("/throws", () => {
    throw new Error("internal");
  });
  probe.get("/throws-string", () => {
    throw `string thrown ${MARK}`;
  });
  probe.get("/app/:kind", (req, _res, next) => {
    switch (req.params.kind) {
      case "conflict": return next(new ConflictError("That job is already closed.", { jobId: "j1" }));
      case "forbidden": return next(new ForbiddenError());
      case "rule": return next(new BusinessRuleError("The amount exceeds the limit.", undefined, "AMOUNT_TOO_HIGH"));
      case "validation": return next(new ValidationError());
      case "notfound": return next(new NotFoundError());
      case "unauth": return next(new UnauthenticatedError());
      case "expired": return next(new UnauthenticatedError("The token has expired.", { code: "TOKEN_EXPIRED" }));
      case "invalid": return next(new UnauthenticatedError("The token is not valid.", { invalidToken: true }));
      case "teapot": return next(new AppError("TEAPOT", 418, "Short and stout."));
      default: return next(new AppError("BROKEN", 500, "Something is broken."));
    }
  });
  probe.get("/items/:id", (req, res) => void res.json({ ok: true, id: req.params.id.length }));
  probe.get("/partial", (_req, res) => {
    res.status(200);
    res.write("partial");
    throw new Error("after headers");
  });

  const mount = Router();
  mount.use("/__probe", probe);
  app.use("/api/v1", securityHeaders, express.json({ limit: "1mb" }), mount, notFoundHandler, createErrorHandler(logger));
  return { app, out };
}

let ctx: ReturnType<typeof build>;
beforeEach(() => {
  ctx = build();
});

const errorBody = (res: request.Response) => res.body.error as Record<string, any>;
const wholeLog = () => ctx.out.lines.join("\n");

describe("error envelope (PS-07, §6.3)", () => {
  it("is exactly { error: { code, message, details, requestId } }, with requestId equal to the header", async () => {
    const res = await request(ctx.app).get("/api/v1/__probe/app/conflict");
    expect(res.status).toBe(409);
    expect(Object.keys(res.body)).toEqual(["error"]);
    expect(Object.keys(res.body.error).sort()).toEqual(["code", "details", "message", "requestId"]);
    expect(res.body.error).toMatchObject({
      code: "CONFLICT",
      message: "That job is already closed.",
      details: { jobId: "j1" },
    });
    expect(res.body.error.requestId).toBe(res.headers["x-request-id"]);
    expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
    expect(JSON.stringify(res.body)).not.toContain("stack");
  });

  it.each([
    ["forbidden", 403, "FORBIDDEN"],
    ["rule", 422, "AMOUNT_TOO_HIGH"],
    ["validation", 400, "VALIDATION_ERROR"],
    ["notfound", 404, "NOT_FOUND"],
    ["teapot", 418, "TEAPOT"],
  ])("AppError %s: its own status, code and safeMessage", async (kind, status, code) => {
    const res = await request(ctx.app).get(`/api/v1/__probe/app/${kind}`);
    expect(res.status).toBe(status);
    expect(errorBody(res).code).toBe(code);
    expect(errorBody(res).details).toEqual({});
  });

  it("an AppError with status 500 is logged at ERROR; a 4xx at DEBUG", async () => {
    await request(ctx.app).get("/api/v1/__probe/app/broken");
    await request(ctx.app).get("/api/v1/__probe/app/forbidden");
    const levels = ctx.out.records().filter((r) => r.message !== "request").map((r) => r.level);
    expect(levels).toEqual(["ERROR", "DEBUG"]);
  });

  it("401: WWW-Authenticate is Bearer, or Bearer error=invalid_token for invalid and expired tokens", async () => {
    const plain = await request(ctx.app).get("/api/v1/__probe/app/unauth");
    expect(plain.status).toBe(401);
    expect(plain.headers["www-authenticate"]).toBe("Bearer");
    expect(errorBody(plain).code).toBe("UNAUTHENTICATED");
    for (const kind of ["expired", "invalid"]) {
      const res = await request(ctx.app).get(`/api/v1/__probe/app/${kind}`);
      expect(res.headers["www-authenticate"]).toBe('Bearer error="invalid_token"');
    }
    expect(errorBody(await request(ctx.app).get("/api/v1/__probe/app/expired")).code).toBe("TOKEN_EXPIRED");
  });

  it("a ZodError gives 400 VALIDATION_ERROR with details by path; the log has the count only (G0-27e)", async () => {
    const res = await request(ctx.app).post("/api/v1/__probe/validate").send({ kind: MARK });
    expect(res.status).toBe(400);
    expect(errorBody(res)).toMatchObject({ code: "VALIDATION_ERROR", message: "Request validation failed." });
    expect(Object.keys(errorBody(res).details)).toEqual(["kind"]);
    expect(Array.isArray(errorBody(res).details.kind)).toBe(true);
    expect(wholeLog()).not.toContain(MARK);
    const rejected = ctx.out.records().find((r) => r.message === "Request rejected");
    expect(rejected!.err).toEqual({ name: "ZodError", code: "VALIDATION_ERROR", issueCount: 1 });
  });

  it("a root-level validation issue is listed under _root", async () => {
    const res = await request(ctx.app).post("/api/v1/__probe/validate").send([1]);
    expect(errorBody(res).details).toHaveProperty("_root");
  });

  it("malformed JSON gives 400 MALFORMED_JSON and neither the response nor the log has the body (G0-27d)", async () => {
    const res = await request(ctx.app)
      .post("/api/v1/__probe/echo")
      .set("Content-Type", "application/json")
      .send(`{${MARK} not json`);
    expect(res.status).toBe(400);
    expect(errorBody(res)).toMatchObject({ code: "MALFORMED_JSON", message: "Request body is not valid JSON." });
    expect(JSON.stringify(res.body)).not.toContain(MARK);
    expect(wholeLog()).not.toContain(MARK);
  });

  it("a body over 1 MB gives 413 PAYLOAD_TOO_LARGE (G0-27f)", async () => {
    const res = await request(ctx.app)
      .post("/api/v1/__probe/echo")
      .send({ big: `${MARK}${"x".repeat(1_100_000)}` });
    expect(res.status).toBe(413);
    expect(errorBody(res).code).toBe("PAYLOAD_TOO_LARGE");
    expect(wholeLog()).not.toContain(MARK);
  });

  it("an unsupported charset gives 415 UNSUPPORTED_MEDIA_TYPE and quotes nothing (G0-27l)", async () => {
    const res = await request(ctx.app)
      .post("/api/v1/__probe/echo")
      .set("Content-Type", `application/json; charset=x-${MARK}`)
      .send("{}");
    expect(res.status).toBe(415);
    expect(errorBody(res).code).toBe("UNSUPPORTED_MEDIA_TYPE");
    expect(JSON.stringify(res.body)).not.toContain(MARK);
    expect(wholeLog()).not.toContain(MARK);
  });

  it("a path parameter that cannot be URL-decoded gives 400 BAD_REQUEST and logs no marker (G0-27p)", async () => {
    const res = await request(ctx.app).get(`/api/v1/__probe/items/${MARK}%E0%A4%A`);
    expect(res.status).toBe(400);
    expect(errorBody(res)).toMatchObject({ code: "BAD_REQUEST", message: "The request could not be processed." });
    expect(wholeLog()).not.toContain(MARK);
    const requestLine = ctx.out.records().find((r) => r.message === "request");
    expect(requestLine!.route).toBe("<unmatched>");
  });

  it("anything else gives a generic 500 and never the error's message, the database's text or a marker (G0-27g,i)", async () => {
    const thrown = await request(ctx.app).get("/api/v1/__probe/throws");
    expect(thrown.status).toBe(500);
    expect(errorBody(thrown)).toMatchObject({ code: "INTERNAL_ERROR", message: "An unexpected error occurred." });
    expect(JSON.stringify(thrown.body)).not.toContain("internal");

    const database = await request(ctx.app).get("/api/v1/__probe/pg");
    expect(database.status).toBe(500);
    expect(JSON.stringify(database.body)).not.toContain(MARK);
    expect(wholeLog()).not.toContain(MARK);
  });

  it("the 500 ERROR line carries the safe error, the method and the route template (R3-14)", async () => {
    await request(ctx.app).get("/api/v1/__probe/pg");
    const failed = ctx.out.records().find((r) => r.message === "Request failed");
    expect(failed).toMatchObject({
      level: "ERROR",
      method: "GET",
      route: "/api/v1/__probe/pg",
      err: { pgCode: "22P02", message: "PostgreSQL error 22P02" },
    });
    expect(typeof failed!.requestId).toBe("string");
    expect(failed).not.toHaveProperty("path");
  });

  it("a thrown value that is not an Error is never logged, only its type", async () => {
    const res = await request(ctx.app).get("/api/v1/__probe/throws-string");
    expect(res.status).toBe(500);
    expect(wholeLog()).not.toContain(MARK);
    expect(ctx.out.records().find((r) => r.message === "Request failed")!.thrownType).toBe("string");
  });

  it("router middleware that throws before any route matches: 500, route <unmatched> on both lines (G0-27o)", async () => {
    const res = await request(ctx.app).get(`/api/v1/__probe/boom/${MARK}`);
    expect(res.status).toBe(500);
    const records = ctx.out.records();
    expect(records.find((r) => r.message === "Request failed")!.route).toBe("<unmatched>");
    expect(records.find((r) => r.message === "request")!.route).toBe("<unmatched>");
    expect(wholeLog()).not.toContain(MARK);
  });

  it("an unmatched API path gives 404 NOT_FOUND with route <unmatched> (G0-27m)", async () => {
    const res = await request(ctx.app).get(`/api/v1/${MARK}`);
    expect(res.status).toBe(404);
    expect(errorBody(res)).toMatchObject({ code: "NOT_FOUND", message: "The requested resource was not found." });
    expect(ctx.out.records().find((r) => r.message === "request")).toMatchObject({
      route: "<unmatched>",
      statusCode: 404,
    });
    expect(wholeLog()).not.toContain(MARK);
  });

  it("when headers are already sent the handler only logs and ends the response", async () => {
    const res = await request(ctx.app).get("/api/v1/__probe/partial");
    expect(res.status).toBe(200);
    expect(ctx.out.records().some((r) => r.message === "Request failed")).toBe(true);
  });

  it("every response has the security headers and nothing that exposes the stack or CORS", async () => {
    const res = await request(ctx.app).get("/api/v1/__probe/app/conflict").set("Origin", "https://evil.example");
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["referrer-policy"]).toBe("no-referrer");
    expect(res.headers["x-frame-options"]).toBe("DENY");
    expect(res.headers["content-security-policy"]).toBe("default-src 'none'; frame-ancestors 'none'");
    expect(res.headers).not.toHaveProperty("x-powered-by");
    expect(Object.keys(res.headers).filter((h) => h.startsWith("access-control-"))).toEqual([]);
  });
});
