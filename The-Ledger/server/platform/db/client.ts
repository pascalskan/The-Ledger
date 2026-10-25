import pg from "pg";
import type { Logger } from "pino";
import { isVitest, type PoolSettings } from "../config";
import { TestDatabaseGuardError } from "../config/test-database";

// Phase 0 spec §3.5 (runtime role self-check, R2-10, R3-03, R3-12), §4.6 (RP-03).
//
// One pool per role, each built from an explicit settings object: `host`, `port`,
// `user`, `password`, `database`, `ssl` and `application_name` are all set, and
// `connectionString` is never used, so node-postgres never fills a field from PG*
// variables or ~/.pgpass.
//
// The pool itself is private. The only way to reach the database is `withClient(fn)`,
// which verifies each new pooled connection with ONE statement before `fn` runs
// (node-postgres does not await `pool.on('connect')` handlers, so a check attached
// there could run after the caller's first query). Modules have no pool at all.

/**
 * An error carrying this symbol tells `withClient` to destroy the client instead of returning
 * it to the pool. The unit of work sets it when it cannot leave the connection in a known
 * state, for example when ROLLBACK itself fails.
 */
export const DESTROY_CLIENT = Symbol.for("ledger.destroyClient");

function shouldDestroy(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as Record<symbol, unknown>)[DESTROY_CLIENT] === true;
}

/** What the runtime role self-check refused, in words that name the failed condition. */
export type RoleCheckFailure =
  | "platform tables missing"
  | "unexpected role"
  | "is superuser"
  | "bypasses row security"
  | "owns platform schema"
  | "unexpected memberships"
  | "can backdate audit"
  | "can change audit"
  | "can rewrite envelope"
  | "can update outbox"
  | "unexpected database"
  | "not a test database";

/** Thrown by `withClient` when the self-check refuses a connection. No statement of the caller's ran. */
export class RuntimeRoleError extends Error {
  readonly condition: RoleCheckFailure;
  readonly role: string;

  constructor(condition: RoleCheckFailure, role: string, detail?: string) {
    super(`Database connection refused: ${condition} (role ${role})${detail ? `: ${detail}` : ""}`);
    this.name = "RuntimeRoleError";
    this.condition = condition;
    this.role = role;
  }
}

/** The one statement run as a new connection's first statement. */
export const ROLE_CHECK_SQL = `
SELECT current_user::text AS current_user,
       current_database()::text AS current_database,
       r.rolsuper, r.rolbypassrls,
       EXISTS (SELECT 1 FROM pg_namespace n
                WHERE n.nspname IN ('audit','intelligence') AND n.nspowner = r.oid) AS owns_platform_schema,
       ARRAY(SELECT b.rolname::text FROM pg_roles b
              WHERE b.oid <> r.oid AND pg_has_role(r.oid, b.oid, 'MEMBER')
              ORDER BY 1)                                                       AS member_of,
       has_column_privilege('audit.audit_entries', 'occurred_at', 'INSERT')    AS can_backdate_audit,
       has_table_privilege('audit.audit_entries', 'UPDATE')
         OR has_table_privilege('audit.audit_entries', 'DELETE')                AS can_change_audit,
       has_column_privilege('intelligence.event_outbox', 'payload', 'UPDATE')  AS can_rewrite_envelope,
       has_any_column_privilege('intelligence.event_outbox', 'UPDATE')         AS can_update_outbox
  FROM pg_roles r WHERE r.rolname = current_user`;

interface RoleCheckRow {
  current_user: string;
  current_database: string;
  rolsuper: boolean;
  rolbypassrls: boolean;
  owns_platform_schema: boolean;
  member_of: string[];
  can_backdate_audit: boolean;
  can_change_audit: boolean;
  can_rewrite_envelope: boolean;
  can_update_outbox: boolean;
}

