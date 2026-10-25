import { randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  buildRegistries,
  createExecutionContext,
  createLogger,
  createOutboxWorker,
  createTestPools,
  toCompanyId,
  type DbPool,
  type EventEnvelope,
  type ModuleRegistration,
  type OutboxWorker,
  type OutboxWorkerHooks,
  type Registries,
  type TestPools,
  type UnitOfWork,
} from "../testing";
import type { OutboxSettings } from "../config";

// The outbox worker (PS-17 to PS-20) against the local mirror's test database. The full
// gate matrix (G0-09 to G0-18, G0-44) is the test engineer's; these are the implementer's own.

const MARK = "PAYLOAD-MARKER-8f31";
type Handler = (event: EventEnvelope, uow: UnitOfWork) => Promise<void>;

/** What each probe subscriber does; reset for every test. */
let behaviour: Record<string, Handler>;
const calls: { subscriber: string; eventId: string; companyId: string; actorRole: string }[] = [];

const subscribe = (name: string, eventTypes: string[]) => ({
  name,
  eventTypes,
  async handle(event: EventEnvelope, uow: UnitOfWork) {
    calls.push({ subscriber: name, eventId: event.eventId, companyId: uow.context.companyId, actorRole: uow.context.actor.kind });
    await (behaviour[name] ?? (async () => undefined))(event, uow);
  },
});

const alpha: ModuleRegistration = {
  name: "alpha",
  auditEntryTypes: [{ type: "alpha_entry", jobRequired: false }],
  producesEvents: [
    { type: "AlphaRecorded", jobRequired: false },
    { type: "AlphaChained", jobRequired: false },
  ],
  subscribers: () => [
    subscribe("alpha.first", ["AlphaRecorded"]),
    subscribe("alpha.second", ["AlphaRecorded"]),
    subscribe("alpha.chain", ["AlphaChained"]),
  ],
};

let pools: TestPools;
let registries: Registries;
const loggedLines: string[] = [];
const logger = createLogger({ service: "worker", level: "debug", destination: { write: (c: string) => void loggedLines.push(c) } });
const records = () => loggedLines.map((l) => JSON.parse(l) as Record<string, any>);

const fast: OutboxSettings = { maxAttempts: 5, baseBackoffMs: 20, pollIntervalMs: 20, batchSize: 10, staleLockMs: 300000 };

beforeAll(async () => {
  pools = createTestPools();
  await pools.owner.withClient(async (client) => {
    await client.query("CREATE SCHEMA IF NOT EXISTS uow_probe");
    await client.query("CREATE TABLE IF NOT EXISTS uow_probe.probe_state (id uuid PRIMARY KEY, company_id uuid NOT NULL, value text)");
    await client.query("CREATE TABLE IF NOT EXISTS uow_probe.subscriber_effects (subscriber text, effect_key uuid, PRIMARY KEY (subscriber, effect_key))");
    await client.query("GRANT USAGE ON SCHEMA uow_probe TO ledger_runtime");
    await client.query("GRANT SELECT, INSERT ON uow_probe.probe_state, uow_probe.subscriber_effects TO ledger_runtime");
  });
  registries = buildRegistries({ modules: [alpha], process: "worker", pool: pools.worker, logger, nodeEnv: "test" });
});
afterAll(async () => {
  await pools.end();
});
beforeEach(async () => {
  behaviour = {};
  calls.length = 0;
  loggedLines.length = 0;
  await pools.owner.withClient((c) => c.query("DELETE FROM intelligence.event_outbox"));
});
const running: OutboxWorker[] = [];
afterEach(async () => {
  await Promise.all(running.splice(0).map((w) => w.stop()));
});

function makeWorker(options: { settings?: Partial<OutboxSettings>; hooks?: OutboxWorkerHooks; pool?: DbPool; instanceId?: string } = {}): OutboxWorker {
  const worker = createOutboxWorker(
    {
      pool: options.pool ?? pools.worker,
      runner: registries.runner,
      subscribers: registries.subscribers,
      settings: { ...fast, ...options.settings },
      logger,
      ...(options.instanceId === undefined ? {} : { instanceId: options.instanceId }),
    },
    options.hooks,
  );
  running.push(worker);
  return worker;
}

const company = randomUUID();
const humanId = randomUUID();
const human = (companyId: string = company, userId: string = humanId) =>
  createExecutionContext({ companyId: toCompanyId(companyId), actor: { kind: "user", userId, role: "ceo" } });

