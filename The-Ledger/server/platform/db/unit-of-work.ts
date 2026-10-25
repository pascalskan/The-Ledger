import { AsyncLocalStorage } from "node:async_hooks";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { PgDialect } from "drizzle-orm/pg-core";
import type pg from "pg";
import type { Logger } from "pino";
import { createAuditWriter, type AuditWriter } from "../audit/audit-writer";
import { EMPTY_CATALOGUE, type TypeCatalogue } from "../audit/catalogue";
import {
  assertLiveContext,
  expireContext,
  type ExecutionContext,
} from "../context/execution-context";
import {
  AuditWriteFailedError,
  ForgedContextError,
  HumanActorRequiredError,
  NestedUnitOfWorkError,
  OutboxWriteFailedError,
  UnitOfWorkAbortedError,
  UnitOfWorkClosedError,
  UnitOfWorkIntegrityError,
} from "../errors/platform-errors";
import { createOutboxWriter, type OutboxWriter } from "../events/outbox-writer";
import { markForClientDestruction, type DbPool } from "./client";
import { poisonUnit, type UnitPoison, type UnitState } from "./unit-state";

// PS-12, Phase 0 spec §4.4: the Unit of Work.
//
// `runInTransaction` opens ONE transaction (READ COMMITTED), sets `app.company_id`
// (transaction-local, for Phase 9's row level security), runs the work, and commits or
// rolls back. A failed audit or outbox write poisons the unit: it then cannot commit, even
// if the work caught the error and returned normally. A closed unit refuses all use. There
// is no nesting and no savepoint. Just before COMMIT one statement checks that the unit is
// still the same transaction, run by the same role, for the same company.

/**
 * The transaction handle passed to repositories: an ALLOWLISTED facade over Drizzle's
 * builders, not Drizzle's database object. It has no `transaction()` (that would be a
 * savepoint, R2-06), and no `$client`, `session`, `_` or `query`, which reach the raw connection.
 */
export type DbTransaction = Pick<
  NodePgDatabase<Record<string, never>>,
  | "select"
  | "selectDistinct"
  | "selectDistinctOn"
  | "insert"
  | "update"
  | "delete"
  | "execute"
  | "with"
  | "$with"
  | "$count"
  | "refreshMaterializedView"
> & {
  transaction(...args: unknown[]): Promise<never>;
};

export interface UnitOfWork {
  readonly context: ExecutionContext;
  /** Passed to repositories; never used by the Application Layer for SQL. */
  readonly tx: DbTransaction;
  /** The only way to write audit entries. */
  readonly audit: AuditWriter;
  /** The only way to write outbox events. */
  readonly events: OutboxWriter;
}

export interface UnitOfWorkRunnerOptions {
  /** The API's `ledger_app` pool or the worker's `ledger_worker` pool. */
  readonly pool: DbPool;
  readonly auditCatalogue?: TypeCatalogue;
  readonly eventCatalogue?: TypeCatalogue;
  /** Used to report an integrity failure at ERROR. */
  readonly logger?: Logger;
}

export interface RunOptions {
  /** Subscriber contexts die when their unit closes (spec §4.1). */
  readonly expireContextWhenClosed?: boolean;
}

export type RunInTransaction = <T>(
  context: ExecutionContext,
  work: (uow: UnitOfWork) => Promise<T>,
) => Promise<T>;

export interface UnitOfWorkRunner {
  /** Runs a unit bound to `module`. */
  run<T>(
    module: string,
    context: unknown,
    work: (uow: UnitOfWork) => Promise<T>,
    options?: RunOptions,
  ): Promise<T>;
  /** `runInTransaction` bound to one module's registration name (R3-10): what `ModuleDeps` carries. */
  forModule(module: string): RunInTransaction;
}

/** The unit active in the current async context, if any. */
const activeUnit = new AsyncLocalStorage<UnitState>();

/** Views are mapped back to their shared state, for `adoptUnit`. */
const viewStates = new WeakMap<object, { state: UnitState; tx: DbTransaction }>();

/**
 * The client the unit's SQL runs on, seen through a proxy that exposes ONE thing: `query`.
 * After the unit closes, `query` throws UnitOfWorkClosedError, so a stale reference can never
 * run on a connection that has since been returned to the pool and given to someone else.
 * Everything else is hidden, however a module reaches the proxy (a query builder's private
 * `session`, for example): no `release` (which would hand the connection to another request
 * inside this transaction), no `end`, and no `password`, `connectionParameters` or
 * `connection`. The platform's own BEGIN, COMMIT and ROLLBACK use the raw client.
 */
/** The stand-in prototype of the guarded client: it is not a pg Client or Pool, and has no methods. */
class GuardedClient {}

