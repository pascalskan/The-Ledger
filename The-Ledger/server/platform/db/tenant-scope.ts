import { and, eq, type SQL } from "drizzle-orm";
import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";
import {
  assertLiveContext,
  type CompanyId,
  type ExecutionContext,
} from "../context/execution-context";
import { TenantMismatchError } from "../errors/platform-errors";

// Phase 0 spec §4.2 (R2-08): tenant-scoped data access.
//
// Rules for every later phase: every insert into a tenant table builds its values with
// `tenantValues`; every read, update and delete builds its WHERE with `tenantWhere`.
// All three helpers accept only tables that have a `companyId` column (anything else is a
// type error), check the context is genuine and live, and fail at run time when the tenant
// is missing. They are pure: they open no transaction and run no SQL.

/** A Drizzle table with a `companyId` column. */
export type TenantTable = PgTable & { companyId: AnyPgColumn };

function requireCompanyIdColumn(table: TenantTable): AnyPgColumn {
  const column = (table as { companyId?: AnyPgColumn }).companyId;
  if (column === undefined) {
    throw new TypeError("The table has no companyId column and cannot be tenant-scoped");
  }
  return column;
}

/** `company_id = ctx.companyId` */
export function tenantScope(table: TenantTable, ctx: ExecutionContext): SQL {
  assertLiveContext(ctx);
  return eq(requireCompanyIdColumn(table), ctx.companyId);
}

/** The tenant condition AND the given conditions. */
export function tenantWhere(
  table: TenantTable,
  ctx: ExecutionContext,
  ...conditions: (SQL | undefined)[]
): SQL {
  return and(tenantScope(table, ctx), ...conditions) as SQL;
}

/**
 * Returns `row` with `companyId` set from `ctx`. If the row already carries a different
 * `companyId`, it throws TenantMismatchError before any SQL runs.
 */
export function tenantValues<T extends TenantTable>(
  table: T,
  ctx: ExecutionContext,
  row: Omit<T["$inferInsert"], "companyId"> & { companyId?: string },
): Omit<T["$inferInsert"], "companyId"> & { companyId: CompanyId } {
  assertLiveContext(ctx);
  requireCompanyIdColumn(table);
  const given = (row as { companyId?: unknown }).companyId;
  if (given !== undefined && (typeof given !== "string" || given.toLowerCase() !== ctx.companyId)) {
    throw new TenantMismatchError();
  }
  return { ...row, companyId: ctx.companyId } as Omit<T["$inferInsert"], "companyId"> & {
    companyId: CompanyId;
  };
}