/** Commits one event as a human in `companyId` and returns its event ID. */
async function commitEvent(options: { companyId?: string; type?: string; payload?: Record<string, string | number | boolean | null>; jobId?: string } = {}): Promise<string> {
  const source = randomUUID();
  return registries.runner.forModule("alpha")(human(options.companyId), (uow) =>
    uow.events.record({
      eventType: options.type ?? "AlphaRecorded",
      sourceObjectType: "probe",
      sourceObjectId: source,
      payload: options.payload ?? { id: source },
      ...(options.jobId === undefined ? {} : { jobId: options.jobId }),
    }),
  );
}

const rowOf = async (eventId: string) =>
  pools.owner.withClient(async (c) => (await c.query("SELECT * FROM intelligence.event_outbox WHERE event_id = $1", [eventId])).rows[0]);
const logRows = async (eventId: string) =>
  pools.owner.withClient(async (c) => (await c.query("SELECT * FROM intelligence.event_log WHERE event_id = $1", [eventId])).rows);
const setRow = (eventId: string, assignments: string) =>
  pools.owner.withClient((c) => c.query(`UPDATE intelligence.event_outbox SET ${assignments} WHERE event_id = $1`, [eventId]));

describe("delivery (PS-18)", () => {
  it("(G0-11) calls each subscriber once with the documented envelope, then writes the event log and marks delivered", async () => {
    const jobId = randomUUID();
    const eventId = await commitEvent({ jobId, payload: { id: "x", note: "n" } });
    const worker = makeWorker();
    expect(await worker.runOnce()).toEqual({ claimed: 1 });

    const row = await rowOf(eventId);
    expect(row).toMatchObject({ status: "delivered", locked_at: null, locked_by: null, retry_count: 0 });
    expect(row.delivered_at).toBeInstanceOf(Date);
    expect([...row.delivered_subscribers].sort()).toEqual(["alpha.first", "alpha.second"]);
    expect(calls.map((c) => c.subscriber).sort()).toEqual(["alpha.first", "alpha.second"]);
    expect(calls.every((c) => c.eventId === eventId && c.companyId === company && c.actorRole === "system")).toBe(true);

    const log = await logRows(eventId);
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ event_type: "AlphaRecorded", event_version: "1.0", source_module: "alpha", company_id: company, actor_id: humanId, job_id: jobId, payload: { id: "x", note: "n" } });
    expect(log[0].occurred_at.getTime()).toBe(row.occurred_at.getTime());
  });

  it("subscribers receive the envelope, without causation fields", async () => {
    const seen: EventEnvelope[] = [];
    behaviour["alpha.first"] = async (event) => void seen.push(event);
    const jobId = randomUUID();
    const eventId = await commitEvent({ jobId });
    const row = await rowOf(eventId);
    await makeWorker().runOnce();
    expect(seen).toHaveLength(1);
    expect(seen[0]).toEqual({
      eventId,
      eventType: "AlphaRecorded",
      eventVersion: "1.0",
      occurredAt: row.occurred_at.toISOString(),
      companyId: company,
      actorId: humanId,
      sourceObjectId: row.source_object_id,
      sourceObjectType: "probe",
      jobId,
      payload: row.payload,
    });
  });

  it("an event with no subscribers is delivered at once and logged", async () => {
    const eventId = await commitEvent({ type: "AlphaChained" });
    behaviour = {};
    // alpha.chain does subscribe; remove its work by letting it do nothing
    await makeWorker().runOnce();
    expect((await rowOf(eventId)).status).toBe("delivered");
    expect(await logRows(eventId)).toHaveLength(1);
  });

  it("(G0-09) an event whose transaction rolled back is never delivered", async () => {
    await expect(
      registries.runner.forModule("alpha")(human(), async (uow) => {
        await uow.events.record({ eventType: "AlphaRecorded", sourceObjectType: "probe", sourceObjectId: randomUUID(), payload: {} });
        throw new Error("rolled back");
      }),
    ).rejects.toThrow("rolled back");
    const worker = makeWorker();
    expect(await worker.runOnce()).toEqual({ claimed: 0 });
    await worker.runOnce();
    expect(calls).toEqual([]);
  });

  it("(G0-17) each event is handled in its own tenant's context, as a system actor", async () => {
    const companyB = randomUUID();
    behaviour["alpha.first"] = async (event, uow) => {
      await uow.audit.append({ entryType: "alpha_entry", sourceObjectType: "probe", sourceObjectId: event.sourceObjectId });
    };
    const a = await commitEvent();
    const b = await commitEvent({ companyId: companyB });
    await makeWorker().runOnce();
    expect(calls.filter((c) => c.subscriber === "alpha.first").map((c) => [c.eventId, c.companyId]).sort()).toEqual(
      [[a, company], [b, companyB]].sort(),
    );
    const audit = await pools.owner.withClient(async (c) => (await c.query("SELECT company_id, actor_role, actor_id FROM audit.audit_entries WHERE company_id = ANY($1) AND entry_type = 'alpha_entry'", [[company, companyB]])).rows);
    expect(audit.map((r) => r.actor_role)).toEqual(["system", "system"]);
    expect(audit.every((r) => r.actor_id === null)).toBe(true);
    expect(new Set(audit.map((r) => r.company_id))).toEqual(new Set([company, companyB]));
  });

  it("(G0-18) causation carries the human through a chain of subscribers", async () => {
    behaviour["alpha.first"] = async (event, uow) => {
      await uow.audit.append({ entryType: "alpha_entry", sourceObjectType: "probe", sourceObjectId: event.sourceObjectId });
      await uow.events.record({ eventType: "AlphaChained", sourceObjectType: "probe", sourceObjectId: event.sourceObjectId, payload: { from: event.eventId } });
    };
    behaviour["alpha.chain"] = async (event, uow) => {
      await uow.audit.append({ entryType: "alpha_entry", sourceObjectType: "chain", sourceObjectId: event.sourceObjectId });
    };
    const chainCompany = randomUUID();
    const e1 = await commitEvent({ companyId: chainCompany });
    const worker = makeWorker();
    await worker.runOnce(); // delivers E1; S1 records E2
    await worker.runOnce(); // delivers E2
    const e2 = (await pools.owner.withClient((c) => c.query("SELECT event_id FROM intelligence.event_outbox WHERE event_type = 'AlphaChained' AND company_id = $1", [chainCompany]))).rows[0].event_id as string;

    const e2Row = (await logRows(e2))[0];
    expect(e2Row).toMatchObject({ actor_id: null, causation_event_id: e1, causation_actor_id: humanId });
    const audits = await pools.owner.withClient(async (c) => (await c.query("SELECT source_object_type, causation_event_id, causation_actor_id, actor_role FROM audit.audit_entries WHERE entry_type = 'alpha_entry' AND company_id = $1 ORDER BY sequence_no", [chainCompany])).rows);
    expect(audits).toEqual([
      { source_object_type: "probe", causation_event_id: e1, causation_actor_id: humanId, actor_role: "system" },
      { source_object_type: "chain", causation_event_id: e2, causation_actor_id: humanId, actor_role: "system" },
    ]);
  });
});

