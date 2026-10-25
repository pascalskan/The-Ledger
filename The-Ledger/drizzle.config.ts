import { defineConfig } from "drizzle-kit";
import { loadMigrationConfig } from "./server/platform/config/env";

// Phase 0 spec §3.6. The owner (migration) credentials: LEDGER_MIGRATION_DATABASE_URL
// only, parsed by the same function as the runtime URLs (§4.6, RP-03). There is no
// fallback to Replit's DATABASE_URL (RP-01). This file sits outside server/, so import
// rule 13 does not apply to it, but it reads nothing itself: the loader reads the one
// variable (and the app folder's .env outside production and Replit), and throws a
// ConfigError naming it if it is missing or incomplete.
//
// Scripts use `drizzle-kit generate` only (it needs no database). `drizzle-kit push`
// and `drizzle-kit studio` are never used with the owner credentials (RB2-08).
const { database } = loadMigrationConfig();

export default defineConfig({
  dialect: "postgresql",
  out: "./migrations",
  schema: ["./server/platform/db/schema/*.ts", "./server/modules/*/infrastructure/schema.ts"],
  // Each later phase adds its schema here.
  schemaFilter: ["audit", "intelligence"],
  dbCredentials: {
    host: database.host,
    port: database.port,
    user: database.user,
    password: database.password,
    database: database.database,
    ssl: database.ssl === false ? false : { ...database.ssl },
  },
});
