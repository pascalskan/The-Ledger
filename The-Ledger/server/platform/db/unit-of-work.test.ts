import { randomUUID } from "node:crypto";
import type pg from "pg";
import { describe, expect, it, vi } from "vitest";
import { createExecutionContext, toCompanyId } from "../context/execution-context";
import { createLogger } from "../logging/logger";
import { DESTROY_CLIENT, type DbPool } from "./client";
import { assertNoTransactionControl, createUnitOfWorkRunner } from "./unit-of-work";

// The unit of work's handling of a connection it cannot clean up, without a database.

function fakePool(rollbackFails: boolean) {
  const statements: string[] = [];
  let company: unknown;
  const client = {
    query: vi.fn(async (text: string, values?: unknown[]) => {
      statements.push(text);
      if (/^ROLLBACK/.test(text) && rollbackFails) throw new Error("connection lost");
      // the unit's identity statement and its pre-COMMIT integrity check
      if (text.includes("set_config")) {
        company = values?.[0];
        return { command: "SELECT", rows: [{ started: "T1" }], rowCount: 1 };
      }
      if (text.includes("transaction_timestamp")) {
        return { command: "SELECT", rows: [{ started: "T1", role: "ledger_app", company }], rowCount: 1 };
      }
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
    expect(statements.map((s) => s.split(" ")[0])).toEqual(["BEGIN", "SELECT", "SELECT", "COMMIT"]);
  });
});

describe("assertNoTransactionControl", () => {
  const refused = [
    "COMMIT", "commit;", "ROLLBACK", "BEGIN", "START TRANSACTION", "END", "ABORT", "SAVEPOINT s", "RELEASE s",
    "SET ROLE x", "SET LOCAL a = 1", "RESET ROLE", "DISCARD ALL", "PREPARE p AS SELECT 1", "EXECUTE p", "DEALLOCATE p",
    "DO $$ BEGIN END $$", "CALL f()", "LOAD 'x'", "SELECT set_config('a','b',true)", "SELECT SET_CONFIG ('a','b',false)",
    "SELECT 1; COMMIT", "SELECT 1;\n  rollback", "/* c */ COMMIT", "-- c\nCOMMIT", "(COMMIT)", "\t\nBegin",
    "SELECT pg_catalog.set_config('a','b',true)", "select\nset_config\n('a','b',true)",
  ];
  const allowed = [
    "SELECT 1", "SELECT * FROM t WHERE a = $1", "INSERT INTO t (a) VALUES ($1) RETURNING a",
    "UPDATE t SET a = $1 WHERE b = $2", "DELETE FROM t WHERE a = $1", "WITH x AS (SELECT 1) SELECT * FROM x",
    "SELECT 'COMMIT' AS word", "SELECT 'it''s; COMMIT' AS word", "SELECT $$ROLLBACK; SET ROLE x$$ AS body",
    "SELECT $tag$COMMIT$tag$", "-- COMMIT\nSELECT 1", "/* SET ROLE */ SELECT 1", "SELECT a AS \"commit\" FROM t",
    "INSERT INTO t (a) VALUES ('set_config(')", "SELECT current_setting('app.company_id', true)",
    "UPDATE t SET commit_count = commit_count + 1", "SELECT 1;", "",
  ];

  it.each(refused)("refuses %j", (text) => {
    expect(() => assertNoTransactionControl(text)).toThrow(expect.objectContaining({ name: "UnitOfWorkIntegrityError" }));
  });
  it.each(allowed)("allows %j", (text) => {
    expect(() => assertNoTransactionControl(text)).not.toThrow();
  });
});

describe("the pre-COMMIT integrity check (fake connection)", () => {
  function runnerWhere(check: { started?: string; role?: string; company?: string | null; error?: Error | { code: string } }) {
    const statements: string[] = [];
    let company: unknown;
    const client = {
      query: vi.fn(async (text: string, values?: unknown[]) => {
        statements.push(text.trim().split(/\s+/)[0]!);
        if (text.includes("set_config")) {
          company = values?.[0];
          return { command: "SELECT", rows: [{ started: "T1" }], rowCount: 1 };
        }
        if (text.includes("transaction_timestamp")) {
          if (check.error) throw Object.assign(new Error("failed"), check.error);
          return { command: "SELECT", rows: [{ started: check.started ?? "T1", role: check.role ?? "ledger_app", company: check.company === undefined ? company : check.company }], rowCount: 1 };
        }
        return { command: text.split(" ")[0], rows: [], rowCount: 0 };
      }),
    };
    const pool: DbPool = { role: "ledger_app", end: async () => undefined, withClient: (fn) => fn(client as unknown as pg.PoolClient) };
    const errors: unknown[] = [];
    const logger = createLogger({ service: "api", level: "debug", destination: { write: (c: string) => void errors.push(JSON.parse(c)) } });
    return { run: createUnitOfWorkRunner({ pool, logger }).forModule("alpha"), statements, logged: errors as Record<string, any>[] };
  }

  it("a transaction that is no longer the one that began is refused, rolled back, destroyed and logged", async () => {
    const { run, statements, logged } = runnerWhere({ started: "T2" });
    const error = await run(ctx(), async () => 1).catch((e: unknown) => e);
    expect(error).toMatchObject({ name: "UnitOfWorkIntegrityError", message: expect.stringContaining("the transaction changed") });
    expect(marked(error)).toBe(true);
    expect(statements).not.toContain("COMMIT");
    expect(statements.at(-1)).toBe("ROLLBACK");
    expect(logged.find((l) => l.level === "ERROR")).toMatchObject({ condition: "the transaction changed", module: "alpha" });
  });

  it("a changed role is refused", async () => {
    const { run, statements } = runnerWhere({ role: "postgres" });
    const error = await run(ctx(), async () => 1).catch((e: unknown) => e);
    expect(error).toMatchObject({ name: "UnitOfWorkIntegrityError", message: expect.stringContaining("the database role changed") });
    expect(statements).not.toContain("COMMIT");
  });

  it("a changed company is refused, including an empty one", async () => {
    for (const company of ["someone-else", null, ""]) {
      const { run, statements } = runnerWhere({ company });
      const error = await run(ctx(), async () => 1).catch((e: unknown) => e);
      expect(error, String(company)).toMatchObject({ name: "UnitOfWorkIntegrityError" });
      expect(statements).not.toContain("COMMIT");
    }
  });

  it("an aborted transaction (25P02) is reported as UnitOfWorkAbortedError, not a raw driver error", async () => {
    const { run } = runnerWhere({ error: { code: "25P02" } });
    await expect(run(ctx(), async () => 1)).rejects.toMatchObject({ name: "UnitOfWorkAbortedError" });
  });

  it("another failure of the check is rethrown as it is", async () => {
    const { run } = runnerWhere({ error: { code: "08006" } });
    await expect(run(ctx(), async () => 1)).rejects.toMatchObject({ code: "08006" });
  });

  it("a matching check commits", async () => {
    const { run, statements } = runnerWhere({});
    await run(ctx(), async () => 1);
    expect(statements.at(-1)).toBe("COMMIT");
  });
});