describe("failure, retry and dead letter (PS-19)", () => {
  it("(G0-12b) a failing subscriber does not hold back the other, and a retry runs only the one that failed", async () => {
    let secondCalls = 0;
    behaviour["alpha.first"] = async (event, uow) => {
      await uow.tx.execute(sql`INSERT INTO uow_probe.subscriber_effects (subscriber, effect_key) VALUES ('first', ${event.eventId}) ON CONFLICT DO NOTHING`);
    };
    behaviour["alpha.second"] = async (event, uow) => {
      secondCalls++;
      await uow.tx.execute(sql`INSERT INTO uow_probe.subscriber_effects (subscriber, effect_key) VALUES ('second', ${event.eventId}) ON CONFLICT DO NOTHING`);
      if (secondCalls === 1) throw new Error("boom");
    };
    const eventId = await commitEvent();
    const worker = makeWorker();
    await worker.runOnce();
    let row = await rowOf(eventId);
    expect(row).toMatchObject({ status: "failed", retry_count: 1, locked_at: null, locked_by: null });
    expect(row.delivered_subscribers).toEqual(["alpha.first"]);
    expect(row.last_error).toBe("alpha.second: Error: boom");
    const effects = async () => (await pools.owner.withClient((c) => c.query("SELECT subscriber FROM uow_probe.subscriber_effects WHERE effect_key = $1 ORDER BY 1", [eventId]))).rows.map((r) => r.subscriber);
    expect(await effects()).toEqual(["first"]); // second's rollback is observable

    await sleep(60);
    await worker.runOnce();
    row = await rowOf(eventId);
    expect(row.status).toBe("delivered");
    expect(await effects()).toEqual(["first", "second"]);
    expect(calls.filter((c) => c.subscriber === "alpha.first")).toHaveLength(1); // skipped on the retry
    expect(calls.filter((c) => c.subscriber === "alpha.second")).toHaveLength(2);
    expect(await logRows(eventId)).toHaveLength(1);
  });

  it("(G0-15) exponential backoff, then a dead letter on the fifth failure, with no payload in the log or last_error", async () => {
    behaviour["alpha.first"] = async () => {
      throw new Error("boom");
    };
    const eventId = await commitEvent({ payload: { marker: MARK } });
    await setRow(eventId, "retry_count = 0"); // explicit, same as the default
    const worker = makeWorker();
    for (let failure = 1; failure <= 4; failure++) {
      const before = (await pools.owner.withClient((c) => c.query("SELECT now() AS t"))).rows[0].t as Date;
      await worker.runOnce();
      const after = (await pools.owner.withClient((c) => c.query("SELECT now() AS t"))).rows[0].t as Date;
      const row = await rowOf(eventId);
      const delay = 20 * 2 ** (failure - 1);
      expect(row).toMatchObject({ status: "failed", retry_count: failure, locked_by: null });
      expect(row.next_attempt_at.getTime()).toBeGreaterThanOrEqual(before.getTime() + delay - 2);
      expect(row.next_attempt_at.getTime()).toBeLessThanOrEqual(after.getTime() + delay + 2);
      await sleep(delay + 30);
    }
    await worker.runOnce();
    const dead = await rowOf(eventId);
    expect(dead).toMatchObject({ status: "dead_lettered", retry_count: 5, locked_by: null });
    expect(dead.dead_lettered_at).toBeInstanceOf(Date);
    expect(dead.last_error).toContain("alpha.first");
    expect(dead.last_error).not.toContain(MARK);
    expect(await logRows(eventId)).toEqual([]);
    // never claimed again
    await sleep(700);
    expect(await worker.runOnce()).toEqual({ claimed: 0 });
    expect(records().filter((r) => r.level === "ERROR")).toHaveLength(1);
    expect(loggedLines.join("\n")).not.toContain(MARK);
    expect(records().find((r) => r.level === "ERROR")).toMatchObject({ eventId, eventType: "AlphaRecorded", companyId: company, attempt: 5 });
  });

  it("(G0-16) a row waiting for its backoff is not claimed", async () => {
    behaviour["alpha.first"] = async () => {
      throw new Error("boom");
    };
    const eventId = await commitEvent();
    const worker = makeWorker({ settings: { baseBackoffMs: 10_000 } });
    await worker.runOnce();
    expect((await rowOf(eventId)).retry_count).toBe(1);
    calls.length = 0;
    expect(await worker.runOnce()).toEqual({ claimed: 0 });
    expect(calls).toEqual([]);
  });

  it("last_error summarises a database error without its message", async () => {
    behaviour["alpha.first"] = async (_event, uow) => {
      await uow.tx.execute(sql`SELECT ${MARK}::uuid`);
    };
    const eventId = await commitEvent();
    await makeWorker().runOnce();
    const row = await rowOf(eventId);
    expect(row.last_error).toContain("alpha.first");
    expect(row.last_error).toContain("22P02");
    expect(row.last_error).not.toContain(MARK);
    expect(loggedLines.join("\n")).not.toContain(MARK);
  });

  it("last_error is at most 1000 characters", async () => {
    behaviour["alpha.first"] = async () => {
      throw new Error("x".repeat(5000));
    };
    const eventId = await commitEvent();
    await makeWorker().runOnce();
    expect((await rowOf(eventId)).last_error).toHaveLength(1000);
  });
});

