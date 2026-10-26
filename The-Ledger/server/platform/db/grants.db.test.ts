import { randomUUID } from "node:crypto";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestPools, type DbPool, type TestPools } from "../testing";

// A smoke test of the grants (spec 3.5) as ledger_app, ledger_worker and the owner. The
// full attack matrix (G0-20 to G0-26, G0-45) is the test engineer's gate suite.

let pools: TestPools;
beforeAll(() => {
  pools = createTestPools();
});
afterAll(async () => {
  await pools.end();
});

const company = randomUUID();

async function sqlstate(pool: DbPool, sql: string, values: unknown[] = []): Promise<string | undefined> {
  try {
    await pool.withClient((client) => client.query(sql, values));
    return undefined;
  } catch (error) {
    return (error as { code?: string }).code;
  }
}

async function insertAudit(client: pg.PoolClient, entryType = "probe_entry"): Promise<string> {
  const result = await client.query(
    `INSERT INTO audit.audit_entries
       (company_id, entry_type, actor_id, actor_role, source_object_type, source_object_id)
     VALUES ($1, $2, $3, 'ceo', 'probe', $4) RETURNING audit_id`,
    [company, entryType, randomUUID(), randomUUID()],
  );
  return result.rows[0].audit_id as string;
}

async function insertOutbox(client: pg.PoolClient): Promise<string> {
  const result = await client.query(
    `INSERT INTO intelligence.event_outbox
       (event_id, event_type, source_module, company_id, source_object_type, source_object_id, payload)
     VALUES ($1, 'ProbeRecorded', 'probe_module', $2, 'probe', $3, '{}'::jsonb) RETURNING event_id`,
    [randomUUID(), company, randomUUID()],
  );
  return result.rows[0].event_id as string;
}

describe("ledger_app and ledger_worker on audit.audit_entries", () => {
  it.each(["app", "worker"] as const)("%s: an explicit-column insert and a select succeed", async (who) => {
    const pool = pools[who];
    const auditId = await pool.withClient((client) => insertAudit(client));
    const read = await pool.withClient((client) =>
      client.query("SELECT sequence_no, occurred_at FROM audit.audit_entries WHERE audit_id = $1", [auditId]),
    );
    expect(read.rows).toHaveLength(1);
    // sequence_no comes from the identity column: no sequence grant is needed
    expect(Number(read.rows[0].sequence_no)).toBeGreaterThan(0);
  });

  it.each(["app", "worker"] as const)(
    "%s: UPDATE, DELETE, TRUNCATE and a backdated insert are refused with 42501",
    async (who) => {
      const pool = pools[who];
      expect(await sqlstate(pool, "UPDATE audit.audit_entries SET entry_type = 'x'")).toBe("42501");
      expect(await sqlstate(pool, "DELETE FROM audit.audit_entries")).toBe("42501");
      expect(await sqlstate(pool, "TRUNCATE audit.audit_entries")).toBe("42501");
      expect(
        await sqlstate(
          pool,
          `INSERT INTO audit.audit_entries
             (company_id, entry_type, actor_role, source_object_type, source_object_id, occurred_at)
           VALUES ($1, 'probe_entry', 'system', 'probe', $2, now())`,
          [company, randomUUID()],
        ),
      ).toBe("42501");
      expect(
        await sqlstate(
          pool,
          `INSERT INTO audit.audit_entries
             (sequence_no, company_id, entry_type, actor_role, source_object_type, source_object_id)
           OVERRIDING SYSTEM VALUE VALUES (1, $1, 'probe_entry', 'system', 'probe', $2)`,
          [company, randomUUID()],
        ),
      ).toBe("42501");
    },
  );

  it("a row breaking a CHECK constraint is refused with 23514", async () => {
    // actor_role 'system' with an actor_id
    expect(
      await sqlstate(
        pools.app,
        `INSERT INTO audit.audit_entries
           (company_id, entry_type, actor_id, actor_role, source_object_type, source_object_id)
         VALUES ($1, 'probe_entry', $2, 'system', 'probe', $3)`,
        [company, randomUUID(), randomUUID()],
      ),
    ).toBe("23514");
  });
});

