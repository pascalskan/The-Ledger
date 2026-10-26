import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  actorColumns,
  assertLiveContext,
  createExecutionContext,
  expireContext,
  isHumanActor,
  readCausationActor,
  toCompanyId,
  type Actor,
} from "./execution-context";

const company = randomUUID();
const user: Actor = { kind: "user", userId: randomUUID(), role: "pm" };

describe("toCompanyId", () => {
  it("accepts a UUID (and lower-cases it)", () => {
    expect(toCompanyId(company.toUpperCase())).toBe(company);
  });
  it.each([undefined, null, "", " ", "not-a-uuid", 42, {}, "123e4567-e89b-12d3-a456-42661417400"])(
    "refuses %j with MissingTenantContextError",
    (value) => {
      expect(() => toCompanyId(value)).toThrow(expect.objectContaining({ name: "MissingTenantContextError" }));
    },
  );
});

describe("createExecutionContext", () => {
  it("builds a frozen, genuine context", () => {
    const ctx = createExecutionContext({ companyId: toCompanyId(company), actor: user, requestId: "r1" });
    expect(ctx).toEqual({ companyId: company, actor: user, causation: null, requestId: "r1" });
    expect(Object.isFrozen(ctx)).toBe(true);
    expect(Object.isFrozen(ctx.actor)).toBe(true);
    expect(() => assertLiveContext(ctx)).not.toThrow();
  });

  it("does not keep the caller's actor object", () => {
    const actor = { kind: "user", userId: randomUUID(), role: "ceo" } as const;
    const ctx = createExecutionContext({ companyId: toCompanyId(company), actor });
    expect(ctx.actor).not.toBe(actor);
    expect(Object.isFrozen(actor)).toBe(false);
  });

  it("freezes causation and shows module code only the event ID", () => {
    const human = randomUUID();
    const eventId = randomUUID();
    const ctx = createExecutionContext({
      companyId: toCompanyId(company),
      actor: { kind: "system", component: "alpha.thing" },
      causation: { eventId, humanActorId: human },
    });
    expect(ctx.causation).toEqual({ eventId });
    expect(Object.isFrozen(ctx.causation)).toBe(true);
    expect(Object.keys(ctx.causation!)).toEqual(["eventId"]);
    expect(Reflect.ownKeys(ctx.causation!)).toEqual(["eventId"]);
    expect(JSON.stringify(ctx)).not.toContain(human);
    expect(readCausationActor(ctx)).toBe(human);
  });

  it("the causing human is null when no human is in the chain, and for contexts without causation", () => {
    const plain = createExecutionContext({ companyId: toCompanyId(company), actor: user });
    expect(readCausationActor(plain)).toBeNull();
    const system = createExecutionContext({
      companyId: toCompanyId(company),
      actor: { kind: "system", component: "x" },
      causation: { eventId: randomUUID(), humanActorId: null },
    });
    expect(readCausationActor(system)).toBeNull();
  });

  it("refuses causation on a human actor, and invalid actors", () => {
    expect(() =>
      createExecutionContext({
        companyId: toCompanyId(company),
        actor: user,
        causation: { eventId: randomUUID(), humanActorId: null },
      }),
    ).toThrow(expect.objectContaining({ name: "ForgedContextError" }));
    for (const actor of [
      { kind: "user", userId: "nope", role: "ceo" },
      { kind: "user", userId: randomUUID(), role: "admin" },
      { kind: "portal_user", portalAccountId: randomUUID(), clientId: "x", role: "client" },
      { kind: "system", component: " " },
      { kind: "other" },
    ]) {
      expect(() => createExecutionContext({ companyId: toCompanyId(company), actor: actor as never })).toThrow(
        expect.objectContaining({ name: "ForgedContextError" }),
      );
    }
  });
});

describe("assertLiveContext", () => {
  const genuine = () => createExecutionContext({ companyId: toCompanyId(company), actor: user });

  it("refuses a missing tenant before anything else", () => {
    for (const value of [undefined, null, "x", {}, { companyId: "" }, { companyId: "nope" }]) {
      expect(() => assertLiveContext(value)).toThrow(expect.objectContaining({ name: "MissingTenantContextError" }));
    }
  });

  it("refuses every non-factory object with ForgedContextError", () => {
    const real = genuine();
    for (const value of [
      { companyId: company, actor: user, causation: null },
      { ...real },
      Object.assign({}, real),
      structuredClone(real),
      Object.create(real, { companyId: { value: company } }),
      { ...real, companyId: randomUUID() },
      { ...real, causation: { eventId: randomUUID() } },
    ]) {
      expect(() => assertLiveContext(value)).toThrow(expect.objectContaining({ name: "ForgedContextError" }));
    }
  });

  it("refuses an expired context, and expiry does not touch other contexts", () => {
    const a = genuine();
    const b = genuine();
    expireContext(a);
    expect(() => assertLiveContext(a)).toThrow(expect.objectContaining({ name: "ContextExpiredError" }));
    expect(() => assertLiveContext(b)).not.toThrow();
  });
});

describe("actors", () => {
  it("maps actors to audit columns", () => {
    const portal: Actor = { kind: "portal_user", portalAccountId: randomUUID(), clientId: randomUUID(), role: "client" };
    expect(actorColumns(user)).toEqual({ actorId: (user as { userId: string }).userId, actorRole: "pm" });
    expect(actorColumns(portal)).toEqual({ actorId: (portal as { portalAccountId: string }).portalAccountId, actorRole: "client" });
    expect(actorColumns({ kind: "system", component: "x" })).toEqual({ actorId: null, actorRole: "system" });
  });

  it("isHumanActor is true for user and portal_user only", () => {
    expect(isHumanActor(user)).toBe(true);
    expect(isHumanActor({ kind: "portal_user", portalAccountId: randomUUID(), clientId: randomUUID(), role: "client" })).toBe(true);
    expect(isHumanActor({ kind: "system", component: "x" })).toBe(false);
  });
});
