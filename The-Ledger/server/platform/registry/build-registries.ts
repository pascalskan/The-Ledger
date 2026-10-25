import type { RequestHandler, Router } from "express";
import type { Logger } from "pino";
import { buildTypeCatalogue, CatalogueError, type TypeCatalogue } from "../audit/catalogue";
import { isVitest, type Env, type NodeEnv } from "../config";
import { contextOf } from "../context/request-store";
import type { DbPool } from "../db/client";
import {
  adoptUnit,
  createUnitOfWorkRunner,
  type UnitOfWork,
  type UnitOfWorkRunner,
} from "../db/unit-of-work";
import {
  createSubscriberRegistry,
  type RegisteredSubscriber,
  type SubscriberRegistry,
} from "../events/subscriber-registry";
import { wrapPortImplementation, type PortBinding, type PortToken, type Ports } from "./ports";
import { RegistryError } from "./registry-error";
import type { Method, ModuleDeps, ModuleRegistration } from "./types";

// Phase 0 spec §4.8, PS-15, PS-16: the start-up wiring both processes run from the
// `modules` list their entry points pass in. Every problem is a RegistryError raised here,
// at start-up, naming the subscriber, port, namespace, route or type - never at run time.
// The checks do not depend on which process runs them; only the factories called differ:
// the API builds routers and public routes (never `subscribers`), the worker builds
// subscribers (never routers) and its `deps.ports` refuses human-only ports.

export type ProcessKind = "api" | "worker";

export interface BuildRegistriesOptions {
  readonly modules: readonly ModuleRegistration[];
  readonly process: ProcessKind;
  /** The process's runtime pool: `ledger_app` for the API, `ledger_worker` for the worker. No connection is made here. */
  readonly pool: DbPool;
  readonly logger: Logger;
  readonly nodeEnv: NodeEnv;
  /** Default: the real process environment. Injectable so the Vitest-only rule can be tested. */
  readonly env?: Env;
}

export interface MountedRouter {
  readonly module: string;
  readonly namespace: string;
  readonly router: Router;
}

export interface BuiltPublicRoute {
  readonly module: string;
  readonly surface: "api" | "portal";
  readonly method: Method;
  readonly path: string;
  readonly handler: RequestHandler;
}

export interface Registries {
  readonly process: ProcessKind;
  /** The process's single unit of work runner, carrying the catalogues. Install it once with `installDefaultRunner`. */
  readonly runner: UnitOfWorkRunner;
  readonly auditCatalogue: TypeCatalogue;
  readonly eventCatalogue: TypeCatalogue;
  /** API process only. */
  readonly apiRouters: readonly MountedRouter[];
  readonly portalRouters: readonly MountedRouter[];
  readonly publicRoutes: readonly BuiltPublicRoute[];
  /** Worker process only (empty in the API). */
  readonly subscribers: SubscriberRegistry;
}

