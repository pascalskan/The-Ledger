import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { pgSchema, text, uuid } from "drizzle-orm/pg-core";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  adoptUnit,
  buildTypeCatalogue,
  createExecutionContext,
  createSystemContext,
  createTestPools,
  createUnitOfWorkRunner,
  expireContext,
  installDefaultRunner,
  resetDefaultRunnerForTests,
  runInTransactionAs,
  tenantValues,
  tenantWhere,
  toCompanyId,
  type DbPool,
  type TestPools,
  type UnitOfWork,
  type UnitOfWorkRunner,
} from "../testing";

// The Unit of Work, AuditWriter and OutboxWriter against the local mirror's test database
// (spec §4.4, PS-12 to PS-14). The full attack matrix (G0-03 to G0-08, G0-18, G0-19) is the
// test engineer's gate suite; these are the implementer's own tests.

const probeSchema = pgSchema("uow_probe");
const probeState = probeSchema.table("probe_state", {
  id: uuid("id").primaryKey(),
  companyId: uuid("company_id").notNull(),
  value: text("value"),
});

const auditCatalogue = buildTypeCatalogue("audit entry type", [
  {
    module: "alpha",
    types: [
      { type: "probe_entry", jobRequired: false },
      { type: "probe_job_entry", jobRequired: true },
    ],
  },
  { module: "beta", types: [{ type: "beta_entry", jobRequired: false }] },
]);
const eventCatalogue = buildTypeCatalogue("event type", [
  {
    module: "alpha",
    types: [
      { type: "ProbeRecorded", jobRequired: false },
      { type: "ProbeJobRecorded", jobRequired: true },
    ],
  },
  { module: "beta", types: [{ type: "BetaRecorded", jobRequired: false }] },
]);

let pools: TestPools;
let runner: UnitOfWorkRunner;
const companyA = randomUUID();
const companyB = randomUUID();
const userA = randomUUID();

function userContext(companyId = companyA, userId = userA, extra: { requestId?: string } = {}) {
  return createExecutionContext({
    companyId: toCompanyId(companyId),
    actor: { kind: "user", userId, role: "ceo" },
    ...extra,
  });
}

beforeAll(async () => {
  pools = createTestPools();
  runner = createUnitOfWorkRunner({ pool: pools.app, auditCatalogue, eventCatalogue });
  await pools.owner.withClient(async (client) => {
    await client.query("CREATE SCHEMA IF NOT EXISTS uow_probe");
    await client.query(
      "CREATE TABLE IF NOT EXISTS uow_probe.probe_state (id uuid PRIMARY KEY, company_id uuid NOT NULL, value text)",
    );
    await client.query("GRANT USAGE ON SCHEMA uow_probe TO ledger_runtime");
    await client.query("GRANT SELECT, INSERT ON uow_probe.probe_state TO ledger_runtime");
  });
});
afterAll(async () => {
  await pools.end();
});

const alpha = () => runner.forModule("alpha");

async function insertProbe(uow: UnitOfWork, value = "v"): Promise<string> {
  const id = randomUUID();
  await uow.tx.insert(probeState).values(tenantValues(probeState, uow.context, { id, value }));
  return id;
}

async function probeExists(id: string): Promise<boolean> {
  return pools.owner.withClient(
    async (client) =>
      (await client.query("SELECT 1 FROM uow_probe.probe_state WHERE id = $1", [id])).rowCount === 1,
  );
}

const validEntry = () => ({
  entryType: "probe_entry",
  sourceObjectType: "probe",
  sourceObjectId: randomUUID(),
});
const validEvent = () => ({
  eventType: "ProbeRecorded",
  sourceObjectType: "probe",
  sourceObjectId: randomUUID(),
  payload: { id: "x" },
});

