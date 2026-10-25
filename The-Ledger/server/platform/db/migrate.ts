import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type pg from "pg";
import { loadMigrationConfig } from "../config";
import { ConfigError } from "../errors/config-error";
import { createLogger } from "../logging/logger";
import { createOwnerPool } from "./client";

// PS-21. Applies migrations/ with Drizzle's node-postgres migrator, as the owner.
// `npm run db:migrate` uses LEDGER_MIGRATION_DATABASE_URL; the test harness calls the
// same function with the _test URL, after the test-database guard (PS-22). The API and
// the worker never apply migrations at start-up.

/** The repository's `migrations/` folder, resolved from this file. */
export const MIGRATIONS_FOLDER = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../migrations",
);

/**
 * Applies every pending migration on `client`, which must be an owner connection.
 * Drizzle records applied migrations in `drizzle.__drizzle_migrations` and runs the
 * pending ones in one transaction. Throws on failure.
 */
export async function runMigrations(
  client: pg.PoolClient | pg.Client,
  migrationsFolder: string = MIGRATIONS_FOLDER,
): Promise<void> {
  await migrate(drizzle(client), { migrationsFolder });
}

async function main(): Promise<void> {
  const logger = createLogger({ service: "migrate" });
  let config: ReturnType<typeof loadMigrationConfig>;
  try {
    config = loadMigrationConfig();
  } catch (error) {
    if (error instanceof ConfigError) {
      logger.fatal({ variables: error.variables }, error.message);
      process.exit(1);
    }
    throw error;
  }
  for (const warning of config.warnings) logger.warn(warning);

  const pool = createOwnerPool({ settings: config.database, logger, max: 1 });
  try {
    await pool.withClient((client) => runMigrations(client));
    logger.info({ database: config.database.database }, "Migrations applied");
  } catch (error) {
    logger.fatal({ err: error }, "Migration failed");
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

// Run only when started directly (`npm run db:migrate`), not when imported by the harness.
const entry = process.argv[1];
if (entry !== undefined && import.meta.url === pathToFileURL(path.resolve(entry)).href) {
  void main();
}
