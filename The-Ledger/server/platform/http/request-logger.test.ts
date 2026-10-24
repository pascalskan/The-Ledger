import express, { Router } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { updateLogContext } from "../context/request-context";
import { createLogger } from "../logging/logger";
import { requestId } from "./request-id";
import { requestLogger } from "./request-logger";

const MARK = "MARKER-c3d9f0";

function build() {
  const lines: string[] = [];
  const logger = createLogger({
    service: "api",
    level: "debug",
    destination: { write: (chunk: string) => void lines.push(chunk) },
  });
  const app = express();
  app.use(requestId);
  app.use(requestLogger(logger));

  const long = "a".repeat(300);
  const jobs = Router();
  jobs.get("/:jobId", (_req, res) => void res.json({ ok: true }));
  jobs.get("/:jobId/fail", (_req, _res, next) => next(new Error("failed")));
  jobs.get("/:jobId/authenticated", (_req, res) => {
    updateLogContext({ companyId: "company-1", userId: "user-1" });
    logger.info("handler line");
    res.json({ ok: true });
  });
  const v1 = Router();
  v1.use("/jobs", jobs);
  v1.get(`/${long}`, (_req, res) => void res.json({ ok: true }));
  app.use("/api/v1", v1);
  app.use("/api/v1", ((_err, _req, res, _next) => void res.status(500).json({})) as express.ErrorRequestHandler);
  return { app, records: () => lines.map((l) => JSON.parse(l) as Record<string, any>), lines };
}

describe("route templates in the request line", () => {
  it("uses the matched template for a nested router, never parameter values", async () => {
    const { app, records, lines } = build();
    await request(app).get(`/api/v1/jobs/${MARK}`);
    const [line] = records();
    expect(line!.route).toBe("/api/v1/jobs/:jobId");
    expect(lines.join("\n")).not.toContain(MARK);
  });

  it("keeps the full template when the error path has already unwound the nested routers", async () => {
    const { app, records } = build();
    await request(app).get(`/api/v1/jobs/${MARK}/fail`);
    expect(records().find((r) => r.message === "request")!.route).toBe("/api/v1/jobs/:jobId/fail");
  });

  it("truncates a 300-character route to 256 characters", async () => {
    const { app, records } = build();
    await request(app).get(`/api/v1/${"a".repeat(300)}`);
    const line = records()[0]!;
    expect(line.route).toHaveLength(256);
    expect(line.route.startsWith("/api/v1/aaaa")).toBe(true);
  });

  it("includes companyId and userId set during the request, on the request line and on the handler's own line", async () => {
    const { app, records } = build();
    const res = await request(app).get(`/api/v1/jobs/${MARK}/authenticated`);
    const [handlerLine, requestLine] = records();
    expect(handlerLine).toMatchObject({ message: "handler line", requestId: res.headers["x-request-id"] });
    expect(requestLine).toMatchObject({
      message: "request",
      requestId: res.headers["x-request-id"],
      companyId: "company-1",
      userId: "user-1",
    });
  });
});
