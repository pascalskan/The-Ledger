import type pg from "pg";
import {
  assertTestDatabase,
  TestDatabaseGuardError,
  type TestDatabaseInputs,
} from "../config";
import { runMigrations } from "../db/migrate";

// Phase 0 spec §4.6 (test database lifecycle, RP-04, RB2-06). Test-only code (import
// rule 1a): never imported by the API or the worker, and never bundled.

/** The one method the rebuild needs, so a test can pass a stub that records every statement. */
export interface OwnerClientLike {
  query(text: string, values?: unknown[]): Promise<{ rows: any[] }>;
}

/**
 * The schemas the owner role owns, except `public`, `information_schema` and every
 * `pg_*` schema (RP-04): on both hosts the owner is the bootstrap superuser, which also
 * owns pg_catalog, pg_toast and information_schema. Lists them without dropping anything.
 */
export async function listSchemasToDrop(client: OwnerClientLike): Promise<string[]> {
  const result = await client.query(
    `SELECT nspname::text AS nspname FROM pg_namespace
      WHERE nspowner = current_user::regrole
        AND nspname <> 'public'
        AND nspname <> 'information_schema'
        AND nspname NOT LIKE 'pg\\_%'
      ORDER BY nspname`,
  );
  return result.rows.map((row: { nspname: string }) => row.nspname);
}

export interface LeftoverRoleCleanup {
  readonly dropped: readonly string[];
  readonly failed: readonly string[];
}

/**
 * Drops leftover throwaway roles `gate_probe_%` and `gate_extra_%` (RB2-06): `DROP OWNED BY`
 * in the test database, then `DROP ROLE`. A crashed run therefore leaves nothing usable
 * behind on the shared server. It never touches ledger_app, ledger_worker or ledger_runtime.
 */
export async function dropLeftoverGateRoles(client: OwnerClientLike): Promise<LeftoverRoleCleanup> {
  const found = await client.query(
    `SELECT rolname::text AS rolname FROM pg_roles WHERE rolname ~ '^gate_(probe|extra)_' ORDER BY rolname`,
  );
  const dropped: string[] = [];
  const failed: string[] = [];
  for (const { rolname } of found.rows as { rolname: string }[]) {
    try {
      const statements = await client.query(
        `SELECT format('DROP OWNED BY %I', $1::text) AS owned, format('DROP ROLE %I', $1::text) AS role`,
        [rolname],
      );
      const { owned, role } = statements.rows[0] as { owned: string; role: string };
      await client.query(owned);
      await client.query(role);
      dropped.push(rolname);
    } catch {
      failed.push(rolname);
    }
  }
  return { dropped, failed };
}

export interface RebuildOptions {
  /** Applies the migrations after the drop. Default: the platform migration runner (PS-21). */
  readonly migrate?: (client: OwnerClientLike) => Promise<void>;
}

/**
 * Rebuilds the test database: runs the guard; checks on the live owner connection,
 * BEFORE any DROP, that `current_database()` ends in `_test` and equals the guarded name;
 * drops every schema the owner owns except the system ones (with CASCADE, each statement
 * built by `format('%I')` from the catalogue); then re-runs every migration.
 */
export async function rebuildTestDatabase(
  inputs: TestDatabaseInputs,
  client: OwnerClientLike,
  options: RebuildOptions = {},
): Promise<{ readonly database: string; readonly dropped: readonly string[] }> {
  const guarded = assertTestDatabase(inputs);

  const current = await client.query("SELECT current_database()::text AS db");
  const connected = (current.rows[0] as { db?: string } | undefined)?.db;
  if (connected === undefined || !connected.endsWith("_test") || connected !== guarded.database) {
    throw new TestDatabaseGuardError(
      "database-name",
      "current_database()",
      "the connected database is not the guarded test database",
    );
  }

  const schemas = await listSchemasToDrop(client);
  for (const schema of schemas) {
    const statement = await client.query(
      "SELECT format('DROP SCHEMA %I CASCADE', $1::text) AS stmt",
      [schema],
    );
    await client.query((statement.rows[0] as { stmt: string }).stmt);
  }

  const migrate =
    options.migrate ??
    ((owner: OwnerClientLike) => runMigrations(owner as unknown as pg.PoolClient));
  await migrate(client);
  return { database: guarded.database, dropped: schemas };
}
