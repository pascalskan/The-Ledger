import pg from "pg";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createLogger } from "../logging/logger";
import { createRuntimePool, evaluateRoleCheck, RuntimeRoleError } from "./client";

// The acceptance rules of the runtime role self-check (spec 3.5, R2-10, R3-12), without a database.

const good = {
  current_user: "ledger_app",
  current_database: "ledger_test",
  rolsuper: false,
  rolbypassrls: false,
  owns_platform_schema: false,
  member_of: ["ledger_runtime"],
  can_backdate_audit: false,
  can_change_audit: false,
  can_rewrite_envelope: false,
  can_update_outbox: false,
};
const expected = {
  role: "ledger_app",
  database: "ledger_test",
  forbidOutboxUpdate: true,
  testDatabaseOnly: true,
};

describe("evaluateRoleCheck", () => {
  it("accepts the designed API connection", () => {
    expect(evaluateRoleCheck(good, expected)).toBeUndefined();
  });

  it("accepts the worker's connection, which may update the outbox's delivery state", () => {
    const row = { ...good, current_user: "ledger_worker", can_update_outbox: true };
    expect(
      evaluateRoleCheck(row, { ...expected, role: "ledger_worker", forbidOutboxUpdate: false }),
    ).toBeUndefined();
  });

  it.each([
    ["a different role", { current_user: "postgres" }, "unexpected role"],
    ["a superuser", { rolsuper: true }, "is superuser"],
    ["BYPASSRLS", { rolbypassrls: true }, "bypasses row security"],
    ["a schema owner", { owns_platform_schema: true }, "owns platform schema"],
    ["no memberships", { member_of: [] }, "unexpected memberships"],
    ["an extra membership", { member_of: ["gate_extra_x", "ledger_runtime"] }, "unexpected memberships"],
    ["a predefined-role membership", { member_of: ["ledger_runtime", "pg_write_all_data"] }, "unexpected memberships"],
    ["a different group only", { member_of: ["something_else"] }, "unexpected memberships"],
    ["backdating privilege", { can_backdate_audit: true }, "can backdate audit"],
    ["update or delete on audit", { can_change_audit: true }, "can change audit"],
    ["envelope rewrite privilege", { can_rewrite_envelope: true }, "can rewrite envelope"],
    ["outbox update on the API pool", { can_update_outbox: true }, "can update outbox"],
    ["another database", { current_database: "ledger_dev" }, "unexpected database"],
  ])("refuses %s", (_label, change, condition) => {
    expect(evaluateRoleCheck({ ...good, ...change }, expected)).toBe(condition);
  });

  it("under Vitest refuses a database whose name does not end in _test", () => {
    const row = { ...good, current_database: "ledger_dev" };
    expect(evaluateRoleCheck(row, { ...expected, database: "ledger_dev" })).toBe("not a test database");
    expect(
      evaluateRoleCheck(row, { ...expected, database: "ledger_dev", testDatabaseOnly: false }),
    ).toBeUndefined();
  });
});

describe("RuntimeRoleError", () => {
  it("names the failed condition and the role, and nothing else", () => {
    const error = new RuntimeRoleError("owns platform schema", "postgres");
    expect(error.message).toBe("Database connection refused: owns platform schema (role postgres)");
    expect(error.condition).toBe("owns platform schema");
    expect(error.role).toBe("postgres");
  });
});

describe("the check statement failing (no database needed)", () => {
  afterEach(() => vi.restoreAllMocks());

  /** A pool whose only client fails the check statement with the given SQLSTATE. */
  function poolWhoseCheckFails(code: string) {
    const release = vi.fn();
    const client = {
      query: vi.fn().mockRejectedValue(Object.assign(new Error("denied"), { code })),
      // withClient listens for 'error' while a client is checked out
      on: vi.fn(),
      off: vi.fn(),
      release,
    };
    vi.spyOn(pg, "Pool").mockImplementation(function () {
      return { connect: async () => client, on: () => undefined, end: async () => undefined };
    } as unknown as typeof pg.Pool);
    const lines: string[] = [];
    const logger = createLogger({
      service: "api",
      destination: { write: (chunk: string) => void lines.push(chunk) },
    });
    const pool = createRuntimePool({
      settings: {
        host: "127.0.0.1",
        port: 5432,
        user: "ledger_app",
        password: "pw",
        database: "ledger_test",
        ssl: false,
        application_name: "test",
      },
      logger,
      expectedRole: "ledger_app",
    });
    return { pool, release, lines };
  }

  it.each([
    ["42P01", "platform tables missing"],
    ["3F000", "platform tables missing"],
    ["42501", "unexpected memberships"],
  ])("SQLSTATE %s becomes a named refusal, the client is destroyed and the error is logged without secrets", async (code, condition) => {
    const { pool, release, lines } = poolWhoseCheckFails(code);
    const caller = vi.fn();
    await expect(pool.withClient(async () => caller())).rejects.toMatchObject({
      name: "RuntimeRoleError",
      condition,
      role: "ledger_app",
    });
    expect(caller).not.toHaveBeenCalled();
    // release(err) with an error destroys the client instead of returning it to the pool
    expect(release).toHaveBeenCalledTimes(1);
    expect(release.mock.calls[0]![0]).toBeInstanceOf(RuntimeRoleError);
    expect(lines.join(" ")).toContain(condition);
    expect(lines.join(" ")).not.toContain("pw");
  });

  it("any other failure of the check is rethrown as it is, and still destroys the client", async () => {
    const { pool, release } = poolWhoseCheckFails("08006");
    await expect(pool.withClient(async () => 1)).rejects.toMatchObject({ code: "08006" });
    expect(release.mock.calls[0]![0]).toBeInstanceOf(Error);
  });
});
