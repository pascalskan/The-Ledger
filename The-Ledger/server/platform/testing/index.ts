import type { Logger } from "pino";
import {
  assertTestDatabase,
  readTestDatabaseInputs,
  type GuardedTestDatabase,
  type TestDatabaseInputs,
} from "../config";
import { createOwnerPool, createRuntimePool, type DbPool } from "../db/client";
import { createLogger } from "../logging/logger";

// The test-only surface (import rule 1a, spec §9.1). Test files may import this; no
// non-test file may, and it is never bundled. It reads configuration only through
// server/platform/config/ (rule 13). Commit 8 adds the worker factory with the
// test-only hooks.

export {
  assertTestDatabase,
  readTestDatabaseInputs,
  TestDatabaseGuardError,
  loadApiConfig,
  loadWorkerConfig,
  type GuardedTestDatabase,
  type TestDatabaseInputs,
} from "../config";
export { createOwnerPool, createRuntimePool, RuntimeRoleError, type DbPool } from "../db/client";
export { runMigrations, MIGRATIONS_FOLDER } from "../db/migrate";
export {
  adoptUnit,
  createUnitOfWorkRunner,
  type DbTransaction,
  type UnitOfWork,
  type UnitOfWorkRunner,
} from "../db/unit-of-work";
export { installDefaultRunner } from "../db/default-runner";
export { resetDefaultRunnerForTests } from "./default-runner";
export { tenantScope, tenantValues, tenantWhere } from "../db/tenant-scope";
export { buildTypeCatalogue, CatalogueError, type TypeCatalogue } from "../audit/catalogue";
export {
  createExecutionContext,
  expireContext,
  type Actor,
  type ExecutionContext,
} from "../context/execution-context";
export { createSystemContext, runInTransactionAs, toCompanyId } from "../system";
export { createApiApp, type CreateApiAppOptions } from "../http/app";
export { importAuthKeys, type AuthKeys } from "../auth/keys";
export {
  signPlatformToken,
  signPortalToken,
  TokenExpiredError,
  TokenInvalidError,
  verifyPlatformToken,
  verifyPortalToken,
  type PlatformTokenClaims,
  type PortalTokenClaims,
} from "../auth/jwt";
export { contextOf } from "../context/request-store";
export {
  buildRegistries,
  type BuildRegistriesOptions,
  type ProcessKind,
  type Registries,
} from "../registry/build-registries";
export { bind, definePort, type PortBinding, type PortToken, type Ports } from "../registry/ports";
export { RegistryError } from "../registry/registry-error";
export type {
  Method,
  ModuleDeps,
  ModuleRegistration,
  PublicRoute,
} from "../registry/types";
export {
  createSubscriberRegistry,
  type EventEnvelope,
  type Subscriber,
  type SubscriberRegistry,
} from "../events/subscriber-registry";
export { createLogger } from "../logging/logger";
export {
  dropLeftoverGateRoles,
  listSchemasToDrop,
  rebuildTestDatabase,
  type OwnerClientLike,
} from "./rebuild";

/** The guarded settings of the test database, read from the environment (and the app folder's .env). */
export function testDatabase(
  inputs: TestDatabaseInputs = readTestDatabaseInputs(),
): GuardedTestDatabase {
  return assertTestDatabase(inputs);
}

export interface TestPools {
  /** The owner (migration) role: for setup and for proving database-level guarantees only. */
  readonly owner: DbPool;
  /** `ledger_app`, with the runtime role self-check. */
  readonly app: DbPool;
  /** `ledger_worker`, with the runtime role self-check. */
  readonly worker: DbPool;
  end(): Promise<void>;
}

/**
 * Per-role clients for the test database, each built from the explicit settings parsed
 * out of the guarded `_TEST` URLs. Call `end()` when done.
 */
export function createTestPools(
  options: { logger?: Logger; inputs?: TestDatabaseInputs } = {},
): TestPools {
  const guarded = testDatabase(options.inputs);
  const logger = options.logger ?? createLogger({ service: "api", level: "warn" });
  const owner = createOwnerPool({ settings: guarded.migration, logger, max: 2 });
  const app = createRuntimePool({
    settings: guarded.app,
    logger,
    expectedRole: "ledger_app",
    max: 4,
  });
  const worker = createRuntimePool({
    settings: guarded.worker,
    logger,
    expectedRole: "ledger_worker",
    max: 4,
  });
  return {
    owner,
    app,
    worker,
    async end() {
      await Promise.all([owner.end(), app.end(), worker.end()]);
    },
  };
}