/** Wraps a pool so every statement, and every connection checkout, is recorded. */
function loggingPool(base: DbPool) {
  const statements: string[] = [];
  const checkouts = { count: 0 };
  const pool: DbPool = {
    role: base.role,
    end: () => base.end(),
    withClient: (fn) => {
      checkouts.count++;
      return base.withClient((client) =>
        fn(
          new Proxy(client, {
            get(target, property) {
              if (property === "query") {
                return (...args: unknown[]) => {
                  const first = args[0];
                  statements.push(typeof first === "string" ? first : String((first as { text?: string }).text));
                  return (target.query as (...a: unknown[]) => unknown)(...args);
                };
              }
              const value = Reflect.get(target, property, target) as unknown;
              return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(target) : value;
            },
          }) as pg.PoolClient,
        ),
      );
    },
  };
  return { pool, statements, checkouts };
}

describe("commit", () => {
  it("writes the state change, the audit entry and the event in one transaction", async () => {
    const requestId = randomUUID();
    const ctx = userContext(companyA, userA, { requestId });
    const jobId = randomUUID();
    const result = await alpha()(ctx, async (uow) => {
      const id = await insertProbe(uow);
      const auditId = await uow.audit.append({
        ...validEntry(),
        jobId,
        previousValue: { a: 1 },
        newValue: { a: 2 },
        externalReference: "ref-1",
        metadata: { note: "n", requestId: "caller-supplied" },
      });
      const eventId = await uow.events.record({ ...validEvent(), jobId });
      return { id, auditId, eventId };
    });
    expect(await probeExists(result.id)).toBe(true);

    const audit = await pools.owner.withClient(
      async (c) => (await c.query("SELECT * FROM audit.audit_entries WHERE audit_id = $1", [result.auditId])).rows[0],
    );
    expect(audit).toMatchObject({
      company_id: companyA,
      entry_type: "probe_entry",
      actor_id: userA,
      actor_role: "ceo",
      job_id: jobId,
      previous_value: { a: 1 },
      new_value: { a: 2 },
      external_reference: "ref-1",
      causation_event_id: null,
      causation_actor_id: null,
      // the context's requestId wins over the caller's
      metadata: { note: "n", requestId },
    });
    expect(audit.occurred_at).toBeInstanceOf(Date);
    expect(Number(audit.sequence_no)).toBeGreaterThan(0);

    const outbox = await pools.owner.withClient(
      async (c) => (await c.query("SELECT * FROM intelligence.event_outbox WHERE event_id = $1", [result.eventId])).rows[0],
    );
    expect(outbox).toMatchObject({
      event_type: "ProbeRecorded",
      event_version: "1.0",
      source_module: "alpha",
      company_id: companyA,
      actor_id: userA,
      job_id: jobId,
      status: "pending",
      retry_count: 0,
      causation_event_id: null,
      causation_actor_id: null,
      payload: { id: "x" },
    });
  });

  it("stores a top-level null previous/new value as SQL NULL, but keeps a null member inside an object", async () => {
    const [nullId, objectId] = await alpha()(userContext(), async (uow) => [
      await uow.audit.append({ ...validEntry(), previousValue: null, newValue: null }),
      await uow.audit.append({
        ...validEntry(),
        previousValue: { address: "1 High Street", phone: "01234" },
        newValue: { address: null, phone: "01234" },
      }),
    ]);
    const rows = await pools.owner.withClient(
      async (c) =>
        (
          await c.query(
            "SELECT audit_id, previous_value, new_value, previous_value IS NULL AS prev_is_null, new_value IS NULL AS new_is_null FROM audit.audit_entries WHERE audit_id = ANY($1)",
            [[nullId, objectId]],
          )
        ).rows,
    );
    const byId = Object.fromEntries(rows.map((r) => [r.audit_id, r]));
    // "the value was null" and "no value given" are stored alike: SQL NULL
    expect(byId[nullId!]).toMatchObject({ prev_is_null: true, new_is_null: true });
    // a value cleared inside an object stays a JSON null member
    expect(byId[objectId!].previous_value).toEqual({ address: "1 High Street", phone: "01234" });
    expect(byId[objectId!].new_value).toEqual({ address: null, phone: "01234" });
    expect(byId[objectId!].new_is_null).toBe(false);
    expect(Object.keys(byId[objectId!].new_value)).toContain("address");
  });

  it("returns the work's value, and the audit actor columns follow the actor kind", async () => {
    const portal = createExecutionContext({
      companyId: toCompanyId(companyA),
      actor: { kind: "portal_user", portalAccountId: randomUUID(), clientId: randomUUID(), role: "client" },
    });
    const system = createSystemContext(companyA, "script");
    const roles: string[] = [];
    for (const ctx of [portal, system]) {
      const id = await alpha()(ctx, (uow) => uow.audit.append(validEntry()));
      const row = await pools.owner.withClient(
        async (c) => (await c.query("SELECT actor_id, actor_role FROM audit.audit_entries WHERE audit_id = $1", [id])).rows[0],
      );
      roles.push(`${row.actor_role}:${row.actor_id === null ? "null" : "id"}`);
    }
    expect(roles).toEqual(["client:id", "system:null"]);
  });

  it("sets app.company_id for the transaction only", async () => {
    const inside = await alpha()(userContext(companyB), async (uow) => {
      const result = await uow.tx.execute(sql`SELECT current_setting('app.company_id', true) AS v`);
      return result.rows[0]!.v as string;
    });
    expect(inside).toBe(companyB);
    const outside = await pools.app.withClient(
      async (c) => (await c.query("SELECT current_setting('app.company_id', true) AS v")).rows[0].v,
    );
    expect(outside === null || outside === "").toBe(true);
  });
});

