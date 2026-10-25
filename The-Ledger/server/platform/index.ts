// The platform's public surface: the ONLY file modules may import from the platform
// (Phase 0 spec section 4.8, import rule 1). Everything a module needs, and nothing it must
// not have:
//
//   - no Drizzle table objects for T-1, T-2 or T-3, no pool or `db` handle (a module reaches
//     the database only through `uow.tx` inside a unit of work);
//   - no way to make a context or a CompanyId: `createSystemContext`, `toCompanyId` and
//     `runInTransactionAs` live in `server/platform/system/` (rule 11);
//   - no process start-up (`startApi`, `startWorker`), no registry building, no runner
//     install or reset, no outbox-worker step builders: those belong to the two entry points
//     and the test harness;
//   - nothing from `server/platform/testing/` (rule 1a).
//
// `server/platform/index.test.ts` lists this file's exports against an allowlist.

// --- tenant context and actor (4.1) -----------------------------------------
export type {
  Actor,
  Causation,
  CompanyId,
  ExecutionContext,
  PlatformRole,
  TenantContext,
} from "./context/execution-context";
export { isHumanActor } from "./context/execution-context";

// --- Unit of Work, audit and events (4.4) -----------------------------------
export type {
  DbTransaction,
  RunInTransaction,
  UnitOfWork,
} from "./db/unit-of-work";
export type { AuditEntryInput, AuditWriter } from "./audit/audit-writer";
export type { DomainEventInput, OutboxWriter } from "./events/outbox-writer";
export type { JsonValue } from "./db/json-input";

// --- tenant-scoped data access (4.2) ----------------------------------------
export type { TenantTable } from "./db/tenant-scope";
export { tenantScope, tenantValues, tenantWhere } from "./db/tenant-scope";

// --- the intelligence schema handle (3.1.2) ---------------------------------
// The schema handle only: the Intelligence & Automation module adds its tables to the same
// schema from Phase 7. The platform's own tables are not exported.
export { intelligenceSchema } from "./db/schema/intelligence";

// --- errors a module raises or maps to (4.7, 6.3) ---------------------------
export {
  AppError,
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthenticatedError,
  ValidationError,
} from "./errors/app-error";

// --- events and subscribers (4.5) -------------------------------------------
export type { EventEnvelope, Subscriber } from "./events/subscriber-registry";

// --- module registration and ports (4.8, PS-16) ------------------------------
export type {
  Method,
  ModuleDeps,
  ModuleRegistration,
  PublicRoute,
  TypeRegistration,
} from "./registry/types";
export type { PortBinding, PortToken, Ports } from "./registry/ports";
export { bind, definePort } from "./registry/ports";

// --- logging ----------------------------------------------------------------
export type { Logger } from "pino";
