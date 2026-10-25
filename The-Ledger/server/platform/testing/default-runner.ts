import { defaultRunnerHolder } from "../db/default-runner";

// Test-only (import rule 1a): lets the harness install a different runner in the same
// process. Production code cannot reach this; there is no other way to reset the runner.
export function resetDefaultRunnerForTests(): void {
  defaultRunnerHolder.runner = undefined;
}