describe("rollback", () => {
  it("rethrows an error from the work unchanged and leaves nothing behind", async () => {
    const failure = new Error("boom");
    let id = "";
    await expect(
      alpha()(userContext(), async (uow) => {
        id = await insertProbe(uow);
        await uow.audit.append(validEntry());
        await uow.events.record(validEvent());
        throw failure;
      }),
    ).rejects.toBe(failure);
    expect(await probeExists(id)).toBe(false);
  });

  it("a real database failure of the audit insert (INSERT revoked) rolls everything back (G0-03)", async () => {
    let id = "";
    await withAuditInsertRevoked(async () => {
      await expect(
        alpha()(userContext(), async (uow) => {
          id = await insertProbe(uow);
          await uow.events.record(validEvent());
          await uow.audit.append(validEntry());
        }),
      ).rejects.toMatchObject({ code: "42501" });
    });
    expect(await probeExists(id)).toBe(false);
  });

  it("a caught audit failure still rolls back, and rejects with AuditWriteFailedError whose cause is the 42501 (G0-04)", async () => {
    let id = "";
    await withAuditInsertRevoked(async () => {
      await expect(
        alpha()(userContext(), async (uow) => {
          id = await insertProbe(uow);
          await uow.events.record(validEvent());
          await uow.audit.append(validEntry()).catch(() => undefined);
        }),
      ).rejects.toMatchObject({ name: "AuditWriteFailedError", cause: { code: "42501" } });
    });
    expect(await probeExists(id)).toBe(false);
    const events = await pools.owner.withClient(
      async (c) => (await c.query("SELECT count(*)::int AS n FROM intelligence.event_outbox WHERE company_id = $1 AND payload = '{\"id\":\"x\"}'", [randomUUID()])).rows[0].n,
    );
    expect(events).toBe(0);
  });

  it("a caught database error in a repository statement cannot commit either", async () => {
    let id = "";
    await expect(
      alpha()(userContext(), async (uow) => {
        id = await insertProbe(uow);
        await uow.tx
          .execute(sql`INSERT INTO uow_probe.probe_state (id, company_id) VALUES (${id}, ${companyA})`)
          .catch(() => undefined);
      }),
    ).rejects.toMatchObject({ name: "UnitOfWorkAbortedError" });
    expect(await probeExists(id)).toBe(false);
  });

  it("the connection is reusable after any failure (pool of one)", async () => {
    const single = createUnitOfWorkRunner({
      pool: (await import("../testing")).createRuntimePool({
        settings: (await import("../testing")).testDatabase().app,
        logger: (await import("../testing")).createLogger({ service: "api", level: "fatal" }),
        expectedRole: "ledger_app",
        max: 1,
      }),
      auditCatalogue,
      eventCatalogue,
    });
    const run = single.forModule("alpha");
    for (let i = 0; i < 3; i++) {
      await expect(run(userContext(), async () => { throw new Error("x"); })).rejects.toThrow("x");
      await expect(run(userContext(), (uow) => uow.audit.append({ entryType: "NOPE" } as never))).rejects.toThrow();
      await expect(run(userContext(), async (uow) => (await uow.tx.execute(sql`SELECT 1 AS one`)).rows[0]!.one)).resolves.toBe(1);
    }
  });
});

