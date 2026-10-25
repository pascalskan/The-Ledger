import os from "node:os";
import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadApiConfig, type ApiConfig } from "../config";
import type { DbPool } from "../db/client";
import { createLogger } from "../logging/logger";
import { createHealthHandler, HEALTH_CACHE_MS, HEALTH_TIMEOUT_MS } from "./health";

// PS-08 without a database: a fake pool lets the test control timing and count checkouts.

const MARK = "MARKER-0d6c1e";

function fullConfig(): ApiConfig {
  // Only the mode matters to the handler.
  return { mode: "full" } as unknown as ApiConfig;
}

function capture() {
  const lines: string[] = [];
  const logger = createLogger({
    service: "api",
    level: "debug",
    destination: { write: (chunk: string) => void lines.push(chunk) },
  });
  return { lines, logger };
}

function fakeResponse() {
  const result: { status?: number; body?: unknown } = {};
  const res = {
    status(code: number) {
      result.status = code;
      return res;
    },
    json(body: unknown) {
      result.body = body;
      return res;
    },
  };
  return { res: res as unknown as Response, result };
}

const req = {} as Request;

function poolWith(behaviour: () => Promise<unknown>) {
  const state = { checkouts: 0 };
  const pool: DbPool = {
    role: "ledger_app",
    end: async () => undefined,
    withClient: async () => {
      state.checkouts++;
      return (await behaviour()) as never;
    },
  };
  return { pool, state };
}

async function callHealth(handler: ReturnType<typeof createHealthHandler>) {
  const { res, result } = fakeResponse();
  await handler(req, res, () => undefined);
  return result;
}

describe("frontend-only mode", () => {
  it("answers ok/frontend_only and never needs a pool", async () => {
    const config = loadApiConfig({ NODE_ENV: "development" }, { appDir: os.tmpdir() });
    const result = await callHealth(createHealthHandler(config, capture().logger));
    expect(result).toEqual({ status: 200, body: { status: "ok", mode: "frontend_only" } });
  });
});

describe("full mode", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("needs a pool", () => {
    expect(() => createHealthHandler(fullConfig(), capture().logger)).toThrow(/pool/);
  });

  it("200 {status: ok, mode: full} when the check succeeds, with no other keys", async () => {
    const { pool } = poolWith(async () => ({ rows: [{ "?column?": 1 }] }));
    const result = await callHealth(createHealthHandler(fullConfig(), capture().logger, pool));
    expect(result).toEqual({ status: 200, body: { status: "ok", mode: "full" } });
  });

  it("503 {status: unavailable, mode: full} when the check fails, logging a WARN through the serializer and no secrets", async () => {
    const { lines, logger } = capture();
    const { pool } = poolWith(async () => {
      throw Object.assign(new Error(`connect ECONNREFUSED ${MARK}`), { code: "ECONNREFUSED" });
    });
    const result = await callHealth(createHealthHandler(fullConfig(), logger, pool));
    expect(result).toEqual({ status: 503, body: { status: "unavailable", mode: "full" } });
    expect(JSON.stringify(result.body)).not.toContain(MARK);
    const warning = lines.map((l) => JSON.parse(l)).find((l) => l.level === "WARN");
    expect(warning).toMatchObject({ message: "Health check failed", err: { name: "Error", code: "ECONNREFUSED" } });
  });

  it("503 when the check takes longer than 2 seconds, and the response arrives at the timeout", async () => {
    const { pool } = poolWith(() => new Promise(() => undefined));
    const handler = createHealthHandler(fullConfig(), capture().logger, pool);
    const pending = callHealth(handler);
    await vi.advanceTimersByTimeAsync(HEALTH_TIMEOUT_MS - 1);
    let settled = false;
    void pending.then(() => (settled = true));
    await Promise.resolve();
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(2);
    expect(await pending).toEqual({ status: 503, body: { status: "unavailable", mode: "full" } });
  });

  it("50 concurrent requests share ONE in-flight check (one checkout)", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const { pool, state } = poolWith(async () => {
      await gate;
      return {};
    });
    const handler = createHealthHandler(fullConfig(), capture().logger, pool);
    const calls = Array.from({ length: 50 }, () => callHealth(handler));
    await Promise.resolve();
    expect(state.checkouts).toBe(1);
    release();
    const results = await Promise.all(calls);
    expect(results.every((r) => r.status === 200)).toBe(true);
    expect(state.checkouts).toBe(1);
  });

  it("reuses the result for 1 second, then checks again", async () => {
    const { pool, state } = poolWith(async () => ({}));
    const handler = createHealthHandler(fullConfig(), capture().logger, pool);
    await callHealth(handler);
    await callHealth(handler);
    expect(state.checkouts).toBe(1);
    await vi.advanceTimersByTimeAsync(HEALTH_CACHE_MS + 1);
    await callHealth(handler);
    expect(state.checkouts).toBe(2);
  });

  it("recovers: a failure is not cached beyond the window", async () => {
    let fail = true;
    const { pool } = poolWith(async () => {
      if (fail) throw new Error("down");
      return {};
    });
    const handler = createHealthHandler(fullConfig(), capture().logger, pool);
    expect((await callHealth(handler)).status).toBe(503);
    fail = false;
    await vi.advanceTimersByTimeAsync(HEALTH_CACHE_MS + 1);
    expect((await callHealth(handler)).status).toBe(200);
  });
});