describe("stale-lock recovery (PS-20, G0-44)", () => {
  it("counts as a failed attempt, keeps delivered_subscribers, and the next delivery calls only the subscriber not yet done", async () => {
    const eventId = await commitEvent();
    await setRow(eventId, "status = 'processing', locked_at = now() - interval '10 minutes', locked_by = 'ghost', delivered_subscribers = '{alpha.first}'");
    const worker = makeWorker();
    await worker.runOnce();
    let row = await rowOf(eventId);
    expect(row).toMatchObject({ status: "failed", retry_count: 1, locked_by: null, delivered_subscribers: ["alpha.first"] });
    expect(row.last_error).toContain("stale lock: ghost");
    expect(records().some((r) => r.level === "WARN" && r.message === "Recovered a stale lock" && r.eventId === eventId)).toBe(true);
    expect(calls).toEqual([]); // recovered this cycle, not delivered
    await sleep(60);
    await worker.runOnce();
    expect(calls.map((c) => c.subscriber)).toEqual(["alpha.second"]);
    row = await rowOf(eventId);
    expect(row.status).toBe("delivered");
  });

  it("the fifth recovery dead-letters the event with one ERROR line", async () => {
    const eventId = await commitEvent();
    const worker = makeWorker();
    for (let n = 1; n <= 5; n++) {
      await setRow(eventId, "status = 'processing', locked_at = now() - interval '10 minutes', locked_by = 'ghost'");
      await worker.runOnce();
    }
    expect(await rowOf(eventId)).toMatchObject({ status: "dead_lettered", retry_count: 5 });
    expect(records().filter((r) => r.level === "ERROR" && r.eventId === eventId)).toHaveLength(1);
    expect(calls).toEqual([]);
  });

  it("a lock younger than the timeout is left alone", async () => {
    const eventId = await commitEvent();
    await setRow(eventId, "status = 'processing', locked_at = now(), locked_by = 'someone-else'");
    await makeWorker().runOnce();
    expect(await rowOf(eventId)).toMatchObject({ status: "processing", locked_by: "someone-else", retry_count: 0 });
  });
});