/** The owner temporarily revokes INSERT on the audit table from ledger_runtime, and restores it. */
async function withAuditInsertRevoked(run: () => Promise<void>): Promise<void> {
  const columns = `company_id, entry_type, actor_id, actor_role, source_object_type, source_object_id,
    destination_object_type, destination_object_id, job_id, site_id, client_id,
    previous_value, new_value, external_reference, metadata, causation_event_id, causation_actor_id`;
  await pools.owner.withClient((c) => c.query("REVOKE INSERT ON audit.audit_entries FROM ledger_runtime"));
  try {
    await run();
  } finally {
    await pools.owner.withClient((c) => c.query(`GRANT INSERT (${columns}) ON audit.audit_entries TO ledger_runtime`));
  }
}

describe("poisoning: validation and catalogue failures (G0-05)", () => {
  const cases: [string, (uow: UnitOfWork) => Promise<unknown>][] = [
    ["an entry type with spaces", (u) => u.audit.append({ ...validEntry(), entryType: "Timesheet Approved" })],
    ["a destination type without an ID", (u) => u.audit.append({ ...validEntry(), destinationObjectType: "x" })],
    ["a non-serialisable value", (u) => u.audit.append({ ...validEntry(), newValue: (() => 1) as never })],
    ["a bigint value", (u) => u.audit.append({ ...validEntry(), newValue: 10n as never })],
    ["an unregistered entry type", (u) => u.audit.append({ ...validEntry(), entryType: "not_in_any_catalogue" })],
    ["a jobRequired type without a jobId", (u) => u.audit.append({ ...validEntry(), entryType: "probe_job_entry" })],
    ["a 65 KB newValue", (u) => u.audit.append({ ...validEntry(), newValue: { big: "x".repeat(65 * 1024) } })],
    ["an unknown key actorRole", (u) => u.audit.append({ ...validEntry(), actorRole: "ceo" } as never)],
    ["an unknown key companyId", (u) => u.audit.append({ ...validEntry(), companyId: randomUUID() } as never)],
    ["an unknown key occurredAt", (u) => u.audit.append({ ...validEntry(), occurredAt: "2020-01-01" } as never)],
    ["causation keys", (u) => u.audit.append({ ...validEntry(), causationEventId: randomUUID() } as never)],
    ["another module's entry type", (u) => u.audit.append({ ...validEntry(), entryType: "beta_entry" })],
    ["an unregistered event type", (u) => u.events.record({ ...validEvent(), eventType: "NotRegistered" })],
    ["another module's event type", (u) => u.events.record({ ...validEvent(), eventType: "BetaRecorded" })],
    ["a jobRequired event without a jobId", (u) => u.events.record({ ...validEvent(), eventType: "ProbeJobRecorded" })],
    ["an event with sourceModule", (u) => u.events.record({ ...validEvent(), sourceModule: "beta" } as never)],
    ["an event with an array payload", (u) => u.events.record({ ...validEvent(), payload: [] as never })],
    ["an oversized event payload", (u) => u.events.record({ ...validEvent(), payload: { big: "x".repeat(65 * 1024) } })],
    ["an event with causation keys", (u) => u.events.record({ ...validEvent(), causationActorId: randomUUID() } as never)],
  ];

  it.each(cases)("%s: rejects, and when swallowed the unit still cannot commit", async (_label, attempt) => {
    let id = "";
    await expect(
      alpha()(userContext(), async (uow) => {
        id = await insertProbe(uow);
        await attempt(uow);
      }),
    ).rejects.toThrow();
    expect(await probeExists(id)).toBe(false);

    id = "";
    await expect(
      alpha()(userContext(), async (uow) => {
        id = await insertProbe(uow);
        await attempt(uow).catch(() => undefined);
      }),
    ).rejects.toThrow(/rolled back because/);
    expect(await probeExists(id)).toBe(false);
  });

  it("a jobRequired type WITH a jobId succeeds", async () => {
    const jobId = randomUUID();
    await expect(
      alpha()(userContext(), async (uow) => {
        await uow.audit.append({ ...validEntry(), entryType: "probe_job_entry", jobId });
        await uow.events.record({ ...validEvent(), eventType: "ProbeJobRecorded", jobId });
      }),
    ).resolves.toBeUndefined();
  });

  it("catalogue failures are typed errors", async () => {
    const errors: string[] = [];
    for (const attempt of [
      (uow: UnitOfWork) => uow.audit.append({ ...validEntry(), entryType: "unknown_type" }),
      (uow: UnitOfWork) => uow.events.record({ ...validEvent(), eventType: "UnknownType" }),
    ]) {
      await alpha()(userContext(), async (uow) => {
        await attempt(uow).catch((e: Error) => errors.push(e.name));
      }).catch(() => undefined);
    }
    expect(errors).toEqual(["AuditEntryTypeError", "EventTypeError"]);
  });

  it("after a failure, further writes in the same unit are refused", async () => {
    const names: string[] = [];
    await alpha()(userContext(), async (uow) => {
      await uow.audit.append({ ...validEntry(), entryType: "unknown_type" }).catch(() => undefined);
      await uow.audit.append(validEntry()).catch((e: Error) => names.push(e.name));
      await uow.events.record(validEvent()).catch((e: Error) => names.push(e.name));
    }).catch(() => undefined);
    expect(names).toEqual(["AuditWriteFailedError", "OutboxWriteFailedError"]);
  });
});

