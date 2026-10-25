import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  buildTypeCatalogue,
  createExecutionContext,
  createLogger,
  createRuntimePool,
  createTestPools,
  createUnitOfWorkRunner,
  testDatabase,
  toCompanyId,
  type TestPools,
  type UnitOfWork,
} from "../testing";

// Review round 2, M2: the transaction handle is a facade, the client behind it exposes only
// `query`, statements that change the transaction or the session are refused, and one
// statement before COMMIT proves the unit is still the same transaction, role and company.

let pools: TestPools;
const company = randomUUID();
const catalogue = buildTypeCatalogue("audit entry type", [{ module: "alpha", types: [{ type: "probe_entry", jobRequired: false }] }]);

beforeAll(async () => {
  pools = createTestPools();
  await pools.owner.withClient(async (client) => {
    await client.query("CREATE SCHEMA IF NOT EXISTS uow_probe");
    await client.query("CREATE TABLE IF NOT EXISTS uow_probe.probe_state (id uuid PRIMARY KEY, company_id uuid NOT NULL, value text)");
    await client.query("GRANT USAGE ON SCHEMA uow_probe TO ledger_runtime");
    await client.query("GRANT SELECT, INSERT ON uow_probe.probe_state TO ledger_runtime");
    // Functions that change the session from INSIDE the database: the statement text shows nothing.
    await client.query(`CREATE OR REPLACE FUNCTION uow_probe.change_company() RETURNS void LANGUAGE sql AS $$ SELECT set_config('app.company_id', 'someone-else', true) $$`);
    await client.query(`CREATE OR REPLACE FUNCTION uow_probe.change_role() RETURNS void LANGUAGE sql AS $$ SELECT set_config('role', 'ledger_runtime', true) $$`);
    await client.query("GRANT EXECUTE ON FUNCTION uow_probe.change_company(), uow_probe.change_role() TO ledger_runtime");
  });
});
afterAll(async () => {
  await pools.end();
});

const alpha = () => createUnitOfWorkRunner({ pool: pools.app, auditCatalogue: catalogue, eventCatalogue: buildTypeCatalogue("event type", []) }).forModule("alpha");
const context = () => createExecutionContext({ companyId: toCompanyId(company), actor: { kind: "user", userId: randomUUID(), role: "ceo" } });
const insertProbe = (uow: UnitOfWork, value: string) =>
  uow.tx.execute(sql`INSERT INTO uow_probe.probe_state (id, company_id, value) VALUES (${randomUUID()}, ${company}, ${value})`);
const persisted = async (value: string) =>
  pools.owner.withClient(async (c) => (await c.query("SELECT 1 FROM uow_probe.probe_state WHERE value = $1", [value])).rowCount);

describe("the transaction handle is an allowlisted facade", () => {
  it("exposes only the builders and execute, and nothing that reaches the connection", async () => {
    await alpha()(context(), async (uow) => {
      const tx = uow.tx as unknown as Record<string, unknown>;
      expect(Object.keys(tx).sort()).toEqual(
        ["$count", "$with", "delete", "execute", "insert", "refreshMaterializedView", "select", "selectDistinct", "selectDistinctOn", "transaction", "update", "with"].sort(),
      );
      for (const hidden of ["_", "$client", "session", "dialect", "query", "constructor_", "relations"]) {
        expect(tx[hidden], hidden).toBeUndefined();
      }
      expect(Object.isFrozen(uow.tx)).toBe(true);
    });
  });
});

