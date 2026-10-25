import { randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  buildTypeCatalogue,
  createExecutionContext,
  createLogger,
  createOwnerPool,
  createRuntimePool,
  createTestPools,
  createUnitOfWorkRunner,
  testDatabase,
  toCompanyId,
  type DbPool,
  type TestPools,
} from "../testing";

// A connection lost or killed while a unit runs (a database failover, a backend FATAL) must
// not kill the process: pg-pool removes its idle 'error' listener on checkout, so withClient
// listens itself, and destroys the client instead of returning it to the pool.

let pools: TestPools;
beforeAll(() => {
  pools = createTestPools();
});
afterAll(async () => {
  await pools.end();
});

function capture() {
  const lines: string[] = [];
  const logger = createLogger({ service: "api", level: "debug", destination: { write: (c: string) => void lines.push(c) } });
  return { lines, logger, records: () => lines.map((l) => JSON.parse(l) as Record<string, any>) };
}

const context = () =>
  createExecutionContext({
    companyId: toCompanyId(randomUUID()),
    actor: { kind: "user", userId: randomUUID(), role: "ceo" },
  });
const emptyCatalogue = buildTypeCatalogue("audit entry type", []);

async function terminateBackend(pid: number): Promise<void> {
  await pools.owner.withClient((client) => client.query("SELECT pg_terminate_backend($1)", [pid]));
  await sleep(150); // let the client notice
}

const pidOf = async (uow: { tx: { execute: (q: never) => Promise<{ rows: any[] }> } }) =>
  (await uow.tx.execute(sql`SELECT pg_backend_pid() AS pid` as never)).rows[0]!.pid as number;

describe.each([
  ["the API runner (ledger_app)", "app"],
  ["the worker runner (ledger_worker)", "worker"],
] as const)("%s", (_label, who) => {
  function makePool() {
    const { logger, records } = capture();
    const guarded = testDatabase();
    const pool = createRuntimePool({
      settings: who === "app" ? guarded.app : guarded.worker,
      logger,
      expectedRole: who === "app" ? "ledger_app" : "ledger_worker",
      max: 1, // one slot: the next unit can only succeed if the dead client was replaced
    });
    const runner = createUnitOfWorkRunner({ pool, auditCatalogue: emptyCatalogue, eventCatalogue: emptyCatalogue }).forModule("alpha");
    return { pool, runner, records };
  }

  it("a backend killed mid-unit rejects the unit, does not crash the process, and the pool recovers", async () => {
    const { pool, runner, records } = makePool();
    try {
      let killed = 0;
      await expect(
        runner(context(), async (uow) => {
          killed = await pidOf(uow as never);
          await terminateBackend(killed);
          await uow.tx.execute(sql`SELECT 1`);
        }),
      ).rejects.toBeDefined();

      // the process survived (an uncaught 'error' event would have failed this run) and the
      // listener ran: the failure was logged at WARN with the role and no connection detail
      const warning = records().find((r) => r.message === "Database client failed while checked out");
      expect(warning).toBeDefined();
      expect(warning).toMatchObject({ level: "WARN", role: who === "app" ? "ledger_app" : "ledger_worker" });

      // the pool recovers: the next unit succeeds, on a NEW backend
      const next = await runner(context(), (uow) => pidOf(uow as never));
      expect(next).not.toBe(killed);
      expect(await runner(context(), (uow) => pidOf(uow as never))).toBeTypeOf("number");
    } finally {
      await pool.end();
    }
  });

  it("a backend killed while the unit is idle between statements is also survived", async () => {
    const { pool, runner } = makePool();
    try {
      await expect(
        runner(context(), async (uow) => {
          const pid = await pidOf(uow as never);
          await terminateBackend(pid);
          await sleep(100);
          await uow.tx.execute(sql`SELECT 1`);
        }),
      ).rejects.toBeDefined();
      await expect(runner(context(), async (uow) => (await uow.tx.execute(sql`SELECT 1 AS one`)).rows[0]!.one)).resolves.toBe(1);
    } finally {
      await pool.end();
    }
  });

  it("a client killed while idle in the pool is replaced (the pool's own idle listener)", async () => {
    const { pool, runner } = makePool();
    try {
      const first = await runner(context(), (uow) => pidOf(uow as never));
      await terminateBackend(first);
      await expect(runner(context(), (uow) => pidOf(uow as never))).resolves.toBeTypeOf("number");
    } finally {
      await pool.end();
    }
  });
});

describe("the owner pool", () => {
  it("survives a backend killed while its client is checked out, and recovers", async () => {
    const { logger, records } = capture();
    const pool: DbPool = createOwnerPool({ settings: testDatabase().migration, logger, max: 1 });
    try {
      let killed = 0;
      await expect(
        pool.withClient(async (client) => {
          killed = (await client.query("SELECT pg_backend_pid() AS pid")).rows[0].pid;
          await terminateBackend(killed);
          await client.query("SELECT 1");
        }),
      ).rejects.toBeDefined();
      expect(records().some((r) => r.message === "Database client failed while checked out")).toBe(true);
      const next = await pool.withClient(async (client) => (await client.query("SELECT pg_backend_pid() AS pid")).rows[0].pid as number);
      expect(next).not.toBe(killed);
    } finally {
      await pool.end();
    }
  });
});
