// Test-only (import rule 1a): lets the harness install a different runner in the same
// process. It refuses to run outside Vitest.
export { resetDefaultRunner as resetDefaultRunnerForTests } from "../db/default-runner";
