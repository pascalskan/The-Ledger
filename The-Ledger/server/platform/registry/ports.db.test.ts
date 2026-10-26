import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { Router } from "express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  bind,
  buildRegistries,
  createExecutionContext,
  createLogger,
  createSystemContext,
  createTestPools,
  definePort,
  toCompanyId,
  type ExecutionContext,
  type ModuleRegistration,
  type Registries,
  type TestPools,
  type UnitOfWork,
} from "../testing";

// Human-only ports at run time (spec PS-16, G0-47), and a correct wiring (G0-41): the
// wrapper checks the caller before the implementation runs, adopts the unit for the
// implementing module, and poisons the unit on refusal.

interface ApprovePort {
  approve(uow: UnitOfWork, note: string): Promise<string>;
}
interface PlainPort {
  record(uow: UnitOfWork): Promise<string>;
}

const approvePort = definePort<ApprovePort>("alpha.approve", { humanOnly: true, roles: ["ceo", "pm"] });
const plainPort = definePort<PlainPort>("alpha.plain");
const calls: string[] = [];

const alpha: ModuleRegistration = {
  name: "alpha",
  auditEntryTypes: [{ type: "alpha_entry", jobRequired: false }],
  requiresPorts: [approvePort, plainPort],
};
// beta implements both and owns the audit types they write: only an adopted unit may write them
const beta: ModuleRegistration = {
  name: "beta",
  auditEntryTypes: [{ type: "beta_approved", jobRequired: false }, { type: "beta_plain", jobRequired: false }],
  providesPorts: [
    bind(approvePort, () => ({
      async approve(uow: UnitOfWork, note: string) {
        calls.push(`approve:${note}`);
        await uow.tx.execute(sql`INSERT INTO uow_probe.probe_state (id, company_id, value) VALUES (${randomUUID()}, ${uow.context.companyId}, ${note})`);
        return uow.audit.append({ entryType: "beta_approved", sourceObjectType: "probe", sourceObjectId: randomUUID() });
      },
    })),
    bind(plainPort, () => ({
      async record(uow: UnitOfWork) {
        return uow.audit.append({ entryType: "beta_plain", sourceObjectType: "probe", sourceObjectId: randomUUID() });
      },
    })),
  ],
};

let pools: TestPools;
let registries: Registries;
let approve!: ApprovePort;
let plain!: PlainPort;
const company = randomUUID();

beforeAll(async () => {
  pools = createTestPools();
  await pools.owner.withClient(async (client) => {
    await client.query("CREATE SCHEMA IF NOT EXISTS uow_probe");
    await client.query("CREATE TABLE IF NOT EXISTS uow_probe.probe_state (id uuid PRIMARY KEY, company_id uuid NOT NULL, value text)");
    await client.query("GRANT USAGE ON SCHEMA uow_probe TO ledger_runtime");
    await client.query("GRANT SELECT, INSERT ON uow_probe.probe_state TO ledger_runtime");
  });
  const capture: ModuleRegistration = {
    ...alpha,
    apiRouters: {
      "/__alpha": (deps) => {
        approve = deps.ports.get(approvePort);
        plain = deps.ports.get(plainPort);
        return Router();
      },
    },
  };
  registries = buildRegistries({
    modules: [capture, beta],
    process: "api",
    pool: pools.app,
    logger: createLogger({ service: "api", level: "fatal" }),
    nodeEnv: "test",
  });
});
afterAll(async () => {
  await pools.end();
});

const alphaUnit = () => registries.runner.forModule("alpha");
const user = (role: "ceo" | "pm" | "worker") =>
  createExecutionContext({ companyId: toCompanyId(company), actor: { kind: "user", userId: randomUUID(), role } });

async function rowsFor(note: string) {
  return pools.owner.withClient(async (client) => ({
    state: (await client.query("SELECT 1 FROM uow_probe.probe_state WHERE value = $1", [note])).rowCount,
  }));
}

