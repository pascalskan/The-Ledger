import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { PgDialect, pgSchema, text, uuid } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { createExecutionContext, expireContext, toCompanyId } from "../context/execution-context";
import { tenantScope, tenantValues, tenantWhere, type TenantTable } from "./tenant-scope";

const table = pgSchema("tenant_unit").table("things", {
  id: uuid("id").primaryKey(),
  companyId: uuid("company_id").notNull(),
  name: text("name"),
});
const noTenant = pgSchema("tenant_unit").table("global_things", { id: uuid("id").primaryKey() });

const dialect = new PgDialect();
const company = randomUUID();
const other = randomUUID();
const ctx = () =>
  createExecutionContext({
    companyId: toCompanyId(company),
    actor: { kind: "user", userId: randomUUID(), role: "ceo" },
  });

describe("tenantScope and tenantWhere", () => {
  it("compare company_id to the context's company, as a bound parameter", () => {
    const query = dialect.sqlToQuery(tenantScope(table, ctx()));
    expect(query.sql).toBe('"tenant_unit"."things"."company_id" = $1');
    expect(query.params).toEqual([company]);
  });

  it("tenantWhere ANDs the extra conditions after the tenant condition", () => {
    const id = randomUUID();
    const query = dialect.sqlToQuery(tenantWhere(table, ctx(), eq(table.id, id), undefined));
    expect(query.sql).toContain('"company_id" = $1');
    expect(query.sql).toContain('"id" = $2');
    expect(query.params).toEqual([company, id]);
  });

  it("refuse a missing, forged or expired context, and a table without companyId, at run time", () => {
    expect(() => tenantScope(table, undefined as never)).toThrow(expect.objectContaining({ name: "MissingTenantContextError" }));
    expect(() => tenantWhere(table, { companyId: company } as never)).toThrow(expect.objectContaining({ name: "ForgedContextError" }));
    const dead = ctx();
    expireContext(dead);
    expect(() => tenantScope(table, dead)).toThrow(expect.objectContaining({ name: "ContextExpiredError" }));
    expect(() => tenantScope(noTenant as unknown as TenantTable, ctx())).toThrow(TypeError);
  });
});

describe("tenantValues", () => {
  it("sets companyId from the context", () => {
    const values = tenantValues(table, ctx(), { id: randomUUID(), name: "n" });
    expect(values.companyId).toBe(company);
    expect(values.name).toBe("n");
  });

  it("accepts a row that already names the same company, in either case", () => {
    expect(tenantValues(table, ctx(), { id: randomUUID(), companyId: company.toUpperCase() }).companyId).toBe(company);
  });

  it("refuses a row naming another company before any SQL runs (TenantMismatchError)", () => {
    expect(() => tenantValues(table, ctx(), { id: randomUUID(), companyId: other })).toThrow(
      expect.objectContaining({ name: "TenantMismatchError" }),
    );
    expect(() => tenantValues(table, ctx(), { id: randomUUID(), companyId: 7 as never })).toThrow(
      expect.objectContaining({ name: "TenantMismatchError" }),
    );
  });

  it("the context's value wins: it does not mutate the caller's row", () => {
    const row = { id: randomUUID(), name: "n" };
    tenantValues(table, ctx(), row);
    expect(row).not.toHaveProperty("companyId");
  });

  it("checks the context first", () => {
    expect(() => tenantValues(table, { companyId: company } as never, { id: randomUUID() })).toThrow(
      expect.objectContaining({ name: "ForgedContextError" }),
    );
  });
});