describe("closed units (G0-06)", () => {
  it("append, record and tx throw UnitOfWorkClosedError after commit and after rollback, and write nothing", async () => {
    let committed!: UnitOfWork;
    await alpha()(userContext(), async (uow) => {
      committed = uow;
    });
    let rolledBack!: UnitOfWork;
    await alpha()(userContext(), async (uow) => {
      rolledBack = uow;
      throw new Error("x");
    }).catch(() => undefined);

    const marker = randomUUID();
    for (const uow of [committed, rolledBack]) {
      await expect(uow.audit.append({ ...validEntry(), sourceObjectId: marker })).rejects.toMatchObject({ name: "UnitOfWorkClosedError" });
      await expect(uow.events.record({ ...validEvent(), sourceObjectId: marker })).rejects.toMatchObject({ name: "UnitOfWorkClosedError" });
      expect(() => uow.tx.select()).toThrow(expect.objectContaining({ name: "UnitOfWorkClosedError" }));
    }
    const rows = await pools.owner.withClient(async (c) =>
      (await c.query("SELECT (SELECT count(*) FROM audit.audit_entries WHERE source_object_id = $1)::int AS a, (SELECT count(*) FROM intelligence.event_outbox WHERE source_object_id = $1)::int AS e", [marker])).rows[0],
    );
    expect(rows).toEqual({ a: 0, e: 0 });
  });

  it("a query builder created inside the unit cannot run once the unit is closed", async () => {
    let builder: PromiseLike<unknown> | undefined;
    await alpha()(userContext(), async (uow) => {
      builder = uow.tx.select().from(probeState);
    });
    await expect(Promise.resolve(builder)).rejects.toMatchObject({ name: "UnitOfWorkClosedError" });
  });
});

