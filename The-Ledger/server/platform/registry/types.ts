import type { RequestHandler, Request, Router } from "express";
import type { Logger } from "pino";
import type { NodeEnv } from "../config";
import type { ExecutionContext } from "../context/execution-context";
import type { RunInTransaction, UnitOfWork } from "../db/unit-of-work";
import type { Subscriber } from "../events/subscriber-registry";
import type { PortBinding, PortToken, Ports } from "./ports";

// Phase 0 spec §4.8: the registration every module adds one line of to
// server/modules/registry.ts, and the dependencies the platform gives its factories.

export type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** Public routes are declared, not routed freely (R2-04). */
export interface PublicRoute {
  /** `/api/v1` or `/portal/v1`. */
  surface: "api" | "portal";
  method: Method;
  /** Exact, for example `/auth/login`; inside one of the module's namespaces. */
  path: string;
  handler: (deps: ModuleDeps) => RequestHandler;
}

export interface TypeRegistration {
  type: string;
  jobRequired: boolean;
}

export interface ModuleRegistration {
  /** The module's schema name, for example `review_centre`. */
  name: string;
  /** Key = an /api/v1 namespace it owns, for example `/jobs`; mounted behind platform-token auth. */
  apiRouters?: Readonly<Record<string, (deps: ModuleDeps) => Router>>;
  /** Key = a /portal/v1 namespace; mounted behind portal-token auth. */
  portalRouters?: Readonly<Record<string, (deps: ModuleDeps) => Router>>;
  /** Each must be listed in that phase's specification. */
  publicRoutes?: readonly PublicRoute[];
  /** Built by the worker only. */
  subscribers?: (deps: ModuleDeps) => readonly Subscriber[];
  /** The audit catalogue (§4.4). */
  auditEntryTypes?: readonly TypeRegistration[];
  /** The event catalogue (§4.4). */
  producesEvents?: readonly TypeRegistration[];
  /** Ports this module calls (it defines them). */
  requiresPorts?: readonly PortToken<unknown>[];
  /** Ports this module implements (defined elsewhere). */
  providesPorts?: readonly PortBinding<unknown>[];
}

/**
 * Everything a module's factories receive from the platform. It carries no connection
 * string, pool, database handle, key or secret, and no other configuration value (R2-04, R2-07).
 */
export interface ModuleDeps {
  /** Bound to this module's registration name (R3-10). */
  readonly runInTransaction: RunInTransaction;
  /** A view of the caller's unit bound to this module, for a public function called with another module's `uow` (R3-10). */
  readonly adopt: (uow: UnitOfWork) => UnitOfWork;
  /** The authenticated request's context. Throws MissingRequestContextError where there is none. */
  readonly contextOf: (req: Request) => ExecutionContext;
  readonly logger: Logger;
  readonly ports: Ports;
  readonly nodeEnv: NodeEnv;
}
