import { randomUUID } from "node:crypto";
import { hostname } from "node:os";
import { setTimeout as sleep } from "node:timers/promises";
import { sql } from "drizzle-orm";
import type { Logger } from "pino";
import type { OutboxSettings } from "../config";
import { runWithLogContext } from "../context/request-context";
import { createExecutionContext, toCompanyId } from "../context/execution-context";
import { markForClientDestruction, RuntimeRoleError, type DbPool } from "../db/client";
import type { UnitOfWorkRunner } from "../db/unit-of-work";
import { LockLostError } from "../errors/platform-errors";
import { isErrorObject, safeError } from "../logging/error-serializer";
import type { EventEnvelope, RegisteredSubscriber, SubscriberRegistry } from "./subscriber-registry";

// PS-17 to PS-20, Phase 0 spec §4.5: the outbox delivery worker.
//
// Built from STEP FUNCTIONS (claim, recover, run one subscriber, refresh the heartbeat,
// finish, fail) so that server/platform/testing/ can decorate them with the test-only hooks
// `afterSubscriber` and `beforeFinish` (spec §9.1, R3-07). The production factory
// `createOutboxWorker(deps)` takes NO hooks option and its code contains no hook call.

/** An `intelligence.event_outbox` row as the claim returns it. */
export interface OutboxRow {
  outbox_id: string;
  event_id: string;
  event_type: string;
  event_version: string;
  source_module: string;
  company_id: string;
  actor_id: string | null;
  source_object_type: string;
  source_object_id: string;
  payload: Record<string, unknown>;
  job_id: string | null;
  causation_event_id: string | null;
  causation_actor_id: string | null;
  occurred_at: Date;
  created_at: Date;
  next_attempt_at: Date;
  status: string;
  retry_count: number;
  delivered_subscribers: string[];
}

export interface SubscriberFailure {
  readonly subscriber: string;
  readonly error: unknown;
}

export interface OutboxWorkerDeps {
  /** The `ledger_worker` pool. */
  readonly pool: DbPool;
  /** The process's runner, carrying the registry's catalogues. */
  readonly runner: UnitOfWorkRunner;
  readonly subscribers: SubscriberRegistry;
  readonly settings: OutboxSettings;
  readonly logger: Logger;
  /** `<hostname>:<pid>:<8 random hex>` by default (PS-03). */
  readonly instanceId?: string;
}

/** The steps the worker is made of. The testing surface decorates `runSubscriber` and `finish`. */
export interface OutboxSteps {
  readonly instanceId: string;
  /** PS-20. */
  recover(): Promise<void>;
  /** PS-17. */
  claim(): Promise<OutboxRow[]>;
  /**
   * PS-18 step 0 and the heartbeat after each subscriber: refreshes the lock of every row this
   * worker holds and returns their outbox IDs, so the first call also answers "do I still hold
   * this row?" (review round 3, minor 5: one statement where there were two).
   */
  refreshHeld(): Promise<readonly string[]>;
  /** PS-18 step 2: one subscriber, in its own unit of work. Throws LockLostError if the claim was lost. */
  runSubscriber(row: OutboxRow, entry: RegisteredSubscriber, runId: string): Promise<void>;
  /** PS-18 step 3. Throws LockLostError if the claim was lost (and rolls back). */
  finish(row: OutboxRow): Promise<void>;
  /** PS-19. Returns false when the claim was lost. */
  fail(row: OutboxRow, failures: readonly SubscriberFailure[]): Promise<boolean>;
  /**
   * On stop(): hands back claimed rows the worker has not started, unchanged and without
   * counting an attempt, so they are not left locked until the stale-lock timeout.
   */
  release(rows: readonly OutboxRow[]): Promise<void>;
}

export interface OutboxWorker {
  readonly instanceId: string;
  /** One cycle: recover stale locks, claim a batch, deliver each row. Resolves when done. */
  runOnce(): Promise<{ claimed: number }>;
  /** Begins the loop. */
  start(): void;
  /** Ends the loop: finishes the event in hand and claims no more. */
  stop(): Promise<void>;
}