/** Applies the acceptance rules to the check's row. Returns the first failed condition, or undefined. */
export function evaluateRoleCheck(
  row: RoleCheckRow,
  expected: { role: string; database: string; forbidOutboxUpdate: boolean; testDatabaseOnly: boolean },
): RoleCheckFailure | undefined {
  if (row.current_user !== expected.role) return "unexpected role";
  if (row.rolsuper) return "is superuser";
  if (row.rolbypassrls) return "bypasses row security";
  if (row.owns_platform_schema) return "owns platform schema";
  // Exactly { ledger_runtime }: pg_has_role(..., 'MEMBER') follows memberships recursively, so a
  // role that is also a member of the owner, pg_write_all_data or any other role is refused.
  if (row.member_of.length !== 1 || row.member_of[0] !== "ledger_runtime") {
    return "unexpected memberships";
  }
  if (row.can_backdate_audit) return "can backdate audit";
  if (row.can_change_audit) return "can change audit";
  if (row.can_rewrite_envelope) return "can rewrite envelope";
  if (expected.forbidOutboxUpdate && row.can_update_outbox) return "can update outbox";
  if (row.current_database !== expected.database) return "unexpected database";
  if (expected.testDatabaseOnly && !row.current_database.endsWith("_test")) return "not a test database";
  return undefined;
}

export interface DbPool {
  /** The role this pool is for. */
  readonly role: string;
  /**
   * Runs `fn` on a pooled client. A new client is verified first (runtime pools). If the
   * check refuses it, the client is destroyed and `RuntimeRoleError` is thrown before `fn` runs.
   */
  withClient<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T>;
  /** Closes the pool. */
  end(): Promise<void>;
}

export interface CreatePoolOptions {
  readonly settings: PoolSettings;
  readonly logger: Logger;
  /** Default 10. */
  readonly max?: number;
  /**
   * When true (production), a refused connection is logged at FATAL and the process
   * exits with code 1. Otherwise the failing request or health check fails (503 or 500).
   */
  readonly exitOnRefusal?: boolean;
}

export interface CreateRuntimePoolOptions extends CreatePoolOptions {
  /** `ledger_app` for the API pool, `ledger_worker` for the worker pool. */
  readonly expectedRole: string;
}

function buildPool(settings: PoolSettings, max: number | undefined): pg.Pool {
  // Every field is set explicitly. Never `connectionString` (RP-03).
  return new pg.Pool({
    host: settings.host,
    port: settings.port,
    user: settings.user,
    password: settings.password,
    database: settings.database,
    ssl: settings.ssl === false ? false : { ...settings.ssl },
    application_name: settings.application_name,
    max: max ?? 10,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
  });
}

/** Under Vitest a pool may only name a `_test` database. Refused before connecting. */
function refuseNonTestDatabaseUnderVitest(settings: PoolSettings): void {
  if (isVitest() && !settings.database.endsWith("_test")) {
    throw new TestDatabaseGuardError(
      "database-name",
      "pool",
      "under Vitest a pool may only be created for a database whose name ends in _test",
    );
  }
}

function attachPoolErrorLogging(pool: pg.Pool, logger: Logger, role: string): void {
  // An idle client can fail (for example when the server restarts). Without a listener the
  // process would crash on the unhandled 'error' event.
  pool.on("error", (error) => {
    logger.warn({ err: error, role }, "Idle database client failed");
  });
}

/**
 * Creates the pool for a runtime role (`ledger_app` or `ledger_worker`). Every new
 * connection is verified by the self-check before the caller's first statement.
 */