describe("the client behind a query builder exposes only query", () => {
  it("has no release, end, password, connectionParameters or connection, and cannot be enumerated", async () => {
    await alpha()(context(), async (uow) => {
      const client = (uow.tx.select() as unknown as { session: { client: Record<string, unknown> } }).session.client;
      for (const hidden of ["release", "end", "password", "connectionParameters", "connection", "user", "host", "database", "ssl", "on", "off", "emit", "processID", "secretKey", "_connected"]) {
        expect(client[hidden], hidden).toBeUndefined();
        expect(hidden in client, `${hidden} in client`).toBe(false);
        expect(Object.getOwnPropertyDescriptor(client, hidden), `descriptor of ${hidden}`).toBeUndefined();
      }
      expect(Object.keys(client)).toEqual([]);
      expect(Reflect.ownKeys(client)).toEqual([]);
      expect(JSON.stringify(client)).toBe("{}");
      expect(Object.getPrototypeOf(client)).not.toBe(pg.Client.prototype);
      expect(client instanceof pg.Client).toBe(false);
      expect(client instanceof pg.Pool).toBe(false);
      expect(() => ((client as unknown as { password: string }).password = "x")).toThrow(TypeError);
      // it still runs ordinary statements for the builders
      const result = (await (client.query as (q: string) => Promise<{ rows: unknown[] }>)("SELECT 1 AS one")).rows[0];
      expect(result).toEqual({ one: 1 });
    });
  });

  it("calling release on it is impossible, so the connection cannot be handed to another request mid-unit", async () => {
    await alpha()(context(), async (uow) => {
      const client = (uow.tx.select() as unknown as { session: { client: { release?: () => void } } }).session.client;
      expect(() => client.release!()).toThrow(TypeError);
    });
    // the pool is intact and the next unit works
    await expect(alpha()(context(), async (uow) => (await uow.tx.execute(sql`SELECT 1 AS one`)).rows[0])).resolves.toEqual({ one: 1 });
  });
});

describe("statements that change the transaction or session are refused (with the unit poisoned)", () => {
  const forbidden = [
    "COMMIT", "commit", "  /* hello */ Commit ", "-- note\nCOMMIT", "END", "ABORT", "ROLLBACK", "BEGIN", "START TRANSACTION",
    "SAVEPOINT a", "RELEASE SAVEPOINT a", "SET ROLE postgres", "SET LOCAL app.company_id = 'x'", "SET SESSION AUTHORIZATION postgres",
    "RESET ROLE", "RESET ALL", "DISCARD ALL", "SELECT set_config('app.company_id', 'x', true)", "select SET_CONFIG ( 'role', 'postgres', true )",
    "SELECT 1; COMMIT", "SELECT 1;\nSET ROLE postgres", "DO $$ BEGIN PERFORM 1; END $$", "CALL some_proc()", "PREPARE t AS SELECT 1",
    "EXECUTE t", "DEALLOCATE t", "LOAD 'x'",
  ];

  it.each(forbidden)("tx.execute(%j) throws UnitOfWorkIntegrityError before it is sent", async (statement) => {
    const marker = randomUUID();
    await expect(
      alpha()(context(), async (uow) => {
        await insertProbe(uow, marker);
        await uow.tx.execute(sql.raw(statement));
      }),
    ).rejects.toMatchObject({ name: "UnitOfWorkIntegrityError" });
    expect(await persisted(marker)).toBe(0);
  });

  it.each(["COMMIT", "SET ROLE postgres", "SELECT set_config('role','postgres',true)", "ROLLBACK"])(
    "the same through the client behind a query builder: %s",
    async (statement) => {
      const marker = randomUUID();
      await expect(
        alpha()(context(), async (uow) => {
          await insertProbe(uow, marker);
          const client = (uow.tx.select() as unknown as { session: { client: { query(q: string): Promise<unknown> } } }).session.client;
          await client.query(statement);
        }),
      ).rejects.toMatchObject({ name: "UnitOfWorkIntegrityError" });
      expect(await persisted(marker)).toBe(0);
    },
  );

  it("review probe 5: a raw COMMIT, then a failing audit write - nothing persists", async () => {
    const marker = randomUUID();
    await expect(
      alpha()(context(), async (uow) => {
        await insertProbe(uow, marker);
        await uow.tx.execute(sql.raw("COMMIT")).catch(() => undefined); // refused, and swallowed
        await uow.audit.append({ entryType: "NOT VALID" } as never).catch(() => undefined);
      }),
    ).rejects.toBeDefined();
    expect(await persisted(marker)).toBe(0);
  });

  it("a refusal that the work swallows still stops the commit", async () => {
    const marker = randomUUID();
    await expect(
      alpha()(context(), async (uow) => {
        await insertProbe(uow, marker);
        await uow.tx.execute(sql.raw("SET ROLE postgres")).catch(() => undefined);
      }),
    ).rejects.toMatchObject({ name: "UnitOfWorkIntegrityError" });
    expect(await persisted(marker)).toBe(0);
  });

  it("ordinary statements still pass: selects, inserts, CTEs, and the words in strings or comments", async () => {
    const marker = randomUUID();
    await alpha()(context(), async (uow) => {
      await insertProbe(uow, marker);
      await uow.tx.execute(sql`INSERT INTO uow_probe.probe_state (id, company_id, value) VALUES (${randomUUID()}, ${company}, 'x') ON CONFLICT (id) DO NOTHING`);
      await uow.tx.execute(sql`WITH x AS (SELECT 1 AS n) SELECT n FROM x`);
      await uow.tx.execute(sql`SELECT 'COMMIT; SET ROLE x' AS text -- commit and set_config( in a comment`);
      await uow.tx.execute(sql`/* BEGIN COMMIT */ SELECT $$ROLLBACK$$ AS text`);
    });
    expect(await persisted(marker)).toBe(1);
  });
});