export function newInstanceId(): string {
  return `${hostname()}:${process.pid}:${randomUUID().replace(/-/g, "").slice(0, 8)}`;
}

const MAX_LAST_ERROR = 1000;

/** A safe one-line summary of an error: the serializer's name, code and message, never more. */
export function summarizeError(error: unknown): string {
  const safe = (isErrorObject(error) ? safeError(error) : { name: "NonError" }) as Record<string, unknown>;
  const code = safe.code ?? safe.pgCode ?? safe.type;
  const parts = [safe.name, code, safe.message].filter((part): part is string => typeof part === "string" && part !== "");
  return parts.join(": ");
}

const INFRASTRUCTURE_CODES = new Set(["57P01", "57P02", "57P03", "ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EPIPE"]);
const INFRASTRUCTURE_MESSAGES = /^(Connection terminated|timeout exceeded when trying to connect|Client has encountered a connection error|Cannot use a pool after calling end)/;

/**
 * True when a failure is the database or the network, not the subscriber: a refused role check,
 * a connection-class SQLSTATE (class 08, 57P01/57P02/57P03), a socket error, or a pool timeout -
 * on the error itself or on its cause chain (three levels). Such a failure is never counted as
 * a subscriber's failed attempt: a ~15 second database failover must not dead-letter events.
 */
export function isInfrastructureError(error: unknown, depth = 0): boolean {
  if (error instanceof RuntimeRoleError) return true;
  if (typeof error !== "object" || error === null) return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  if (typeof code === "string" && (code.startsWith("08") || INFRASTRUCTURE_CODES.has(code))) return true;
  if (typeof message === "string" && INFRASTRUCTURE_MESSAGES.test(message)) return true;
  return depth < 3 && "cause" in error && isInfrastructureError((error as { cause?: unknown }).cause, depth + 1);
}

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

/**
 * The envelope ONE subscriber receives (review round 2, minor 7). Each subscriber gets its own
 * deep copy of the payload, deep-frozen: one subscriber cannot change what the next one sees, and
 * cannot change what the worker itself writes to the event log.
 */
function envelopeOf(row: OutboxRow): EventEnvelope {
  return deepFreeze({
    eventId: row.event_id,
    eventType: row.event_type,
    eventVersion: row.event_version,
    occurredAt: row.occurred_at.toISOString(),
    companyId: toCompanyId(row.company_id),
    actorId: row.actor_id,
    sourceObjectId: row.source_object_id,
    sourceObjectType: row.source_object_type,
    jobId: row.job_id,
    payload: structuredClone(row.payload),
  });
}

const CLAIM_SQL = `
UPDATE intelligence.event_outbox
   SET status = 'processing', locked_at = now(), locked_by = $1
 WHERE outbox_id IN (
         SELECT outbox_id FROM intelligence.event_outbox
          WHERE status IN ('pending', 'failed') AND next_attempt_at <= now()
          ORDER BY next_attempt_at, created_at
          LIMIT $2
          FOR UPDATE SKIP LOCKED)
RETURNING *`;

/** The backoff / dead-letter arithmetic shared by PS-19 and PS-20 (evaluated against the pre-update retry_count). */
const FAIL_SET = `
       retry_count      = retry_count + 1,
       status           = CASE WHEN retry_count + 1 >= $MAX THEN 'dead_lettered' ELSE 'failed' END,
       next_attempt_at  = now() + make_interval(secs => $BASE::double precision / 1000.0 * power(2, retry_count)),
       dead_lettered_at = CASE WHEN retry_count + 1 >= $MAX THEN now() ELSE NULL END,
       locked_at = NULL, locked_by = NULL`;

export const RECOVER_SQL = `
UPDATE intelligence.event_outbox
   SET ${FAIL_SET.replaceAll("$MAX", "$1").replaceAll("$BASE", "$2")},
       last_error = 'stale lock: ' || locked_by || ' did not finish within the lock timeout'
 WHERE status = 'processing' AND locked_at < now() - make_interval(secs => $3::double precision / 1000.0)
RETURNING outbox_id, event_id, event_type, company_id, status, retry_count`;