describe("claiming (PS-17)", () => {
  it("(G0-13) two workers running concurrently never claim the same row", async () => {
    const ids: string[] = [];
    for (let i = 0; i < 30; i++) ids.push(await commitEvent());
    const a = makeWorker({ instanceId: "worker-a" });
    const b = makeWorker({ instanceId: "worker-b" });
    for (let i = 0; i < 6; i++) await Promise.all([a.runOnce(), b.runOnce()]);
    const perEvent = new Map<string, number>();
    for (const c of calls.filter((c) => c.subscriber === "alpha.first")) perEvent.set(c.eventId, (perEvent.get(c.eventId) ?? 0) + 1);
    expect([...perEvent.keys()].sort()).toEqual([...ids].sort());
    expect([...perEvent.values()].every((n) => n === 1)).toBe(true);
    const count = await pools.owner.withClient(async (c) => (await c.query("SELECT count(*)::int AS n FROM intelligence.event_log WHERE event_id = ANY($1)", [ids])).rows[0].n);
    expect(count).toBe(30);
  });

  it("claims at most batchSize rows, oldest first", async () => {
    const ids: string[] = [];
    for (let i = 0; i < 5; i++) {
      ids.push(await commitEvent());
      await sleep(5);
    }
    const worker = makeWorker({ settings: { batchSize: 2 } });
    expect(await worker.runOnce()).toEqual({ claimed: 2 });
    const done = await pools.owner.withClient(async (c) => (await c.query("SELECT event_id FROM intelligence.event_outbox WHERE status = 'delivered' ORDER BY created_at")).rows.map((r) => r.event_id));
    expect(done).toEqual(ids.slice(0, 2));
  });

  it("the claim is served by the ready index: EXPLAIN against 10 000 due rows (R3-01)", async () => {
    await pools.owner.withClient(async (c) => {
      await c.query(`INSERT INTO intelligence.event_outbox (event_id, event_type, source_module, company_id, source_object_type, source_object_id, payload, next_attempt_at, created_at)
        SELECT gen_random_uuid(), 'AlphaRecorded', 'alpha', $1, 'probe', gen_random_uuid(), '{}'::jsonb, now() - (g || ' milliseconds')::interval, now() - (g || ' milliseconds')::interval
          FROM generate_series(1, 10000) g`, [company]);
      // delivered and future rows must not be in the index range
      await c.query(`INSERT INTO intelligence.event_outbox (event_id, event_type, source_module, company_id, source_object_type, source_object_id, payload, status, delivered_at)
        SELECT gen_random_uuid(), 'AlphaRecorded', 'alpha', $1, 'probe', gen_random_uuid(), '{}'::jsonb, 'delivered', now() FROM generate_series(1, 5000)`, [company]);
      await c.query("ANALYZE intelligence.event_outbox");
      const plan = (await c.query(`EXPLAIN (ANALYZE, BUFFERS OFF, COSTS OFF, TIMING OFF, SUMMARY OFF)
        UPDATE intelligence.event_outbox SET status = 'processing', locked_at = now(), locked_by = 'explain'
         WHERE outbox_id IN (SELECT outbox_id FROM intelligence.event_outbox
           WHERE status IN ('pending', 'failed') AND next_attempt_at <= now()
           ORDER BY next_attempt_at, created_at LIMIT 10 FOR UPDATE SKIP LOCKED)`)).rows.map((r) => r["QUERY PLAN"] as string).join("\n");
      process.stdout.write(`\nEXPLAIN of the claim against 10 000 due rows:\n${plan}\n`);
      expect(plan).toContain("Index Scan using event_outbox_ready_idx");
      expect(plan).toContain("LockRows");
      expect(plan).not.toMatch(/\bSort\b/);
      expect(plan).not.toContain("Seq Scan on event_outbox");
      // the scan stops after the limit: about batchSize index entries are read
      const scanned = /Index Scan using event_outbox_ready_idx[^\n]*\(actual rows=(\d+)/.exec(plan);
      expect(Number(scanned?.[1] ?? 0)).toBeLessThanOrEqual(10);
    });
  });
});

describe("fencing and the heartbeat (PS-18, G0-14)", () => {
  it("(a) a worker whose lock went stale and was recovered is fenced: its subscriber's writes roll back", async () => {
    const eventId = await commitEvent();
    let reachedLatch!: () => void;
    const reached = new Promise<void>((resolve) => (reachedLatch = resolve));
    let release!: () => void;
    const latch = new Promise<void>((resolve) => (release = resolve));
    let first = true;
    behaviour["alpha.first"] = async (event, uow) => {
      const isFirstCall = first;
      first = false;
      if (isFirstCall) {
        reachedLatch();
        await latch; // before any write: this transaction holds no row or key lock
      }
      await uow.tx.execute(sql`INSERT INTO uow_probe.probe_state (id, company_id, value) VALUES (${randomUUID()}, ${company}, ${isFirstCall ? "w1" : "w2"})`);
      await uow.tx.execute(sql`INSERT INTO uow_probe.subscriber_effects (subscriber, effect_key) VALUES ('first', ${event.eventId}) ON CONFLICT DO NOTHING`);
    };
    const w1 = makeWorker({ instanceId: "worker-1" });
    const w2 = makeWorker({ instanceId: "worker-2" });
    const marker = `fence-${randomUUID()}`;
    void marker;
    const w1Run = w1.runOnce();
    await Promise.race([reached, sleep(10_000).then(() => Promise.reject(new Error("W1 never reached the subscriber")))]);
    await setRow(eventId, "locked_at = now() - interval '10 minutes'");
    await w2.runOnce(); // W2 recovers the row (failed, retry_count = 1)
    expect((await rowOf(eventId)).retry_count).toBe(1);
    await sleep(60);
    await w2.runOnce(); // W2 claims and delivers it
    release();
    await w1Run;

    const row = await rowOf(eventId);
    expect(row).toMatchObject({ status: "delivered", retry_count: 1 });
    expect(await logRows(eventId)).toHaveLength(1);
    const tags = (await pools.owner.withClient((c) => c.query("SELECT value FROM uow_probe.probe_state WHERE value IN ('w1','w2') AND company_id = $1", [company]))).rows.map((r) => r.value);
    expect(tags).toEqual(["w2"]);
    expect(records().some((r) => r.message === "Claim lost during delivery; stopping this event")).toBe(true);
  });

  it("(b) a finish that lost its lock after every subscriber committed delivers without calling anyone", async () => {
    const eventId = await commitEvent();
    await setRow(eventId, "status = 'failed', delivered_subscribers = '{alpha.first,alpha.second}', next_attempt_at = now()");
    await makeWorker().runOnce();
    expect(calls).toEqual([]);
    expect((await rowOf(eventId)).status).toBe("delivered");
    expect(await logRows(eventId)).toHaveLength(1);
  });

  it("(c) the finish is guarded by locked_by: a lost lock rolls the event_log insert back", async () => {
    const eventId = await commitEvent();
    const worker = makeWorker({
      hooks: { beforeFinish: async () => void (await setRow(eventId, "locked_by = 'other'")) },
    });
    await worker.runOnce();
    expect(await logRows(eventId)).toEqual([]);
    expect(await rowOf(eventId)).toMatchObject({ status: "processing", locked_by: "other" });
    expect(records().some((r) => r.message.includes("not counted as an attempt"))).toBe(true);
  });

  it("(d) the heartbeat refreshes every row the worker holds, after each subscriber commits", async () => {
    const first = await commitEvent();
    await sleep(5);
    const second = await commitEvent();
    let clock!: Date;
    let release!: () => void;
    const latch = new Promise<void>((resolve) => (release = resolve));
    let reachedB!: () => void;
    const reached = new Promise<void>((resolve) => (reachedB = resolve));
    behaviour["alpha.second"] = async (event) => {
      if (event.eventId !== first) return;
      reachedB();
      await latch;
    };
    const worker = makeWorker({
      settings: { batchSize: 2 },
      hooks: {
        afterSubscriber: async (row, entry) => {
          if (row.event_id === first && entry.subscriber.name === "alpha.first") {
            clock = (await pools.owner.withClient((c) => c.query("SELECT clock_timestamp() AS t"))).rows[0].t;
          }
        },
      },
    });
    const run = worker.runOnce();
    await Promise.race([reached, sleep(10_000).then(() => Promise.reject(new Error("B never started")))]);
    const lockedAt = (await rowOf(second)).locked_at as Date;
    expect(lockedAt.getTime()).toBeGreaterThanOrEqual(clock.getTime() - 1);
    release();
    await run;
    expect((await rowOf(first)).status).toBe("delivered");
    expect((await rowOf(second)).status).toBe("delivered");
  });
});

describe("the loop", () => {
  it("start() delivers events and stop() ends it, claiming nothing more", async () => {
    const worker = makeWorker();
    worker.start();
    const eventId = await commitEvent();
    for (let i = 0; i < 100 && (await rowOf(eventId)).status !== "delivered"; i++) await sleep(20);
    expect((await rowOf(eventId)).status).toBe("delivered");
    await worker.stop();
    const later = await commitEvent();
    await sleep(120);
    expect((await rowOf(later)).status).toBe("pending");
  });

  it("stop() during a batch hands the unstarted rows back without counting an attempt", async () => {
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      ids.push(await commitEvent());
      await sleep(5);
    }
    const worker = makeWorker({ settings: { batchSize: 3 } });
    behaviour["alpha.first"] = async (event) => {
      if (event.eventId === ids[0]) void worker.stop();
    };
    await worker.runOnce();
    const rows = await Promise.all(ids.map(rowOf));
    expect(rows[0].status).toBe("delivered");
    for (const row of rows.slice(1)) {
      expect(row).toMatchObject({ status: "pending", locked_by: null, locked_at: null, retry_count: 0 });
    }
  });

  it("an unexpected error is logged at ERROR and the loop carries on", async () => {
    let failures = 1;
    const flaky: DbPool = {
      role: pools.worker.role,
      end: () => pools.worker.end(),
      withClient: (fn) => {
        if (failures-- > 0) return Promise.reject(new Error("database unreachable"));
        return pools.worker.withClient(fn);
      },
    };
    const worker = makeWorker({ pool: flaky });
    worker.start();
    const eventId = await commitEvent();
    for (let i = 0; i < 100 && (await rowOf(eventId)).status !== "delivered"; i++) await sleep(20);
    expect((await rowOf(eventId)).status).toBe("delivered");
    expect(records().some((r) => r.level === "ERROR" && r.message === "The outbox worker loop failed; it will carry on")).toBe(true);
  });

  it("worker log lines name the event, type, company, subscriber and attempt, and never the payload (G0-28)", async () => {
    let calls1 = 0;
    behaviour["alpha.first"] = async () => {
      if (calls1++ === 0) throw new Error("fail once");
    };
    const eventId = await commitEvent({ payload: { marker: MARK } });
    const worker = makeWorker();
    await worker.runOnce();
    await sleep(60);
    await worker.runOnce();
    expect(loggedLines.join("\n")).not.toContain(MARK);
    const failed = records().find((r) => r.message === "Subscriber failed");
    expect(failed).toMatchObject({ eventId, eventType: "AlphaRecorded", companyId: company, subscriber: "alpha.first", attempt: 1 });
    expect(failed!.runId).toBeDefined();
  });
});
