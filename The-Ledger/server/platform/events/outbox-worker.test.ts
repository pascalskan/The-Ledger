import type pg from "pg";
import { describe, expect, it, vi } from "vitest";
import { DESTROY_CLIENT, RuntimeRoleError, type DbPool } from "../db/client";
import { LockLostError } from "../errors/platform-errors";
import { createLogger } from "../logging/logger";
import { createOutboxSteps, isInfrastructureError, type OutboxRow } from "./outbox-worker";
import { createSubscriberRegistry } from "./subscriber-registry";

const logger = createLogger({ service: "worker", level: "fatal" });
const marked = (error: unknown) =>
  typeof error === "object" && error !== null && (error as Record<symbol, unknown>)[DESTROY_CLIENT] === true;
const withCode = (code: string) => Object.assign(new Error("x"), { code });

describe("isInfrastructureError", () => {
  it.each([
    ["a refused role check", new RuntimeRoleError("is superuser", "ledger_worker")],
    ["08000", withCode("08000")],
    ["08P01", withCode("08P01")],
    ["57P01", withCode("57P01")],
    ["57P02", withCode("57P02")],
    ["57P03", withCode("57P03")],
    ["ECONNRESET", withCode("ECONNRESET")],
    ["ECONNREFUSED", withCode("ECONNREFUSED")],
    ["ETIMEDOUT", withCode("ETIMEDOUT")],
    ["pg connection terminated", new Error("Connection terminated unexpectedly")],
    ["pg connection timeout", new Error("Connection terminated due to connection timeout")],
    ["pg pool timeout", new Error("timeout exceeded when trying to connect")],
    ["an ended pool", new Error("Cannot use a pool after calling end on the pool")],
    ["a cause two levels down", new Error("outer", { cause: new Error("outer 2", { cause: withCode("57P01") }) })],
  ])("recognises %s", (_label, error) => {
    expect(isInfrastructureError(error)).toBe(true);
  });

  it.each([
    ["a plain error", new Error("boom")],
    ["23505", withCode("23505")],
    ["22P02", withCode("22P02")],
    ["0A000 (not class 08)", withCode("0A000")],
    ["40001", withCode("40001")],
    ["ENOENT", withCode("ENOENT")],
    ["LockLostError", new LockLostError()],
    ["a string", "Connection terminated"],
    ["null", null],
    ["undefined", undefined],
    ["a number", 42],
  ])("does not recognise %s", (_label, error) => {
    expect(isInfrastructureError(error)).toBe(false);
  });

  it("looks at most three causes deep", () => {
    const deep = new Error("1", {
      cause: new Error("2", { cause: new Error("3", { cause: new Error("4", { cause: withCode("57P01") }) }) }),
    });
    expect(isInfrastructureError(deep)).toBe(false);
  });
});

describe("finish() when its ROLLBACK fails (review m4)", () => {
  const row = { outbox_id: "11111111-1111-1111-1111-111111111111" } as OutboxRow;

  function stepsWith(rollbackFails: boolean, updateRows: number) {
    const statements: string[] = [];
    const client = {
      query: vi.fn(async (text: string) => {
        statements.push(text.trim().split(/\s+/)[0]!);
        if (text === "ROLLBACK" && rollbackFails) throw new Error("connection lost");
        return { rowCount: text.trim().startsWith("UPDATE") ? updateRows : 1, rows: [] };
      }),
    };
    const pool: DbPool = {
      role: "ledger_worker",
      end: async () => undefined,
      withClient: (fn) => fn(client as unknown as pg.PoolClient),
    };
    const steps = createOutboxSteps({
      pool,
      runner: undefined as never,
      subscribers: createSubscriberRegistry([], new Map()),
      settings: { maxAttempts: 5, baseBackoffMs: 20, pollIntervalMs: 20, batchSize: 10, staleLockMs: 1000 },
      logger,
      instanceId: "test:1:abcd1234",
    });
    return { steps, statements };
  }

  it("rethrows the ORIGINAL LockLostError and marks it so the client is destroyed", async () => {
    const { steps, statements } = stepsWith(true, 0);
    const error = await steps.finish(row).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(LockLostError);
    expect(marked(error)).toBe(true);
    expect(statements.at(-1)).toBe("ROLLBACK");
  });

  it("with a working ROLLBACK, the original error is rethrown unmarked", async () => {
    const { steps } = stepsWith(false, 0);
    const error = await steps.finish(row).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(LockLostError);
    expect(marked(error)).toBe(false);
  });

  it("a successful finish commits and never rolls back", async () => {
    const { steps, statements } = stepsWith(false, 1);
    await steps.finish(row);
    expect(statements).toEqual(["BEGIN", "INSERT", "UPDATE", "COMMIT"]);
  });
});