const FAIL_SQL = `
UPDATE intelligence.event_outbox
   SET ${FAIL_SET.replaceAll("$MAX", "$3").replaceAll("$BASE", "$4")},
       last_error = $5
 WHERE outbox_id = $1 AND status = 'processing' AND locked_by = $2
RETURNING retry_count, status`;

/** The plain (production) steps. */
export function createOutboxSteps(deps: OutboxWorkerDeps): OutboxSteps {
  const { pool, runner, settings, logger } = deps;
  const instanceId = deps.instanceId ?? newInstanceId();

  return {
    instanceId,

    async recover() {
      const result = await pool.withClient((client) =>
        client.query<{ outbox_id: string; event_id: string; event_type: string; company_id: string; status: string; retry_count: number }>(
          RECOVER_SQL,
          [settings.maxAttempts, settings.baseBackoffMs, settings.staleLockMs],
        ),
      );
      for (const row of result.rows) {
        const fields = {
          eventId: row.event_id,
          eventType: row.event_type,
          companyId: row.company_id,
          attempt: row.retry_count,
        };
        if (row.status === "dead_lettered") logger.error(fields, "Event dead-lettered after a stale lock");
        else logger.warn(fields, "Recovered a stale lock");
      }
    },

    async claim() {
      const result = await pool.withClient((client) =>
        client.query<OutboxRow>(CLAIM_SQL, [instanceId, settings.batchSize]),
      );
      // RETURNING order is not guaranteed; deliver in claim order (oldest first).
      return [...result.rows].sort(
        (a, b) =>
          a.next_attempt_at.getTime() - b.next_attempt_at.getTime() ||
          a.created_at.getTime() - b.created_at.getTime(),
      );
    },

    async refreshHeld() {
      const result = await pool.withClient((client) =>
        client.query<{ outbox_id: string }>(
          "UPDATE intelligence.event_outbox SET locked_at = now() WHERE status = 'processing' AND locked_by = $1 RETURNING outbox_id",
          [instanceId],
        ),
      );
      return result.rows.map((held) => held.outbox_id);
    },

    async runSubscriber(row, entry, runId) {
      const { subscriber, module } = entry;
      const context = createExecutionContext({
        companyId: toCompanyId(row.company_id),
        actor: { kind: "system", component: subscriber.name },
        causation: {
          eventId: row.event_id,
          // the nearest human in the chain (spec 4.1): kept off the context module code can see
          humanActorId: row.actor_id ?? row.causation_actor_id,
        },
        runId,
      });
      await runner.run(
        module,
        context,
        async (uow) => {
          await subscriber.handle(envelopeOf(row), uow);
          // Record that this subscriber has handled the event, in the same transaction, fenced
          // by the claim: a worker that has lost its claim cannot commit a subscriber's work.
          const marked = await uow.tx.execute(sql`
            UPDATE intelligence.event_outbox
               SET delivered_subscribers = array_append(delivered_subscribers, ${subscriber.name}),
                   locked_at = now()
             WHERE outbox_id = ${row.outbox_id} AND status = 'processing' AND locked_by = ${instanceId}
               AND NOT (${subscriber.name} = ANY(delivered_subscribers))`);
          if (marked.rowCount !== 1) throw new LockLostError();
        },
        { expireContextWhenClosed: true },
      );
    },

    async finish(row) {
      await pool.withClient(async (client) => {
        await client.query("BEGIN");
        try {
          // Copied from the outbox row, in the database, while this worker still holds it.
          await client.query(
            `INSERT INTO intelligence.event_log
               (event_id, event_type, event_version, source_module, company_id, actor_id,
                source_object_type, source_object_id, job_id, payload,
                causation_event_id, causation_actor_id, occurred_at)
             SELECT event_id, event_type, event_version, source_module, company_id, actor_id,
                    source_object_type, source_object_id, job_id, payload,
                    causation_event_id, causation_actor_id, occurred_at
               FROM intelligence.event_outbox
              WHERE outbox_id = $1 AND status = 'processing' AND locked_by = $2
             ON CONFLICT (event_id) DO NOTHING`,
            [row.outbox_id, instanceId],
          );
          const delivered = await client.query(
            `UPDATE intelligence.event_outbox
                SET status = 'delivered', delivered_at = now(), locked_at = NULL, locked_by = NULL
              WHERE outbox_id = $1 AND status = 'processing' AND locked_by = $2`,
            [row.outbox_id, instanceId],
          );
          if (delivered.rowCount !== 1) throw new LockLostError();
          await client.query("COMMIT");
        } catch (error) {
          try {
            await client.query("ROLLBACK");
          } catch {
            // The connection is in an unknown state: destroy it, and still report the ORIGINAL error.
            throw markForClientDestruction(error);
          }
          throw error;
        }
      });
    },

    async release(rows) {
      if (rows.length === 0) return;
      await pool.withClient((client) =>
        client.query(
          `UPDATE intelligence.event_outbox
              SET status = CASE WHEN retry_count > 0 THEN 'failed' ELSE 'pending' END,
                  locked_at = NULL, locked_by = NULL
            WHERE outbox_id = ANY($1::uuid[]) AND status = 'processing' AND locked_by = $2`,
          [rows.map((row) => row.outbox_id), instanceId],
        ),
      );
    },

    async fail(row, failures) {
      const lastError = failures
        .map((failure) => `${failure.subscriber}: ${summarizeError(failure.error)}`)
        .join("; ")
        .slice(0, MAX_LAST_ERROR);
      const result = await pool.withClient((client) =>
        client.query<{ retry_count: number; status: string }>(FAIL_SQL, [
          row.outbox_id,
          instanceId,
          settings.maxAttempts,
          settings.baseBackoffMs,
          lastError,
        ]),
      );
      const updated = result.rows[0];
      if (updated === undefined) return false;
      const fields = {
        eventId: row.event_id,
        eventType: row.event_type,
        companyId: row.company_id,
        subscribers: failures.map((f) => f.subscriber),
        attempt: updated.retry_count,
      };
      if (updated.status === "dead_lettered") logger.error(fields, "Event dead-lettered");
      else logger.warn(fields, "Event delivery failed; it will be retried");
      return true;
    },
  };
}