export function createRuntimePool(options: CreateRuntimePoolOptions): DbPool {
  const { settings, logger, expectedRole } = options;
  refuseNonTestDatabaseUnderVitest(settings);
  const pool = buildPool(settings, options.max);
  attachPoolErrorLogging(pool, logger, expectedRole);

  const verified = new WeakSet<pg.PoolClient>();
  const testDatabaseOnly = isVitest();

  async function verify(client: pg.PoolClient): Promise<void> {
    let row: RoleCheckRow | undefined;
    try {
      const result = await client.query<RoleCheckRow>(ROLE_CHECK_SQL);
      row = result.rows[0];
    } catch (error) {
      const code = (error as { code?: unknown }).code;
      // The check reads the platform tables. An unmigrated database has none.
      if (code === "42P01" || code === "3F000") {
        throw new RuntimeRoleError("platform tables missing", expectedRole);
      }
      // Looking the tables up by name needs USAGE on their schemas, which only
      // ledger_runtime grants: a login role outside it is refused by the statement itself.
      if (code === "42501") {
        throw new RuntimeRoleError("unexpected memberships", expectedRole);
      }
      throw error;
    }
    const failure =
      row === undefined
        ? ("unexpected role" as const)
        : evaluateRoleCheck(row, {
            role: expectedRole,
            database: settings.database,
            forbidOutboxUpdate: expectedRole === "ledger_app",
            testDatabaseOnly,
          });
    if (failure !== undefined) {
      // The role name only; never the URL, password or host.
      throw new RuntimeRoleError(failure, row?.current_user ?? expectedRole);
    }
  }

  return {
    role: expectedRole,
    async withClient<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
      const client = await pool.connect();
      let refusal: Error | undefined;
      if (!verified.has(client)) {
        try {
          await verify(client);
          verified.add(client);
        } catch (error) {
          refusal = error instanceof Error ? error : new Error("role check failed");
        }
      }
      if (refusal !== undefined) {
        // release(err) destroys the client instead of returning it to the pool.
        client.release(refusal);
        if (refusal instanceof RuntimeRoleError) {
          logger.error(
            { condition: refusal.condition, role: refusal.role },
            "Database connection refused by the runtime role self-check",
          );
          if (options.exitOnRefusal === true) {
            logger.fatal(
              { condition: refusal.condition, role: refusal.role },
              "Refusing to run with an unexpected database role",
            );
            process.exit(1);
          }
        }
        throw refusal;
      }
      let destroy: Error | undefined;
      try {
        return await fn(client);
      } catch (error) {
        if (shouldDestroy(error)) destroy = error as Error;
        throw error;
      } finally {
        client.release(destroy);
      }
    },
    end: () => pool.end(),
  };
}

/**
 * Creates a pool for the OWNER (migration) role. For `npm run db:migrate` and the test
 * harness only; no runtime code may use it (§3.5). It runs no role self-check, because
 * the owner is the one role the self-check refuses. Under Vitest the connected database
 * must still end in `_test`.
 */
export function createOwnerPool(options: CreatePoolOptions): DbPool {
  const { settings, logger } = options;
  refuseNonTestDatabaseUnderVitest(settings);
  const pool = buildPool(settings, options.max ?? 4);
  attachPoolErrorLogging(pool, logger, settings.user);
  const testDatabaseOnly = isVitest();
  const checked = new WeakSet<pg.PoolClient>();

  return {
    role: settings.user,
    async withClient<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
      const client = await pool.connect();
      if (!checked.has(client)) {
        try {
          const result = await client.query<{ db: string }>("SELECT current_database()::text AS db");
          const db = result.rows[0]?.db;
          if (db !== settings.database) throw new RuntimeRoleError("unexpected database", settings.user);
          if (testDatabaseOnly && !db.endsWith("_test")) {
            throw new RuntimeRoleError("not a test database", settings.user);
          }
          checked.add(client);
        } catch (error) {
          client.release(error instanceof Error ? error : new Error("database check failed"));
          throw error;
        }
      }
      let destroy: Error | undefined;
      try {
        return await fn(client);
      } catch (error) {
        if (shouldDestroy(error)) destroy = error as Error;
        throw error;
      } finally {
        client.release(destroy);
      }
    },
    end: () => pool.end(),
  };
}