describe("no nesting, no savepoints (G0-07)", () => {
  it("(a) runInTransaction inside a unit throws NestedUnitOfWorkError", async () => {
    await expect(
      alpha()(userContext(), async () => {
        await alpha()(userContext(), async () => undefined);
      }),
    ).rejects.toMatchObject({ name: "NestedUnitOfWorkError" });
  });

  it("(b) tx.transaction() rejects with NestedUnitOfWorkError and no savepoint is issued", async () => {
    const { pool, statements } = loggingPool(pools.app);
    const logged = createUnitOfWorkRunner({ pool, auditCatalogue, eventCatalogue }).forModule("alpha");
    await expect(
      logged(userContext(), async (uow) => {
        await uow.tx.transaction(async () => undefined);
      }),
    ).rejects.toMatchObject({ name: "NestedUnitOfWorkError" });
    expect(statements.some((s) => /savepoint/i.test(s))).toBe(false);
  });

  it("(c) swallowing both the savepoint attempt and a failed audit write still rolls back", async () => {
    let id = "";
    await expect(
      alpha()(userContext(), async (uow) => {
        await uow.tx.transaction(async () => undefined).catch(() => undefined);
        id = await insertProbe(uow);
        await uow.audit.append({ entryType: "BAD" } as never).catch(() => undefined);
      }),
    ).rejects.toThrow(/rolled back because/);
    expect(await probeExists(id)).toBe(false);
  });

  it("a unit may be opened again once the previous one has closed, even from inside its callbacks' async context", async () => {
    let later: (() => Promise<unknown>) | undefined;
    await alpha()(userContext(), async () => {
      later = () => alpha()(userContext(), async () => "second");
    });
    await expect(later!()).resolves.toBe("second");
  });

  it("uses exactly one transaction: BEGIN, set_config, the work, COMMIT", async () => {
    const { pool, statements } = loggingPool(pools.app);
    await createUnitOfWorkRunner({ pool, auditCatalogue, eventCatalogue }).forModule("alpha")(userContext(), (uow) => uow.audit.append(validEntry()));
    const kinds = statements.map((s) => s.trim().split(/\s+/)[0]!.toUpperCase());
    expect(kinds).toEqual(["BEGIN", "SELECT", "INSERT", "COMMIT"]);
    expect(statements[0]).toContain("READ COMMITTED");
    expect(statements[1]).toContain("set_config('app.company_id'");
  });
});

describe("contexts are checked before any SQL (G0-08)", () => {
  const genuine = () => userContext();

  it.each([
    ["undefined", undefined],
    ["null", null],
    ["a literal with no company", { companyId: undefined, actor: { kind: "system", component: "x" }, causation: null }],
    ["an empty company", { companyId: "", actor: { kind: "system", component: "x" }, causation: null }],
    ["a non-UUID company", { companyId: "not-a-uuid", actor: { kind: "system", component: "x" }, causation: null }],
  ])("%s: MissingTenantContextError, with no connection checked out", async (_label, bad) => {
    const { pool, statements, checkouts } = loggingPool(pools.app);
    const logged = createUnitOfWorkRunner({ pool, auditCatalogue, eventCatalogue }).forModule("alpha");
    await expect(logged(bad as never, async () => undefined)).rejects.toMatchObject({ name: "MissingTenantContextError" });
    expect(checkouts.count).toBe(0);
    expect(statements).toEqual([]);
  });

  it("an object literal shaped like a context, and every copy of a genuine one, is a ForgedContextError", async () => {
    const real = genuine();
    const candidates: unknown[] = [
      { companyId: companyA, actor: { kind: "system", component: "x" }, causation: null },
      { ...real },
      Object.assign({}, real),
      structuredClone(real),
      { ...real, companyId: companyB },
      { ...real, actor: { kind: "user", userId: userA, role: "ceo" } },
      { ...real, causation: { eventId: randomUUID() } },
      Object.create(real),
    ];
    const { pool, statements, checkouts } = loggingPool(pools.app);
    const logged = createUnitOfWorkRunner({ pool, auditCatalogue, eventCatalogue }).forModule("alpha");
    for (const candidate of candidates) {
      await expect(logged(candidate as never, async () => undefined)).rejects.toMatchObject({ name: "ForgedContextError" });
    }
    expect(checkouts.count).toBe(0);
    expect(statements).toEqual([]);
  });

  it("a genuine context is frozen: assignments throw TypeError and change nothing", () => {
    const real = genuine();
    "use strict";
    expect(() => { (real as { companyId: string }).companyId = companyB; }).toThrow(TypeError);
    expect(() => { (real.actor as { role: string }).role = "worker"; }).toThrow(TypeError);
    expect(real.companyId).toBe(companyA);
    expect(Object.isFrozen(real) && Object.isFrozen(real.actor)).toBe(true);
  });

  it("an expired context is refused with ContextExpiredError before any SQL", async () => {
    const ctx = genuine();
    expireContext(ctx);
    const { pool, checkouts } = loggingPool(pools.app);
    const logged = createUnitOfWorkRunner({ pool, auditCatalogue, eventCatalogue }).forModule("alpha");
    await expect(logged(ctx, async () => undefined)).rejects.toMatchObject({ name: "ContextExpiredError" });
    expect(checkouts.count).toBe(0);
  });

  it("a context can be marked to die with its unit (subscriber contexts)", async () => {
    const ctx = genuine();
    await runner.run("alpha", ctx, async () => undefined, { expireContextWhenClosed: true });
    await expect(alpha()(ctx, async () => undefined)).rejects.toMatchObject({ name: "ContextExpiredError" });
  });
});

