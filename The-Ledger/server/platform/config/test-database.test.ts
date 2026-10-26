import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import pg from "pg";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertTestDatabase,
  readTestDatabaseInputs,
  TestDatabaseGuardError,
  type TestDatabaseInputs,
} from "./test-database";

const url = (database: string, query = "", user = "ledger_app", password = "pw-secret-1") =>
  `postgresql://${user}:${password}@127.0.0.1:55432/${database}${query}`;

/** A valid set: `ledger_test` in all three URLs. */
function valid(overrides: Partial<TestDatabaseInputs> = {}): TestDatabaseInputs {
  return {
    appTestUrl: url("ledger_test"),
    workerTestUrl: url("ledger_test", "", "ledger_worker"),
    migrationTestUrl: url("ledger_test", "", "postgres"),
    appUrl: url("ledger_dev"),
    workerUrl: url("ledger_dev", "", "ledger_worker"),
    migrationUrl: url("ledger_dev", "", "postgres"),
    ...overrides,
  };
}

function refusal(inputs: TestDatabaseInputs): TestDatabaseGuardError {
  try {
    assertTestDatabase(inputs);
  } catch (error) {
    expect(error).toBeInstanceOf(TestDatabaseGuardError);
    // The error never holds a password (or any other part of a URL).
    expect((error as Error).message).not.toContain("pw-secret-1");
    expect((error as Error).message).not.toContain("127.0.0.1");
    return error as TestDatabaseGuardError;
  }
  throw new Error("expected the guard to refuse");
}

afterEach(() => vi.restoreAllMocks());

describe("assertTestDatabase (PS-22, G0-39)", () => {
  it("passes a valid set, including ?sslmode=require, and returns the parsed settings", () => {
    const set = valid({
      appTestUrl: url("ledger_test", "?sslmode=require"),
      workerTestUrl: url("ledger_test", "?sslmode=require", "ledger_worker"),
      migrationTestUrl: url("ledger_test", "?sslmode=require", "postgres"),
    });
    const guarded = assertTestDatabase(set);
    expect(guarded.database).toBe("ledger_test");
    expect(guarded.app.user).toBe("ledger_app");
    expect(guarded.worker.user).toBe("ledger_worker");
    expect(guarded.migration.user).toBe("postgres");
  });

  it("refuses before constructing any pg client or pool", () => {
    const client = vi.spyOn(pg, "Client");
    const pool = vi.spyOn(pg, "Pool");
    for (const bad of ["ledger_dev", "ledger_test_backup", "ledger_TEST"]) {
      refusal(valid({ appTestUrl: url(bad) }));
    }
    expect(client).not.toHaveBeenCalled();
    expect(pool).not.toHaveBeenCalled();
  });

  it.each([
    ["(a) a database not ending in _test", { appTestUrl: url("ledger_dev"), workerTestUrl: url("ledger_dev"), migrationTestUrl: url("ledger_dev") }, "database-name"],
    ["(b) ledger_test_backup", { appTestUrl: url("ledger_test_backup"), workerTestUrl: url("ledger_test_backup"), migrationTestUrl: url("ledger_test_backup") }, "database-name"],
    ["(c) ledger_TEST (case-sensitive)", { appTestUrl: url("ledger_TEST"), workerTestUrl: url("ledger_TEST"), migrationTestUrl: url("ledger_TEST") }, "database-name"],
    ["(d) a missing database", { appTestUrl: "postgresql://u:p@h", workerTestUrl: "postgresql://u:p@h", migrationTestUrl: "postgresql://u:p@h" }, "incomplete"],
    ["(e) different databases", { workerTestUrl: url("other_test", "", "ledger_worker") }, "differing-databases"],
    ["(f) the same database as LEDGER_APP_DATABASE_URL", { appUrl: url("ledger_test") }, "matches-non-test-database"],
    ["(f) the same database as LEDGER_WORKER_DATABASE_URL", { workerUrl: url("ledger_test", "", "ledger_worker") }, "matches-non-test-database"],
    ["(f) the same database as LEDGER_MIGRATION_DATABASE_URL", { migrationUrl: url("ledger_test", "", "postgres") }, "matches-non-test-database"],
    ["(g) ?host=other", { appTestUrl: url("ledger_test", "?host=other") }, "invalid-url"],
    ["(h) ?user=postgres", { appTestUrl: url("ledger_test", "?user=postgres") }, "invalid-url"],
    ["(i) a socket URL", { appTestUrl: "postgresql://u:pw-secret-1@%2Fvar%2Frun%2Fpostgresql/ledger_test" }, "invalid-url"],
    ["(j) an empty path", { appTestUrl: "postgresql://u:pw-secret-1@127.0.0.1:55432/" }, "incomplete"],
    ["(k) a mysql:// URL", { appTestUrl: "mysql://u:pw-secret-1@127.0.0.1:3306/ledger_test" }, "invalid-url"],
    ["(l) ?options=", { appTestUrl: url("ledger_test", "?options=-c%20search_path%3Dx") }, "invalid-url"],
    ["(o) a test URL with no password", { appTestUrl: "postgresql://ledger_app@127.0.0.1:55432/ledger_test" }, "incomplete"],
    ["(o) a test URL with no user", { appTestUrl: "postgresql://:pw-secret-1@127.0.0.1:55432/ledger_test" }, "incomplete"],
    ["(p) DATABASE_URL naming the test database", { replitDatabaseUrl: "postgresql://postgres:pw-secret-1@helium/ledger_test" }, "matches-non-test-database"],
    ["(p) PGDATABASE naming the test database", { pgDatabase: "ledger_test" }, "matches-non-test-database"],
    ["a missing test URL", { migrationTestUrl: undefined }, "missing"],
    ["an empty test URL", { workerTestUrl: "   " }, "missing"],
  ] as const)("refuses %s", (_label, overrides, rule) => {
    const error = refusal(valid(overrides as Partial<TestDatabaseInputs>));
    expect(error.rule).toBe(rule);
  });

  it("names the variable that failed", () => {
    expect(refusal(valid({ workerTestUrl: url("ledger_dev") })).variable).toBe("LEDGER_WORKER_DATABASE_URL_TEST");
    expect(refusal(valid({ migrationTestUrl: undefined })).variable).toBe("LEDGER_MIGRATION_DATABASE_URL_TEST");
  });

  it("refuses heliumdb (Replit's development database) by name", () => {
    const error = refusal(
      valid({ appTestUrl: url("heliumdb"), workerTestUrl: url("heliumdb"), migrationTestUrl: url("heliumdb") }),
    );
    expect(["database-name", "heliumdb"]).toContain(error.rule);
  });

  it("ignores a DATABASE_URL / PGDATABASE that names another database", () => {
    expect(
      assertTestDatabase(valid({ replitDatabaseUrl: "postgresql://postgres:p@helium/heliumdb", pgDatabase: "heliumdb" })).database,
    ).toBe("ledger_test");
  });
});

