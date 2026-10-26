import { defineConfig } from "vitest/config";

// Backend tests only. Every include is under server/, so the Playwright specs
// under tests/ are never collected (Phase 0 spec §9.1, §10.4).
//
// Projects (all three use passWithNoTests):
//   unit — server/**/*.test.ts, except *.db.test.ts and server/tests/**; no database.
//   db   — server/**/*.db.test.ts, except server/tests/**.
//   gate — server/tests/gate/**/*.test.ts (the test engineer's gate tests).
// `db` and `gate` run their files one at a time (they change grants and fail the
// database on purpose) and share the platform global setup, which runs the
// test-database guard and rebuilds the test database. `npm test` runs the three
// projects in order, never at the same time, because `db` and `gate` share the
// test database.
//
// This file references no file under server/tests/ except the gate include glob,
// which matches nothing when that folder is absent (spec §9.1, R1-05).
const databaseProject = {
  environment: "node" as const,
  fileParallelism: false,
  globalSetup: ["server/platform/testing/global-setup.ts"],
  testTimeout: 30_000,
  hookTimeout: 60_000,
};

export default defineConfig({
  test: {
    // A root-only option in Vitest 4; it applies to every project.
    passWithNoTests: true,
    projects: [
      {
        test: {
          name: "unit",
          environment: "node",
          // Several unit tests start a real node process (tsx, the build script); on a busy
          // machine that takes longer than the 5 s default.
          testTimeout: 30_000,
          include: ["server/**/*.test.ts"],
          exclude: ["server/**/*.db.test.ts", "server/tests/**", "**/node_modules/**"],
        },
      },
      {
        test: {
          ...databaseProject,
          name: "db",
          include: ["server/**/*.db.test.ts"],
          exclude: ["server/tests/**", "**/node_modules/**"],
        },
      },
      {
        test: {
          ...databaseProject,
          name: "gate",
          include: ["server/tests/gate/**/*.test.ts"],
          exclude: ["**/node_modules/**"],
        },
      },
    ],
  },
});