describe("causation (spec 4.1, R2-02)", () => {
  it("fills causation_event_id and causation_actor_id from the context, and module code sees only the event", async () => {
    const human = randomUUID();
    const eventId = randomUUID();
    const ctx = createExecutionContext({
      companyId: toCompanyId(companyA),
      actor: { kind: "system", component: "alpha.subscriber" },
      causation: { eventId, humanActorId: human },
      runId: randomUUID(),
    });
    expect(Object.keys(ctx.causation!)).toEqual(["eventId"]);
    expect(Reflect.ownKeys(ctx.causation!)).toEqual(["eventId"]);
    expect(JSON.stringify(ctx)).not.toContain(human);

    const ids = await alpha()(ctx, async (uow) => ({
      audit: await uow.audit.append(validEntry()),
      event: await uow.events.record(validEvent()),
    }));
    const audit = await pools.owner.withClient(async (c) => (await c.query("SELECT * FROM audit.audit_entries WHERE audit_id = $1", [ids.audit])).rows[0]);
    expect(audit).toMatchObject({
      actor_role: "system",
      actor_id: null,
      causation_event_id: eventId,
      causation_actor_id: human,
      metadata: { runId: ctx.runId },
    });
    const outbox = await pools.owner.withClient(async (c) => (await c.query("SELECT * FROM intelligence.event_outbox WHERE event_id = $1", [ids.event])).rows[0]);
    expect(outbox).toMatchObject({ actor_id: null, causation_event_id: eventId, causation_actor_id: human });
  });

  it("only system work can carry causation", () => {
    expect(() =>
      createExecutionContext({
        companyId: toCompanyId(companyA),
        actor: { kind: "user", userId: userA, role: "ceo" },
        causation: { eventId: randomUUID(), humanActorId: null },
      }),
    ).toThrow(/causation/i);
  });

  it("the database refuses causation on a human actor or without an event (G0-19e)", async () => {
    const code = (sql: string, values: unknown[]) =>
      pools.app.withClient((c) => c.query(sql, values)).then(
        () => "ok",
        (e: { code?: string }) => e.code,
      );
    const auditSql = `INSERT INTO audit.audit_entries
      (company_id, entry_type, actor_id, actor_role, source_object_type, source_object_id, causation_event_id, causation_actor_id)
      VALUES ($1, 'probe_entry', $2, $3, 'probe', $4, $5, $6)`;
    // a human actor with a causing event
    expect(await code(auditSql, [companyA, userA, "ceo", randomUUID(), randomUUID(), null])).toBe("23514");
    // a causing actor without a causing event
    expect(await code(auditSql, [companyA, null, "system", randomUUID(), null, randomUUID()])).toBe("23514");
    // an outbox row with a causing event and a non-null actor
    expect(
      await code(
        `INSERT INTO intelligence.event_outbox
           (event_id, event_type, source_module, company_id, actor_id, source_object_type, source_object_id, payload, causation_event_id)
         VALUES ($1, 'ProbeRecorded', 'alpha', $2, $3, 'probe', $4, '{}'::jsonb, $5)`,
        [randomUUID(), companyA, userA, randomUUID(), randomUUID()],
      ),
    ).toBe("23514");
  });
});

