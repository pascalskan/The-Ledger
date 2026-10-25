import { assertTestDatabase, readTestDatabaseInputs } from "../config";
import { createOwnerPool } from "../db/client";
import { createLogger } from "../logging/logger";
import { dropLeftoverGateRoles, rebuildTestDatabase } from "./rebuild";

// Vitest global setup for the `db` and `gate` projects (spec §9.1, §4.6). Runs once per
// invocation: the test-database guard (PS-22), then the leftover throwaway-role cleanup
// (RB2-06), then the rebuild and the migrations. Everything runs as the owner, on a
// database that has passed the guard.
export default async function setup(): Promise<void> {
  const inputs = readTestDatabaseInputs();
  const guarded = assertTestDatabase(inputs);
  const logger = createLogger({ service: "migrate", level: "warn" });
  const owner = createOwnerPool({ settings: guarded.migration, logger, max: 1 });
  try {
    await owner.withClient(async (client) => {
      const cleanup = await dropLeftoverGateRoles(client);
      if (cleanup.failed.length > 0) {
        logger.warn({ roles: cleanup.failed }, "Leftover throwaway roles could not be dropped");
      }
      await rebuildTestDatabase(inputs, client);
    });
  } finally {
    await owner.end();
  }
}
