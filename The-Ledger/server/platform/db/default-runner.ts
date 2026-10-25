import type { UnitOfWorkRunner } from "./unit-of-work";

// The process-wide unit of work runner behind `runInTransactionAs` (scripts), spec §4.4.
//
// It is installed ONCE per process by an entry point or script, with the runner built from
// the registry's catalogues. A second install throws, and nothing can be installed as
// "no runner", so no code can swap in a runner without catalogues. The only reset is in
// server/platform/testing/, for the harness. None of this is exported from
// server/platform/index.ts, the module surface.

/** Platform-internal state. Only `testing/` may change it other than through `installDefaultRunner`. */
export const defaultRunnerHolder: { runner: UnitOfWorkRunner | undefined } = { runner: undefined };

export function installDefaultRunner(runner: UnitOfWorkRunner): void {
  if (runner === undefined || runner === null) {
    throw new Error("A unit of work runner is required");
  }
  if (defaultRunnerHolder.runner !== undefined) {
    throw new Error("A unit of work runner is already installed in this process");
  }
  defaultRunnerHolder.runner = runner;
}

export function requireDefaultRunner(): UnitOfWorkRunner {
  if (defaultRunnerHolder.runner === undefined) {
    throw new Error("No unit of work runner is installed in this process");
  }
  return defaultRunnerHolder.runner;
}