describe("modules own their types (R3-10)", () => {
  it("a unit bound to beta cannot write alpha's types; adopt gives a view bound to another module", async () => {
    const beta = runner.forModule("beta");
    await expect(beta(userContext(), (uow) => uow.audit.append(validEntry()))).rejects.toMatchObject({ name: "AuditEntryTypeError" });
    await expect(
      beta(userContext(), async (uow) => {
        const asAlpha = adoptUnit(uow, "alpha");
        expect(asAlpha.context).toBe(uow.context);
        await asAlpha.audit.append(validEntry());
        await uow.audit.append({ ...validEntry(), entryType: "beta_entry" });
      }),
    ).resolves.toBeUndefined();
  });

  it("a view shares the unit's poison state", async () => {
    await expect(
      runner.forModule("beta")(userContext(), async (uow) => {
        await adoptUnit(uow, "alpha").audit.append({ entryType: "nope" } as never).catch(() => undefined);
      }),
    ).rejects.toMatchObject({ name: "AuditWriteFailedError" });
  });

  it("adopt refuses something that is not a platform unit", () => {
    expect(() => adoptUnit({} as never, "alpha")).toThrow(/not created by the platform/);
  });
});

describe("tenant helpers against the database (R2-08)", () => {
  it("tenantWhere returns only the context's company; tenantValues stamps the company", async () => {
    const idA = randomUUID();
    const idB = randomUUID();
    await alpha()(userContext(companyA), (uow) => uow.tx.insert(probeState).values(tenantValues(probeState, uow.context, { id: idA, value: "a" })));
    await alpha()(userContext(companyB), (uow) => uow.tx.insert(probeState).values(tenantValues(probeState, uow.context, { id: idB, value: "b" })));
    const seen = await alpha()(userContext(companyA), (uow) =>
      uow.tx.select().from(probeState).where(tenantWhere(probeState, uow.context)),
    );
    expect(seen.map((r) => r.id)).toContain(idA);
    expect(seen.map((r) => r.id)).not.toContain(idB);
    expect(seen.every((r) => r.companyId === companyA)).toBe(true);

    const mine = await alpha()(userContext(companyB), (uow) =>
      uow.tx.select().from(probeState).where(tenantWhere(probeState, uow.context, eq(probeState.id, idA))),
    );
    expect(mine).toEqual([]);
  });
});

describe("scripts: createSystemContext and runInTransactionAs", () => {
  it("runs a unit bound to the named module with the installed runner", async () => {
    installDefaultRunner(runner);
    try {
      const ctx = createSystemContext(companyA, "provision");
      const id = await runInTransactionAs("alpha", ctx, (uow) => uow.audit.append(validEntry()));
      const row = await pools.owner.withClient(async (c) => (await c.query("SELECT actor_role, actor_id, causation_event_id FROM audit.audit_entries WHERE audit_id = $1", [id])).rows[0]);
      expect(row).toEqual({ actor_role: "system", actor_id: null, causation_event_id: null });
    } finally {
      resetDefaultRunnerForTests();
    }
    await expect(runInTransactionAs("alpha", createSystemContext(companyA, "x"), async () => 1)).rejects.toThrow(/No unit of work runner/);
  });
});
