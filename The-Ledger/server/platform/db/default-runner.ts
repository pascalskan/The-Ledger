import { isVitest, type Env } from "../config";
import type { UnitOfWorkRunner } from "./unit-of-work";

// The process-wide unit of work runner behind `runInTransactionAs` (scripts), spec section 4.4.
//
// It is installed ONCE per process by an entry point or script, with the runner built from the
// registry's catalogues. A second install throws, and nothing can be installed as "no runner",
// so no code can swap in a runner without catalogues. The state is private to this module (it
// is not exported), and the only reset refuses to run outside Vitest. None of this is exported
// from server/platform/index.ts, the module surface.

let installed: UnitOfWorkRunner | undefined;

export function installDefaultRunner(runner: UnitOfWorkRunner): void {
  if (runner === undefined || runner === null) {
    throw new Error("A unit of work runner is required");
  }
  if (installed !== undefined) {
    throw new Error("A unit of work runner is already installed in this process");
  }
  installed = runner;
}

export function requireDefaultRunner(): UnitOfWorkRunner {
  if (installed === undefined) {
    throw new Error("No unit of work runner is installed in this process");
  }
  return installed;
}

/**
 * Clears the installed runner, for the test harness only: it throws unless the process is
 * running under Vitest. `env` is injectable so that refusal can be tested without changing
 * the real environment. Re-exported by server/platform/testing/ and nowhere else; a
 * production bundle never contains a call to it.
 */
export function resetDefaultRunner(env?: Env): void {
  if (!isVitest(env)) {
    throw new Error("The unit of work runner can only be reset under Vitest");
  }
  installed = undefined;
}
