import { readFileSync } from "node:fs";
import path from "node:path";
import { is } from "drizzle-orm";
import { PgSchema, PgTable } from "drizzle-orm/pg-core";
import pg from "pg";
import { describe, expect, it } from "vitest";
import * as surface from "./index";

// The platform's public surface (spec section 4.8 rule 1, G0-43): what modules can import,
// listed against an allowlist, so nothing leaks into it by accident.

const ALLOWED_VALUES = [
  "AppError",
  "BusinessRuleError",
  "ConflictError",
  "ForbiddenError",
  "NotFoundError",
  "UnauthenticatedError",
  "ValidationError",
  "bind",
  "definePort",
  "intelligenceSchema",
  "isHumanActor",
  "tenantScope",
  "tenantValues",
  "tenantWhere",
];

const ALLOWED_TYPES = [
  "Actor",
  "AuditEntryInput",
  "AuditWriter",
  "Causation",
  "CompanyId",
  "DbTransaction",
  "DomainEventInput",
  "EventEnvelope",
  "ExecutionContext",
  "JsonValue",
  "Logger",
  "Method",
  "ModuleDeps",
  "ModuleRegistration",
  "OutboxWriter",
  "PlatformRole",
  "PortBinding",
  "PortToken",
  "Ports",
  "PublicRoute",
  "RunInTransaction",
  "Subscriber",
  "TenantContext",
  "TenantTable",
  "TypeRegistration",
  "UnitOfWork",
];

/** Names that must never be reachable from the module surface. */
const FORBIDDEN = [
  "createSystemContext",
  "toCompanyId",
  "runInTransactionAs",
  "createExecutionContext",
  "assertLiveContext",
  "expireContext",
  "installDefaultRunner",
  "requireDefaultRunner",
  "resetDefaultRunner",
  "resetDefaultRunnerForTests",
  "createUnitOfWorkRunner",
  "adoptUnit",
  "startApi",
  "startWorker",
  "buildRegistries",
  "createApiApp",
  "createOutboxSteps",
  "createOutboxWorker",
  "createOutboxWorkerFromSteps",
  "createRuntimePool",
  "createOwnerPool",
  "auditEntries",
  "eventOutbox",
  "eventLog",
  "auditSchema",
  "loadApiConfig",
  "loadWorkerConfig",
  "signPlatformToken",
  "verifyPlatformToken",
  "importAuthKeys",
  "contextOf",
  "createLogger",
  "RegistryError",
  "createSubscriberRegistry",
];

describe("the platform's public surface", () => {
  it("exports exactly the allowlisted values", () => {
    expect(Object.keys(surface).sort()).toEqual([...ALLOWED_VALUES].sort());
  });

  it("exports exactly the allowlisted types (read from the export statements)", () => {
    const source = readFileSync(path.join(__dirname, "index.ts"), "utf8");
    const typeNames: string[] = [];
    for (const match of source.matchAll(/export type \{([^}]*)\}/g)) {
      for (const name of match[1]!.split(",")) {
        const trimmed = name.trim();
        if (trimmed) typeNames.push(trimmed);
      }
    }
    expect(typeNames.sort()).toEqual([...ALLOWED_TYPES].sort());
  });

  it("re-exports nothing from testing/, system/, process/, the pools or the runner install", () => {
    const source = readFileSync(path.join(__dirname, "index.ts"), "utf8");
    const sources = [...source.matchAll(/from "([^"]+)"/g)].map((m) => m[1]!);
    for (const from of sources) {
      for (const banned of ["/testing", "/system", "/process", "db/client", "db/default-runner", "db/migrate", "config", "auth/", "http/", "registry/build-registries"]) {
        expect(from, `${from} must not be re-exported`).not.toContain(banned);
      }
    }
  });

  it("no forbidden name is exported", () => {
    const names = new Set(Object.keys(surface));
    for (const name of FORBIDDEN) expect(names.has(name), name).toBe(false);
  });

  it("(G0-43) no export is a Drizzle table, a pool or a client", () => {
    for (const [name, value] of Object.entries(surface)) {
      expect(is(value, PgTable), `${name} is a table`).toBe(false);
      expect(value instanceof pg.Pool, `${name} is a pool`).toBe(false);
      expect(value instanceof pg.Client, `${name} is a client`).toBe(false);
    }
  });

  it("intelligenceSchema is the schema handle (a table factory), not any of the platform's tables", () => {
    expect(is(surface.intelligenceSchema, PgSchema)).toBe(true);
    expect(surface.intelligenceSchema.schemaName).toBe("intelligence");
  });

  it("definePort and bind work through the surface", () => {
    const port = surface.definePort<{ ping(): Promise<string> }>("alpha.ping");
    const binding = surface.bind(port, () => ({ ping: async () => "pong" }));
    expect(binding.token).toBe(port);
  });

  it("the errors are the platform's AppError subclasses", () => {
    const error = new surface.NotFoundError();
    expect(error).toBeInstanceOf(surface.AppError);
    expect([error.status, error.code]).toEqual([404, "NOT_FOUND"]);
  });
});
