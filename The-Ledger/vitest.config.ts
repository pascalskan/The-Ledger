import { defineConfig } from "vitest/config";

// Backend tests only. Every include is under server/, so the Playwright specs
// under tests/ are never collected (Phase 0 spec §9.1, §10.4).
//
// Projects:
//   unit — server/**/*.test.ts, except *.db.test.ts and server/tests/**; no database.
//   db, gate — added in Phase 0 commit 4, together with their global setup in
//              server/platform/testing/.
//
// This file references no file under server/tests/ (spec §9.1, R1-05).
export default defineConfig({
  test: {
    // A root-only option in Vitest 4; it applies to every project.
    passWithNoTests: true,
    projects: [
      {
        test: {
          name: "unit",
          environment: "node",
          include: ["server/**/*.test.ts"],
          exclude: ["server/**/*.db.test.ts", "server/tests/**", "**/node_modules/**"],
        },
      },
    ],
  },
});