describe("intelligence.event_outbox and event_log", () => {
  it("the API can insert and read envelope rows but cannot change delivery state", async () => {
    const eventId = await pools.app.withClient((client) => insertOutbox(client));
    expect(
      await sqlstate(pools.app, "UPDATE intelligence.event_outbox SET status = 'delivered' WHERE event_id = $1", [eventId]),
    ).toBe("42501");
    expect(await sqlstate(pools.app, "DELETE FROM intelligence.event_outbox")).toBe("42501");
    expect(
      await sqlstate(
        pools.app,
        `INSERT INTO intelligence.event_outbox
           (event_id, event_type, source_module, company_id, source_object_type, source_object_id, payload, status)
         VALUES ($1, 'ProbeRecorded', 'probe_module', $2, 'probe', $3, '{}'::jsonb, 'delivered')`,
        [randomUUID(), company, randomUUID()],
      ),
    ).toBe("42501");
  });

  it("the worker can change delivery state but not the envelope", async () => {
    const eventId = await pools.app.withClient((client) => insertOutbox(client));
    expect(
      await sqlstate(
        pools.worker,
        "UPDATE intelligence.event_outbox SET retry_count = 1, last_error = 'x' WHERE event_id = $1",
        [eventId],
      ),
    ).toBeUndefined();
    expect(
      await sqlstate(pools.worker, "UPDATE intelligence.event_outbox SET payload = '{}'::jsonb WHERE event_id = $1", [eventId]),
    ).toBe("42501");
    expect(await sqlstate(pools.worker, "DELETE FROM intelligence.event_outbox")).toBe("42501");
  });

  it("only the worker inserts into event_log, columns it copies, and a duplicate is skipped", async () => {
    const eventId = randomUUID();
    const insert = `INSERT INTO intelligence.event_log
        (event_id, event_type, event_version, source_module, company_id, source_object_type, source_object_id, payload, occurred_at)
      VALUES ($1, 'ProbeRecorded', '1.0', 'probe_module', $2, 'probe', $3, '{}'::jsonb, now())
      ON CONFLICT (event_id) DO NOTHING`;
    const values = [eventId, company, randomUUID()];
    expect(await sqlstate(pools.app, insert, values)).toBe("42501");
    expect(await sqlstate(pools.worker, insert, values)).toBeUndefined();
    expect(await sqlstate(pools.worker, insert, values)).toBeUndefined();
    const count = await pools.app.withClient((client) =>
      client.query("SELECT count(*)::int AS n FROM intelligence.event_log WHERE event_id = $1", [eventId]),
    );
    expect(count.rows[0].n).toBe(1);
    expect(await sqlstate(pools.worker, "UPDATE intelligence.event_log SET event_type = 'X'")).toBe("42501");
    expect(await sqlstate(pools.worker, "DELETE FROM intelligence.event_log")).toBe("42501");
    expect(
      await sqlstate(
        pools.worker,
        `INSERT INTO intelligence.event_log
           (event_log_id, event_id, event_type, event_version, source_module, company_id, source_object_type, source_object_id, payload, occurred_at)
         VALUES ($1, $2, 'ProbeRecorded', '1.0', 'probe_module', $3, 'probe', $4, '{}'::jsonb, now())`,
        [randomUUID(), randomUUID(), company, randomUUID()],
      ),
    ).toBe("42501");
  });
});

