import { AsyncLocalStorage } from "node:async_hooks";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import type pg from "pg";
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
} from "../errors/platform-errors";
import { createOutboxWriter, type OutboxWriter } from "../events/outbox-writer";
import { markForClientDestruction, type DbPool } from "./client";
import type { UnitPoison, UnitState } from "./unit-state";

// PS-12, Phase 0 spec §4.4: the Unit of Work.
//
// `runInTransaction` opens ONE transaction (READ COMMITTED), sets `app.company_id`
// (transaction-local, for Phase 9's row level security), runs the work, and commits or
// rolls back. A failed audit or outbox write poisons the unit: it then cannot commit, even
// if the work caught the error and returned normally. A closed unit refuses all use. There
// is no nesting and no savepoint.

/** The transaction handle passed to repositories. It has no `transaction()`: that would be a savepoint (R2-06). */
export type DbTransaction = Omit<NodePgDatabase<Record<string, never>>, "transaction"> & {
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
 * The client the unit's SQL runs on. After the unit closes, every use throws
 * UnitOfWorkClosedError, so a stale reference can never run on a connection that has
 * since been returned to the pool and given to someone else.
 */
function guardClient(client: pg.PoolClient, isClosed: () => boolean): pg.PoolClient {
  return new Proxy(client, {
    get(target, property) {
      if (property === "query") {
        return (...args: unknown[]) => {
          if (isClosed()) throw new UnitOfWorkClosedError();
          return (target.query as (...a: unknown[]) => unknown)(...args);
        };
      }
      const value = Reflect.get(target, property, target) as unknown;
      return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(target) : value;
    },
  });
}

function createTransactionHandle(client: pg.PoolClient, isClosed: () => boolean): DbTransaction {
  const database = drizzle(client);
  return new Proxy(database, {
    get(target, property, receiver) {
      if (isClosed() && typeof property === "string" && property !== "then") {
        throw new UnitOfWorkClosedError();
      }
      // The raw client and the session that holds it are not part of the handle: with them a
      // module could issue COMMIT, ROLLBACK or SET ROLE itself (import rule 10 forbids it
      // statically; this makes it impossible at run time too).
      if (property === "$client" || property === "session") return undefined;
      if (property === "transaction") {
        // Drizzle's transaction() issues a savepoint when called inside a transaction.
        return async () => {
          throw new NestedUnitOfWorkError();
        };
      }
      const value = Reflect.get(target, property, target) as unknown;
      return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(target) : value;
    },
  }) as unknown as DbTransaction;
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
  }
}

export function createUnitOfWorkRunner(options: UnitOfWorkRunnerOptions): UnitOfWorkRunner {
  const { pool } = options;
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
        client: guardClient(rawClient, () => state.closed),
        auditCatalogue,
        eventCatalogue,
        closed: false,
        poison: undefined,
      };
      let committed = false;
      try {
        await rawClient.query("BEGIN ISOLATION LEVEL READ COMMITTED");
        await rawClient.query("SELECT set_config('app.company_id', $1, true)", [context.companyId]);
        const tx = createTransactionHandle(state.client, () => state.closed);
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
