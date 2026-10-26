import {
  createOutboxSteps,
  createOutboxWorkerFromSteps,
  type OutboxRow,
  type OutboxWorker,
  type OutboxWorkerDeps,
} from "../events/outbox-worker";
import type { RegisteredSubscriber } from "../events/subscriber-registry";

// The TEST-ONLY outbox worker factory (spec section 9.1, R3-07). It lives in testing/ so it is
// never bundled: it decorates the production step functions to call `afterSubscriber` after a
// subscriber's unit has committed, and `beforeFinish` before the finish step. The production
// factory takes no hooks option, and dist/worker.cjs contains neither hook name (G0-01).

export interface OutboxWorkerHooks {
  /** Called after one subscriber's unit of work has committed (and before the heartbeat refresh). */
  afterSubscriber?(row: OutboxRow, entry: RegisteredSubscriber): Promise<void> | void;
  /** Called after every subscriber has committed, before the finish transaction. */
  beforeFinish?(row: OutboxRow): Promise<void> | void;
}

export function createOutboxWorker(deps: OutboxWorkerDeps, hooks: OutboxWorkerHooks = {}): OutboxWorker {
  const steps = createOutboxSteps(deps);
  return createOutboxWorkerFromSteps(deps, {
    ...steps,
    async runSubscriber(row, entry, runId) {
      await steps.runSubscriber(row, entry, runId);
      await hooks.afterSubscriber?.(row, entry);
    },
    async finish(row) {
      await hooks.beforeFinish?.(row);
      await steps.finish(row);
    },
  });
}