describe("a human-only port refuses every caller that is not a live human of a listed role", () => {
  const refusals: [string, () => ExecutionContext][] = [
    ["(a) a system context", () => createSystemContext(company, "script")],
    [
      "(b) subscriber work (a system actor with causation)",
      () =>
        createExecutionContext({
          companyId: toCompanyId(company),
          actor: { kind: "system", component: "alpha.subscriber" },
          causation: { eventId: randomUUID(), humanActorId: randomUUID() },
        }),
    ],
    [
      "(c) a portal user",
      () =>
        createExecutionContext({
          companyId: toCompanyId(company),
          actor: { kind: "portal_user", portalAccountId: randomUUID(), clientId: randomUUID(), role: "client" },
        }),
    ],
    ["(d) a platform user with the role worker", () => user("worker")],
  ];

  it.each(refusals)("%s: HumanActorRequiredError before the implementation runs, writing nothing", async (_label, make) => {
    const note = randomUUID();
    const before = calls.length;
    await expect(alphaUnit()(make(), (uow) => approve.approve(uow, note))).rejects.toMatchObject({
      name: "HumanActorRequiredError",
    });
    expect(calls.length).toBe(before);
    expect((await rowsFor(note)).state).toBe(0);
  });

  it("(e) a caller that catches the refusal still cannot commit: its own row is rolled back too", async () => {
    const note = randomUUID();
    await expect(
      alphaUnit()(createSystemContext(company, "script"), async (uow) => {
        await uow.tx.execute(sql`INSERT INTO uow_probe.probe_state (id, company_id, value) VALUES (${randomUUID()}, ${company}, ${note})`);
        await approve.approve(uow, note).catch(() => undefined);
      }),
    ).rejects.toMatchObject({ name: "HumanActorRequiredError" });
    expect((await rowsFor(note)).state).toBe(0);
  });

  it("a unit that is not a platform unit, or is already closed, is refused", async () => {
    await expect(approve.approve({} as never, "x")).rejects.toMatchObject({ name: "HumanActorRequiredError" });
    let closed!: UnitOfWork;
    await alphaUnit()(user("ceo"), async (uow) => {
      closed = uow;
    });
    await expect(approve.approve(closed, "x")).rejects.toMatchObject({ name: "HumanActorRequiredError" });
  });

  it("an expired context is refused", async () => {
    const { expireContext } = await import("../testing");
    const ctx = user("ceo");
    await expect(
      alphaUnit()(ctx, async (uow) => {
        expireContext(ctx);
        await approve.approve(uow, "late");
      }),
    ).rejects.toMatchObject({ name: "HumanActorRequiredError" });
  });
});

describe("a human caller in a listed role", () => {
  it.each(["ceo", "pm"] as const)(
    "(f) %s: succeeds, and the audit row has the user as actor, their role and no causation",
    async (role) => {
      const ctx = user(role);
      const note = randomUUID();
      const auditId = await alphaUnit()(ctx, (uow) => approve.approve(uow, note));
      expect((await rowsFor(note)).state).toBe(1);
      const row = await pools.owner.withClient(
        async (client) => (await client.query("SELECT actor_id, actor_role, causation_event_id, causation_actor_id, entry_type FROM audit.audit_entries WHERE audit_id = $1", [auditId])).rows[0],
      );
      expect(row).toEqual({
        actor_id: (ctx.actor as { userId: string }).userId,
        actor_role: role,
        causation_event_id: null,
        causation_actor_id: null,
        entry_type: "beta_approved",
      });
    },
  );

  it("the implementation's types are checked against ITS module's catalogue (the wrapper adopted the unit)", async () => {
    // alpha's own unit cannot write beta's type directly ...
    await expect(
      alphaUnit()(user("ceo"), (uow) => uow.audit.append({ entryType: "beta_approved", sourceObjectType: "probe", sourceObjectId: randomUUID() })),
    ).rejects.toThrow();
    // ... but through the port it can, because the unit was adopted for beta
    await expect(alphaUnit()(user("ceo"), (uow) => approve.approve(uow, randomUUID()))).resolves.toEqual(expect.any(String));
  });

  it("an implementation error rolls the whole unit back", async () => {
    const note = randomUUID();
    await expect(
      alphaUnit()(user("ceo"), async (uow) => {
        await approve.approve(uow, note);
        throw new Error("the caller failed afterwards");
      }),
    ).rejects.toThrow("the caller failed afterwards");
    expect((await rowsFor(note)).state).toBe(0);
  });
});

describe("a port that is not human-only", () => {
  it("accepts a system caller, and still adopts the unit for the implementing module", async () => {
    const auditId = await alphaUnit()(createSystemContext(company, "script"), (uow) => plain.record(uow));
    const row = await pools.owner.withClient(
      async (client) => (await client.query("SELECT actor_role, actor_id, entry_type FROM audit.audit_entries WHERE audit_id = $1", [auditId])).rows[0],
    );
    expect(row).toEqual({ actor_role: "system", actor_id: null, entry_type: "beta_plain" });
  });
});

describe("the wrapped implementation", () => {
  it("exposes only the implementation's methods, frozen, all asynchronous", async () => {
    expect(Object.keys(approve)).toEqual(["approve"]);
    expect(Object.isFrozen(approve)).toBe(true);
    const pending = approve.approve({} as never, "x");
    expect(pending).toBeInstanceOf(Promise);
    await expect(pending).rejects.toBeDefined();
  });
});