/** The production worker: the plain steps, no hooks. */
export function createOutboxWorker(deps: OutboxWorkerDeps): OutboxWorker {
  return createOutboxWorkerFromSteps(deps, createOutboxSteps(deps));
}

/**
 * Builds the worker loop from a set of steps. Production passes the plain steps; the test-only
 * factory in server/platform/testing/ passes decorated ones.
 */
export function createOutboxWorkerFromSteps(
  deps: Pick<OutboxWorkerDeps, "subscribers" | "settings" | "logger">,
  steps: OutboxSteps,
): OutboxWorker {
  const { subscribers, settings, logger } = deps;
  // A stop was requested and has not yet taken effect: the loop ends, and a batch in hand hands
  // its unstarted rows back. It is reset once the loop has ended, or - with no loop - when the
  // run in flight has finished, so a later runOnce() works.
  let stopRequested = false;
  let inRun = 0;
  let loop: Promise<void> | undefined;
  let wake: AbortController | undefined;

  async function deliver(row: OutboxRow, runId: string): Promise<void> {
    // 0. Refresh the whole batch's locks; the answer says whether this row is still ours.
    const held = await steps.refreshHeld();
    if (!held.includes(row.outbox_id)) {
      logger.warn({ eventId: row.event_id, eventType: row.event_type }, "Claim lost before the event was handled; skipping it");
      return;
    }

    // 1. Prepare: the subscribers still to run.
    const done = new Set(row.delivered_subscribers);
    const pending = subscribers.subscribersFor(row.event_type).filter((entry) => !done.has(entry.subscriber.name));

    // 2. Call each subscriber in its own unit; a failing one does not hold back the others.
    const failures: SubscriberFailure[] = [];
    for (const [index, entry] of pending.entries()) {
      try {
        await steps.runSubscriber(row, entry, runId);
      } catch (error) {
        if (error instanceof LockLostError) {
          // Another worker owns the event now: stop at once and record nothing more.
          logger.warn({ eventId: row.event_id, eventType: row.event_type, companyId: row.company_id, subscriber: entry.subscriber.name }, "Claim lost during delivery; stopping this event");
          return;
        }
        // A database or network failure is not the subscriber's fault: do not count an attempt.
        // runOnce hands this row and the rest back, and the loop waits a poll interval.
        if (isInfrastructureError(error)) throw error;
        failures.push({ subscriber: entry.subscriber.name, error });
        logger.warn(
          { err: error, eventId: row.event_id, eventType: row.event_type, companyId: row.company_id, subscriber: entry.subscriber.name, attempt: row.retry_count + 1 },
          "Subscriber failed",
        );
        continue;
      }
      // Heartbeat after each subscriber commits (R3-04) - for the OTHER rows this worker holds.
      // This row's own lock is refreshed by the subscriber's unit (it marks the subscriber done
      // and sets locked_at) and by finish, so with no other row held, and nothing after the last
      // subscriber but finish, the heartbeat has nobody to protect.
      if (held.length > 1 || index < pending.length - 1) await steps.refreshHeld();
    }

    // 3. Finish, or 4. record the failed attempt.
    if (failures.length === 0) {
      try {
        await steps.finish(row);
      } catch (error) {
        if (error instanceof LockLostError) {
          logger.warn({ eventId: row.event_id, eventType: row.event_type, companyId: row.company_id }, "Claim lost before the event was finished; not counted as an attempt");
          return;
        }
        throw error;
      }
    } else if (!(await steps.fail(row, failures))) {
      logger.warn({ eventId: row.event_id, eventType: row.event_type, companyId: row.company_id }, "Claim lost before the failure was recorded");
    }
  }

  async function runOnce(): Promise<{ claimed: number }> {
    inRun++;
    try {
      await steps.recover();
      const rows = await steps.claim();
      let index = 0;
      try {
        for (; index < rows.length; index++) {
          if (stopRequested) {
            await steps.release(rows.slice(index));
            index = rows.length;
            break;
          }
          const row = rows[index]!;
          const runId = randomUUID();
          await runWithLogContext({ runId, companyId: row.company_id }, () => deliver(row, runId));
        }
      } catch (error) {
        // Whatever went wrong, the claimed rows must not stay locked (the heartbeat would keep them
        // locked for ever): hand back the row in hand and the rest, unchanged and without counting an
        // attempt, then let the loop log the failure and wait.
        await steps.release(rows.slice(index)).catch((releaseError: unknown) => {
          logger.error({ err: releaseError }, "Could not hand claimed rows back after a failure; the stale-lock recovery will");
        });
        throw error;
      }
      return { claimed: rows.length };
    } finally {
      inRun--;
      if (inRun === 0 && loop === undefined) stopRequested = false;
    }
  }

  async function run(): Promise<void> {
    while (!stopRequested) {
      let wait = true;
      try {
        const { claimed } = await runOnce();
        // A full batch means there may be more: go again at once.
        wait = claimed < settings.batchSize;
      } catch (error) {
        logger.error({ err: error }, "The outbox worker loop failed; it will carry on");
      }
      if (stopRequested || !wait) continue;
      wake = new AbortController();
      await sleep(settings.pollIntervalMs, undefined, { signal: wake.signal }).catch(() => undefined);
    }
  }

  return {
    instanceId: steps.instanceId,
    runOnce,
    start() {
      if (loop !== undefined) return;
      stopRequested = false;
      loop = run();
    },
    async stop() {
      if (loop === undefined && inRun === 0) return; // nothing is running
      stopRequested = true;
      wake?.abort();
      if (loop !== undefined) {
        await loop;
        loop = undefined;
        stopRequested = false;
      }
    },
  };
}