const MODULE_NAME = /^[a-z][a-z_]{1,49}$/;
// A single lower-case path segment (spec 4.8: ^/[a-z][a-z-]*$). The gate tests' own probe modules
// use /__probe, /__alpha and /__beta (spec 9.9, G0-48), which that pattern refuses, so a leading
// "__" is accepted ONLY under Vitest: production modules never claim a "__" namespace.
const NAMESPACE = /^\/[a-z][a-z-]*$/;
const PROBE_NAMESPACE = /^\/(?:__)?[a-z][a-z-]*$/;
const PUBLIC_PATH = /^(?:\/[A-Za-z0-9._~-]+)+$/;
const METHODS: readonly string[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

type Phase = "create" | "build" | "sealed";

function checkModuleNames(modules: readonly ModuleRegistration[]): void {
  const seen = new Set<string>();
  for (const { name } of modules) {
    if (typeof name !== "string" || !MODULE_NAME.test(name)) {
      throw new RegistryError(`Module name "${String(name)}" must be a lower-case schema name such as review_centre`);
    }
    if (seen.has(name)) throw new RegistryError(`Module "${name}" is registered more than once`);
    seen.add(name);
  }
}

function buildCatalogues(modules: readonly ModuleRegistration[]) {
  try {
    return {
      audit: buildTypeCatalogue(
        "audit entry type",
        modules.map((m) => ({ module: m.name, types: m.auditEntryTypes ?? [] })),
      ),
      event: buildTypeCatalogue(
        "event type",
        modules.map((m) => ({ module: m.name, types: m.producesEvents ?? [] })),
      ),
    };
  } catch (error) {
    if (error instanceof CatalogueError) throw new RegistryError(error.message);
    throw error;
  }
}

/** Namespaces are single lower-case segments, and each belongs to one module per surface (R2-04). */
function checkNamespaces(modules: readonly ModuleRegistration[], allowProbeNamespaces: boolean): void {
  const pattern = allowProbeNamespaces ? PROBE_NAMESPACE : NAMESPACE;
  for (const surface of ["api", "portal"] as const) {
    const owners = new Map<string, string>();
    for (const module of modules) {
      const routers = surface === "api" ? module.apiRouters : module.portalRouters;
      for (const namespace of Object.keys(routers ?? {})) {
        if (!pattern.test(namespace)) {
          throw new RegistryError(
            `Module "${module.name}" uses the ${surface} namespace "${namespace}", which must be a single lower-case path segment such as /jobs`,
          );
        }
        const owner = owners.get(namespace);
        if (owner !== undefined) {
          throw new RegistryError(
            `The ${surface} namespace "${namespace}" is claimed by both "${owner}" and "${module.name}"`,
          );
        }
        owners.set(namespace, module.name);
      }
    }
    // One segment each, so no namespace can be a path prefix of another.
  }
}

function checkPublicRoutes(modules: readonly ModuleRegistration[]): void {
  const seen = new Map<string, string>();
  for (const module of modules) {
    for (const route of module.publicRoutes ?? []) {
      const label = `${route.method} ${route.path}`;
      if (route.surface !== "api" && route.surface !== "portal") {
        throw new RegistryError(`Module "${module.name}" declares the public route ${label} on an unknown surface`);
      }
      if (!METHODS.includes(route.method)) {
        throw new RegistryError(`Module "${module.name}" declares the public route ${label} with an unknown method`);
      }
      if (typeof route.path !== "string" || !PUBLIC_PATH.test(route.path)) {
        throw new RegistryError(`Module "${module.name}" declares a public route whose path "${String(route.path)}" is not an exact path`);
      }
      const routers = route.surface === "api" ? module.apiRouters : module.portalRouters;
      const inside = Object.keys(routers ?? {}).some(
        (namespace) => route.path === namespace || route.path.startsWith(`${namespace}/`),
      );
      if (!inside) {
        throw new RegistryError(
          `Module "${module.name}" declares the public route ${label} (${route.surface}) outside its own namespaces`,
        );
      }
      const key = `${route.surface} ${label}`;
      const owner = seen.get(key);
      if (owner !== undefined) {
        throw new RegistryError(`The public route ${label} (${route.surface}) is declared by both "${owner}" and "${module.name}"`);
      }
      seen.set(key, module.name);
    }
  }
}

interface PortPlan {
  readonly required: Map<string, { token: PortToken<unknown>; modules: string[] }>;
  readonly provided: Map<string, { binding: PortBinding<unknown>; module: string }>;
}

function planPorts(modules: readonly ModuleRegistration[]): PortPlan {
  const tokens = new Map<string, PortToken<unknown>>();
  const remember = (token: PortToken<unknown>) => {
    const known = tokens.get(token.name);
    if (known !== undefined && known !== token) {
      throw new RegistryError(`The port "${token.name}" is defined by more than one token`);
    }
    tokens.set(token.name, token);
  };

  const required: PortPlan["required"] = new Map();
  const provided: PortPlan["provided"] = new Map();
  for (const module of modules) {
    for (const token of module.requiresPorts ?? []) {
      remember(token);
      const entry = required.get(token.name) ?? { token, modules: [] };
      entry.modules.push(module.name);
      required.set(token.name, entry);
    }
  }
  for (const module of modules) {
    for (const binding of module.providesPorts ?? []) {
      remember(binding.token);
      const existing = provided.get(binding.token.name);
      if (existing !== undefined) {
        throw new RegistryError(
          `The port "${binding.token.name}" has two providers: "${existing.module}" and "${module.name}"`,
        );
      }
      provided.set(binding.token.name, { binding, module: module.name });
    }
  }
  for (const [name, { modules: requirers }] of required) {
    if (!provided.has(name)) {
      throw new RegistryError(`The port "${name}" is required by "${requirers.join('", "')}" but no module provides it`);
    }
  }
  for (const [name, { module }] of provided) {
    if (!required.has(name)) {
      throw new RegistryError(`Module "${module}" provides the port "${name}", which no module requires`);
    }
  }
  return { required, provided };
}

/**
 * Validates the registrations, wires the ports and builds the factories' products. Throws
 * RegistryError (naming what is wrong) before anything listens or claims.
 */
export function buildRegistries(options: BuildRegistriesOptions): Registries {
  const { modules, pool, logger, nodeEnv } = options;

  checkModuleNames(modules);
  const catalogues = buildCatalogues(modules);
  checkNamespaces(modules, isVitest(options.env));
  checkPublicRoutes(modules);
  const plan = planPorts(modules);

  const runner = createUnitOfWorkRunner({
    pool,
    auditCatalogue: catalogues.audit,
    eventCatalogue: catalogues.event,
  });

  let phase: Phase = "create";
  const implementations = new Map<string, unknown>();

  const depsFor = (module: ModuleRegistration): ModuleDeps => {
    const allowed = new Set((module.requiresPorts ?? []).map((token) => token.name));
    const ports: Ports = {
      get<T>(token: PortToken<T>): T {
        if (phase === "create") {
          throw new RegistryError(
            `Module "${module.name}" asked for the port "${token.name}" while port implementations are being created; implementations cannot depend on other ports`,
          );
        }
        if (phase === "sealed") {
          throw new RegistryError(
            `Module "${module.name}" asked for the port "${token.name}" after start-up; ports cannot be resolved lazily`,
          );
        }
        if (!allowed.has(token.name)) {
          throw new RegistryError(
            `Module "${module.name}" asked for the port "${token.name}", which is not in its requiresPorts`,
          );
        }
        // Decide from the REGISTERED token, never from the caller's object: a look-alike with the
        // same name but humanOnly false must not get a human-only port, and is refused outright.
        const registered = plan.provided.get(token.name)!.binding.token;
        if (token !== registered) {
          throw new RegistryError(
            `Module "${module.name}" asked for the port "${token.name}" with a token that is not the registered one`,
          );
        }
        if (options.process === "worker" && registered.humanOnly) {
          throw new RegistryError(
            `Module "${module.name}" asked for the human-only port "${token.name}" in the worker; subscribers cannot hold it`,
          );
        }
        return implementations.get(token.name) as T;
      },
    };
    return Object.freeze({
      runInTransaction: runner.forModule(module.name),
      adopt: (uow: UnitOfWork) => adoptUnit(uow, module.name),
      contextOf,
      logger: logger.child({ module: module.name }),
      ports,
      nodeEnv,
    });
  };

  const moduleDeps = new Map(modules.map((module) => [module.name, depsFor(module)] as const));
  const depsOf = (module: ModuleRegistration) => moduleDeps.get(module.name)!;

  // Step 2: create every implementation. `ports.get` throws here.
  for (const [name, { binding, module }] of plan.provided) {
    const registration = modules.find((m) => m.name === module)!;
    const implementation = binding.create(depsOf(registration)) as object;
    implementations.set(name, wrapPortImplementation(binding.token as PortToken<object>, implementation, module));
  }

  // Step 3: routers (API) or subscribers (worker). `ports.get` works for the module's own requiresPorts.
  phase = "build";
  const apiRouters: MountedRouter[] = [];
  const portalRouters: MountedRouter[] = [];
  const publicRoutes: BuiltPublicRoute[] = [];
  const subscribers: RegisteredSubscriber[] = [];
  try {
    for (const module of modules) {
      const deps = depsOf(module);
      if (options.process === "api") {
        for (const [target, factories] of [
          [apiRouters, module.apiRouters],
          [portalRouters, module.portalRouters],
        ] as const) {
          for (const [namespace, factory] of Object.entries(factories ?? {})) {
            const router = factory(deps);
            if (typeof router !== "function") {
              throw new RegistryError(`The router factory for "${namespace}" in module "${module.name}" did not return a router`);
            }
            target.push({ module: module.name, namespace, router });
          }
        }
        for (const route of module.publicRoutes ?? []) {
          publicRoutes.push({
            module: module.name,
            surface: route.surface,
            method: route.method,
            path: route.path,
            handler: route.handler(deps),
          });
        }
      } else if (module.subscribers !== undefined) {
        for (const subscriber of module.subscribers(deps)) {
          subscribers.push({ module: module.name, subscriber });
        }
      }
    }
  } finally {
    // Step 4: whatever happened, nothing can resolve a port lazily afterwards.
    phase = "sealed";
  }

  return Object.freeze({
    process: options.process,
    runner,
    auditCatalogue: catalogues.audit,
    eventCatalogue: catalogues.event,
    apiRouters: Object.freeze(apiRouters),
    portalRouters: Object.freeze(portalRouters),
    publicRoutes: Object.freeze(publicRoutes),
    subscribers: createSubscriberRegistry(subscribers, catalogues.event),
  });
}