function guardClient(client: pg.PoolClient, state: () => UnitState): pg.PoolClient {
  const query = (...args: unknown[]) => {
    const unit = state();
    if (unit.closed) throw new UnitOfWorkClosedError();
    // The same statement check as tx.execute: a module that reaches this function through a query
    // builder's private session gets no further than the facade.
    const first = args[0];
    const text = typeof first === "string" ? first : (first as { text?: unknown } | null)?.text;
    if (typeof text === "string") refuseTransactionControl(unit, text);
    return (client.query as (...a: unknown[]) => unknown)(...args);
  };
  return new Proxy(client, {
    // `constructor` is what Drizzle reads to tell a client from a config object.
    get: (_target, property) => (property === "query" ? query : property === "constructor" ? GuardedClient : undefined),
    has: () => false,
    ownKeys: () => [],
    getOwnPropertyDescriptor: () => undefined,
    getPrototypeOf: () => GuardedClient.prototype,
    set: () => false,
    defineProperty: () => false,
    deleteProperty: () => false,
  });
}

const TRANSACTION_CONTROL =
  /^(begin|start|commit|end|rollback|abort|savepoint|release|prepare|execute|deallocate|set|reset|discard|do|call|load)$/i;

/**
 * Statements that change the transaction or the session are refused before they are sent: a
 * COMMIT or ROLLBACK issued through the unit would end the transaction behind the platform's
 * back, and the module's earlier writes would then persist even if the audit write fails; SET
 * ROLE or set_config would change who the unit runs as, or whose company it is. The check reads
 * the statement text only (comments and quoted strings removed). It is a first line of defence:
 * the pre-COMMIT integrity check is the one that cannot be bypassed.
 */