describe("the pre-COMMIT integrity check catches what the text check cannot see", () => {
  function makeRunner() {
    const lines: string[] = [];
    const logger = createLogger({ service: "api", level: "debug", destination: { write: (c: string) => void lines.push(c) } });
    const pool = createRuntimePool({ settings: testDatabase().app, logger, expectedRole: "ledger_app", max: 1 });
    const run = createUnitOfWorkRunner({ pool, auditCatalogue: catalogue, eventCatalogue: buildTypeCatalogue("event type", []), logger }).forModule("alpha");
    return { pool, run, records: () => lines.map((l) => JSON.parse(l) as Record<string, any>) };
  }

  const pidOf = async (uow: UnitOfWork) => (await uow.tx.execute(sql`SELECT pg_backend_pid() AS pid`)).rows[0]!.pid as number;

  it.each([
    ["a function that changes the company setting", "uow_probe.change_company()", "the company setting changed"],
    ["a function that changes the session role", "uow_probe.change_role()", "the database role changed"],
  ])("%s: the unit rolls back, the connection is destroyed, UnitOfWorkIntegrityError is raised and logged at ERROR", async (_label, call, condition) => {
    const { pool, run, records } = makeRunner();
    try {
      const marker = randomUUID();
      let before = 0;
      await expect(
        run(context(), async (uow) => {
          before = await pidOf(uow);
          await insertProbe(uow, marker);
          await uow.tx.execute(sql.raw(`SELECT ${call}`));
        }),
      ).rejects.toMatchObject({ name: "UnitOfWorkIntegrityError", message: expect.stringContaining(condition) });
      expect(await persisted(marker)).toBe(0);
      expect(records().find((r) => r.level === "ERROR" && r.condition === condition)).toMatchObject({ module: "alpha" });
      // the connection was destroyed, not returned to the pool: the next unit runs on a new backend
      const after = await run(context(), (uow) => pidOf(uow));
      expect(after).not.toBe(before);
    } finally {
      await pool.end();
    }
  });

  it("a normal unit passes the check and commits, with exactly one extra statement", async () => {
    const { pool, run } = makeRunner();
    try {
      const marker = randomUUID();
      await run(context(), (uow) => insertProbe(uow, marker));
      expect(await persisted(marker)).toBe(1);
    } finally {
      await pool.end();
    }
  });
});
