import {
  createExecutionContext,
  toCompanyId,
  type ExecutionContext,
} from "../context/execution-context";
import { requireDefaultRunner } from "../db/default-runner";
import type { UnitOfWork } from "../db/unit-of-work";

// Phase 0 spec §4.1 and §4.8 (import rule 11, R2-03): the only place `createSystemContext`,
// `toCompanyId` and `runInTransactionAs` are exported from. It may be imported only from
// server/scripts/**, server/platform/**, the two process entry points and test files, never
// from server/modules/**. Module code cannot make a context, a CompanyId or a unit bound
// to a module of its choosing.

export { toCompanyId };

/**
 * A genuine, frozen context with a `system` actor (no human, no causation), for scripts
 * and the platform: for example the D-15 provisioning script, or a scheduled job.
 */
export function createSystemContext(companyId: string, component: string): ExecutionContext {
  return createExecutionContext({
    companyId: toCompanyId(companyId),
    actor: { kind: "system", component },
  });
}

/**
 * Runs a unit of work bound to `module`, for scripts (`runInTransaction` is otherwise bound
 * to the receiving module's registration name). Uses the runner the process installed.
 */
export async function runInTransactionAs<T>(
  module: string,
  context: ExecutionContext,
  work: (uow: UnitOfWork) => Promise<T>,
): Promise<T> {
  return requireDefaultRunner().run(module, context, work);
}