describe("readTestDatabaseInputs", () => {
  it("reads the six URLs and Replit's DATABASE_URL / PGDATABASE, from the given environment only", () => {
    const inputs = readTestDatabaseInputs({
      LEDGER_APP_DATABASE_URL_TEST: "a",
      LEDGER_WORKER_DATABASE_URL_TEST: "b",
      LEDGER_MIGRATION_DATABASE_URL_TEST: "c",
      LEDGER_APP_DATABASE_URL: "d",
      DATABASE_URL: "e",
      PGDATABASE: "f",
    });
    expect(inputs).toMatchObject({
      appTestUrl: "a",
      workerTestUrl: "b",
      migrationTestUrl: "c",
      appUrl: "d",
      replitDatabaseUrl: "e",
      pgDatabase: "f",
    });
  });

  it("loads the app folder's .env when given the real environment (Vitest does not load it)", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "ledger-guard-"));
    const name = "LEDGER_APP_DATABASE_URL_TEST";
    const before = process.env[name];
    // On Replit REPL_ID is set and .env is deliberately not read; this test needs it unset.
    const replit = { REPL_ID: process.env.REPL_ID, REPLIT_DEPLOYMENT: process.env.REPLIT_DEPLOYMENT };
    delete process.env.REPL_ID;
    delete process.env.REPLIT_DEPLOYMENT;
    try {
      writeFileSync(path.join(dir, ".env"), `${name}=from-file\n`);
      delete process.env[name];
      expect(readTestDatabaseInputs(process.env, { appDir: dir }).appTestUrl).toBe("from-file");
    } finally {
      if (before === undefined) delete process.env[name];
      else process.env[name] = before;
      for (const [key, saved] of Object.entries(replit)) {
        if (saved === undefined) delete process.env[key];
        else process.env[key] = saved;
      }
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
