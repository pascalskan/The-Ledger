import { randomUUID } from "node:crypto";
import type pg from "pg";
import { describe, expect, it, vi } from "vitest";
import { createExecutionContext, toCompanyId } from "../context/execution-context";
import { DESTROY_CLIENT, type DbPool } from "./client";
import { createUnitOfWorkRunner } from "./unit-of-work";

// The unit of work's handling of a connection it cannot clean up, without a database.

function fakePool(rollbackFails: boolean) {
  const statements: string[] = [];
  const client = {
    query: vi.fn(async (text: string) => {
      statements.push(text);
      if (/^ROLLBACK/.test(text) && rollbackFails) throw new Error("connection lost");
      return { command: text.split(" ")[0], rows: [], rowCount: 0 };
    }),
  };
  const pool: DbPool = {
    role: "ledger_app",
    end: async () => undefined,
    withClient: (fn) => fn(client as unknown as pg.PoolClient),
  };
  return { pool, statements };
}

const ctx = () =>
  createExecutionContext({
    companyId: toCompanyId(randomUUID()),
    actor: { kind: "user", userId: randomUUID(), role: "ceo" },
  });

const marked = (error: unknown) =>
  typeof error === "object" && error !== null && (error as Record<symbol, unknown>)[DESTROY_CLIENT] === true;

describe("a unit whose ROLLBACK fails", () => {
  it("marks the error it rethrows so the client is destroyed, not reused", async () => {
    const { pool, statements } = fakePool(true);
    const failure = new Error("work failed");
    const error = await createUnitOfWorkRunner({ pool })
      .forModule("alpha")(ctx(), async () => {
        throw failure;
      })
      .catch((e: unknown) => e);
    expect(error).toBe(failure);
    expect(marked(error)).toBe(true);
    expect(statements.at(-1)).toBe("ROLLBACK");
  });

  it.each([
    ["a string", "just a string"],
    ["a frozen error", Object.freeze(new Error("frozen"))],
    ["a number", 42],
  ])("wraps %s, which cannot carry the mark, keeping it as the cause", async (_label, thrown) => {
    const { pool } = fakePool(true);
    const error = (await createUnitOfWorkRunner({ pool })
      .forModule("alpha")(ctx(), async () => {
        throw thrown;
      })
      .catch((e: unknown) => e)) as Error;
    expect(marked(error)).toBe(true);
    expect(error.cause).toBe(thrown);
  });

  it("does not mark the error when ROLLBACK succeeds", async () => {
    const { pool } = fakePool(false);
    const failure = new Error("work failed");
    const error = await createUnitOfWorkRunner({ pool })
      .forModule("alpha")(ctx(), async () => {
        throw failure;
      })
      .catch((e: unknown) => e);
    expect(error).toBe(failure);
    expect(marked(error)).toBe(false);
  });

  it("issues no ROLLBACK after a successful COMMIT", async () => {
    const { pool, statements } = fakePool(false);
    await createUnitOfWorkRunner({ pool }).forModule("alpha")(ctx(), async () => "ok");
    expect(statements.map((s) => s.split(" ")[0])).toEqual(["BEGIN", "SELECT", "COMMIT"]);
  });
});