describe("owner DML is refused by the triggers (R2-09)", () => {
  it("UPDATE, DELETE and TRUNCATE by the owner fail with insufficient_privilege and change nothing", async () => {
    const auditId = await pools.app.withClient((client) => insertAudit(client, "owner_probe"));
    const before = await pools.owner.withClient((client) =>
      client.query("SELECT count(*)::int AS n FROM audit.audit_entries"),
    );
    expect(await sqlstate(pools.owner, "UPDATE audit.audit_entries SET entry_type = 'changed' WHERE audit_id = $1", [auditId])).toBe("42501");
    expect(await sqlstate(pools.owner, "DELETE FROM audit.audit_entries WHERE audit_id = $1", [auditId])).toBe("42501");
    expect(await sqlstate(pools.owner, "TRUNCATE audit.audit_entries")).toBe("42501");
    expect(await sqlstate(pools.owner, "UPDATE intelligence.event_log SET event_type = 'X'")).toBe("42501");
    expect(await sqlstate(pools.owner, "TRUNCATE intelligence.event_log")).toBe("42501");
    const after = await pools.owner.withClient((client) =>
      client.query("SELECT count(*)::int AS n FROM audit.audit_entries"),
    );
    expect(after.rows[0].n).toBe(before.rows[0].n);
  });
});

describe("roles, memberships and PUBLIC defaults (3.5)", () => {
  it("has the specified role attributes and memberships", async () => {
    const roles = await pools.owner.withClient((client) =>
      client.query(
        `SELECT rolname, rolcanlogin, rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls
           FROM pg_roles WHERE rolname IN ('ledger_runtime','ledger_app','ledger_worker') ORDER BY rolname`,
      ),
    );
    expect(roles.rows).toEqual([
      { rolname: "ledger_app", rolcanlogin: true, rolsuper: false, rolcreatedb: false, rolcreaterole: false, rolreplication: false, rolbypassrls: false },
      { rolname: "ledger_runtime", rolcanlogin: false, rolsuper: false, rolcreatedb: false, rolcreaterole: false, rolreplication: false, rolbypassrls: false },
      { rolname: "ledger_worker", rolcanlogin: true, rolsuper: false, rolcreatedb: false, rolcreaterole: false, rolreplication: false, rolbypassrls: false },
    ]);
    const members = await pools.owner.withClient((client) =>
      client.query(
        `SELECT pg_has_role('ledger_app','ledger_worker','MEMBER') AS app_in_worker,
                pg_has_role('ledger_worker','ledger_app','MEMBER') AS worker_in_app`,
      ),
    );
    expect(members.rows[0]).toEqual({ app_in_worker: false, worker_in_app: false });
  });

  it("PUBLIC holds nothing on the platform tables, the schemas or the refuse_change function", async () => {
    const result = await pools.owner.withClient((client) =>
      client.query(
        `SELECT has_table_privilege('public','audit.audit_entries','SELECT') AS t1,
                has_table_privilege('public','intelligence.event_outbox','SELECT') AS t2,
                has_table_privilege('public','intelligence.event_log','SELECT') AS t3,
                has_schema_privilege('public','audit','USAGE') AS s1,
                has_schema_privilege('public','intelligence','USAGE') AS s2,
                has_schema_privilege('public','public','CREATE') AS s3,
                has_function_privilege('public','audit.refuse_change()','EXECUTE') AS f,
                has_database_privilege('public', current_database(), 'CONNECT') AS c,
                has_database_privilege('public', current_database(), 'TEMPORARY') AS tmp`,
      ),
    );
    expect(Object.values(result.rows[0]).every((v) => v === false)).toBe(true);
  });

  it("the runtime roles hold no execute privilege on refuse_change() and no USAGE on drizzle", async () => {
    const result = await pools.owner.withClient((client) =>
      client.query(
        `SELECT has_function_privilege('ledger_app','audit.refuse_change()','EXECUTE') AS a,
                has_function_privilege('ledger_worker','audit.refuse_change()','EXECUTE') AS w,
                has_schema_privilege('ledger_app','drizzle','USAGE') AS da,
                has_schema_privilege('ledger_worker','drizzle','USAGE') AS dw`,
      ),
    );
    expect(result.rows[0]).toEqual({ a: false, w: false, da: false, dw: false });
  });
});