export function assertNoTransactionControl(text: string): void {
  const stripped = text
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\n]*/g, " ")
    .replace(/\$([A-Za-z_]\w*)?\$[\s\S]*?\$\1\$/g, "''")
    .replace(/'(?:[^']|'')*'/g, "''");
  if (/\bset_config\s*\(/i.test(stripped)) {
    throw new UnitOfWorkIntegrityError("set_config is not allowed inside a unit of work");
  }
  for (const statement of stripped.split(";")) {
    const first = /^[\s(]*([A-Za-z_]+)/.exec(statement)?.[1];
    if (first !== undefined && TRANSACTION_CONTROL.test(first)) {
      throw new UnitOfWorkIntegrityError(`${first.toUpperCase()} is not allowed inside a unit of work`);
    }
  }
}

/** Refuses transaction-control SQL, and poisons the unit so that even a swallowed refusal cannot commit. */
function refuseTransactionControl(unit: UnitState, text: string): void {
  try {
    assertNoTransactionControl(text);
  } catch (error) {
    if (error instanceof UnitOfWorkIntegrityError) poisonUnit(unit, "integrity", error);
    throw error;
  }
}

const dialect = new PgDialect();

const ALLOWED_TX_MEMBERS = [
  "select",
  "selectDistinct",
  "selectDistinctOn",
  "insert",
  "update",
  "delete",
  "with",
  "$with",
  "$count",
  "refreshMaterializedView",
] as const;

function createTransactionHandle(state: UnitState): DbTransaction {
  const database = drizzle(state.client) as unknown as Record<string, (...args: unknown[]) => unknown>;
  const facade: Record<string, unknown> = {};
  for (const member of ALLOWED_TX_MEMBERS) {
    facade[member] = (...args: unknown[]) => {
      if (state.closed) throw new UnitOfWorkClosedError();
      return database[member]!(...args);
    };
  }
  facade.execute = (query: unknown) => {
    if (state.closed) throw new UnitOfWorkClosedError();
    const text =
      typeof query === "string" ? query : dialect.sqlToQuery((query as { getSQL(): never }).getSQL()).sql;
    refuseTransactionControl(state, text);
    return database.execute!(query);
  };
  // Drizzle's transaction() issues a savepoint when called inside a transaction.
  facade.transaction = async () => {
    throw new NestedUnitOfWorkError();
  };
  return Object.freeze(facade) as unknown as DbTransaction;
}

function createView(state: UnitState, module: string, tx: DbTransaction): UnitOfWork {
  const view: UnitOfWork = Object.freeze({
    context: state.context,
    tx,
    audit: createAuditWriter(state, module),
    events: createOutboxWriter(state, module),
  });
  viewStates.set(view, { state, tx });
  return view;
}

/**
 * Returns a view of the SAME unit (same transaction, context and poison state) bound to
 * another module (R3-10). A module's public function that writes, and is called with
 * another module's `uow`, calls `deps.adopt(uow)` first; without it, the callee's writes
 * are refused as another module's. The port wrapper adopts automatically (PS-16).
 */
export function adoptUnit(uow: UnitOfWork, module: string): UnitOfWork {
  const shared = viewStates.get(uow);
  if (shared === undefined) throw new ForgedContextError("The unit of work was not created by the platform");
  return createView(shared.state, module, shared.tx);
}

/** Platform-internal: the shared state of a unit, or undefined if `uow` was not created by the platform. */
export function unitStateOf(uow: UnitOfWork): UnitState | undefined {
  return viewStates.get(uow)?.state;
}

/** The error `runInTransaction` rejects with when the unit was poisoned but the work returned normally. */
function poisonError(poison: UnitPoison): Error {
  switch (poison.kind) {
    case "audit":
      return new AuditWriteFailedError("The unit of work was rolled back because an audit write failed", {
        cause: poison.cause,
      });
    case "outbox":
      return new OutboxWriteFailedError("The unit of work was rolled back because an event write failed", {
        cause: poison.cause,
      });
    case "human":
      return new HumanActorRequiredError("The unit of work was rolled back because a human-only call was refused", {
        cause: poison.cause,
      });
    case "integrity":
      return poison.cause instanceof UnitOfWorkIntegrityError
        ? poison.cause
        : new UnitOfWorkIntegrityError("a statement changed the transaction", { cause: poison.cause });
  }
}

export function createUnitOfWorkRunner(options: UnitOfWorkRunnerOptions): UnitOfWorkRunner {
  const { pool, logger } = options;
  const auditCatalogue = options.auditCatalogue ?? EMPTY_CATALOGUE;
  const eventCatalogue = options.eventCatalogue ?? EMPTY_CATALOGUE;

  async function run<T>(
    module: string,
    context: unknown,
    work: (uow: UnitOfWork) => Promise<T>,
    runOptions: RunOptions = {},
  ): Promise<T> {
    // Checks before the transaction opens: no SQL, and no connection, if any fails.
    assertLiveContext(context);
    const active = activeUnit.getStore();
    if (active !== undefined && !active.closed) throw new NestedUnitOfWorkError();

    return pool.withClient(async (rawClient) => {
      const state: UnitState = {
        context,
        client: guardClient(rawClient, () => state),
        auditCatalogue,
        eventCatalogue,
        closed: false,
        poison: undefined,
      };
      let committed = false;
      try {
        await rawClient.query("BEGIN ISOLATION LEVEL READ COMMITTED");
        // One statement sets the tenant AND captures the transaction's identity for the pre-COMMIT check.
        const began = await rawClient.query<{ started: string }>(
          "SELECT set_config('app.company_id', $1, true), transaction_timestamp()::text AS started",
          [context.companyId],
        );
        const startedAt = began.rows[0]?.started;
        const tx = createTransactionHandle(state);
        const uow = createView(state, module, tx);

        let value: T;
        try {
          value = await activeUnit.run(state, () => work(uow));
        } finally {
          // The unit ends the moment the work settles, on success AND on failure, BEFORE the
          // COMMIT or ROLLBACK is sent. Until then a late or un-awaited append, record or tx call
          // (a timer, a stray Promise.all) would pass every closed check during that round trip
          // and run in autocommit once the transaction ends - an audit row for rolled-back work.
          // The platform's own COMMIT and ROLLBACK go through rawClient, not the guarded client.
          state.closed = true;
        }

        if (state.poison !== undefined) throw poisonError(state.poison);

        // Pre-COMMIT integrity check (one statement): it is still the SAME transaction, run by the
        // pool's role, for this company. A COMMIT, ROLLBACK, BEGIN, SET ROLE or set_config issued
        // through the unit by any route changes at least one of these.
        let check: { rows: { started: string; role: string; company: string | null }[] };
        try {
          check = await rawClient.query(
            "SELECT transaction_timestamp()::text AS started, current_user::text AS role, current_setting('app.company_id', true) AS company",
          );
        } catch (error) {
          // 25P02: an earlier statement failed and the work caught the error. The transaction is
          // aborted and could only ever roll back; say so (the same as a COMMIT that reports ROLLBACK).
          if ((error as { code?: unknown }).code === "25P02") throw new UnitOfWorkAbortedError({ cause: error });
          throw error;
        }
        const seen = check.rows[0];
        const changed =
          seen === undefined || startedAt === undefined || seen.started !== startedAt
            ? "the transaction changed"
            : seen.role !== pool.role
              ? "the database role changed"
              : seen.company !== context.companyId
                ? "the company setting changed"
                : undefined;
        if (changed !== undefined) {
          logger?.error({ condition: changed, module }, "Unit of work integrity check failed; the connection is destroyed");
          // Rolled back by the catch below if the connection is still in a transaction; destroyed either way.
          throw markForClientDestruction(new UnitOfWorkIntegrityError(changed));
        }

        const result = await rawClient.query("COMMIT");
        committed = true;
        // COMMIT of a transaction the database has already aborted reports ROLLBACK without
        // raising an error (an earlier failed statement was caught by the work).
        if (result.command === "ROLLBACK") throw new UnitOfWorkAbortedError();
        return value;
      } catch (error) {
        let toThrow: unknown = error;
        if (!committed) {
          try {
            await rawClient.query("ROLLBACK");
          } catch {
            // The connection is in an unknown state: it must not return to the pool.
            toThrow = markForClientDestruction(error);
          }
        }
        throw toThrow;
      } finally {
        state.closed = true;
        if (runOptions.expireContextWhenClosed === true) expireContext(context);
      }
    });
  }

  return {
    run,
    forModule: (module) => (context, work) => run(module, context, work),
  };
}
