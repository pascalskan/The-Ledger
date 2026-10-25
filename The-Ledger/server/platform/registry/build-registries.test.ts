import { Router } from "express";
import { describe, expect, it, vi } from "vitest";
import type { DbPool } from "../db/client";
import { createLogger } from "../logging/logger";
import { buildRegistries, type ProcessKind } from "./build-registries";
import { bind, definePort, type PortToken } from "./ports";
import { RegistryError } from "./registry-error";
import type { ModuleRegistration } from "./types";

// PS-15, PS-16 and the namespace rules of section 4.8 (G0-41), without a database: no
// connection is ever made while registries are built.

const pool: DbPool = {
  role: "ledger_app",
  withClient: async () => {
    throw new Error("no database in this test");
  },
  end: async () => undefined,
};
const logger = createLogger({ service: "api", level: "fatal" });

function build(modules: readonly ModuleRegistration[], process: ProcessKind = "api") {
  return buildRegistries({ modules, process, pool, logger, nodeEnv: "test" });
}

const router = () => Router();
const handler = () => () => undefined;
type PingPort = { ping(uow: unknown): Promise<string> };
const ping = definePort<PingPort>("alpha.ping");
const secret = definePort<{ approve(uow: unknown): Promise<void> }>("alpha.secret", { humanOnly: true });

const alpha = (extra: Partial<ModuleRegistration> = {}): ModuleRegistration => ({
  name: "alpha",
  auditEntryTypes: [{ type: "alpha_entry", jobRequired: false }],
  producesEvents: [{ type: "AlphaRecorded", jobRequired: false }],
  ...extra,
});
const beta = (extra: Partial<ModuleRegistration> = {}): ModuleRegistration => ({ name: "beta", ...extra });
const pingProvider = (name = "beta"): ModuleRegistration => ({
  name,
  providesPorts: [bind(ping, () => ({ ping: async () => "pong" }))],
});

function expectRegistryError(run: () => unknown, ...fragments: string[]) {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(RegistryError);
    for (const fragment of fragments) expect((error as Error).message).toContain(fragment);
    return;
  }
  throw new Error("expected a RegistryError");
}

describe("an empty or correct registration", () => {
  it("builds with no modules in both processes", () => {
    for (const process of ["api", "worker"] as const) {
      const registries = build([], process);
      expect(registries.apiRouters).toEqual([]);
      expect(registries.subscribers.size).toBe(0);
      expect(registries.auditCatalogue.size).toBe(0);
    }
  });

  it("collects catalogues, routers, public routes and subscribers, each in its own process", () => {
    const module = alpha({
      apiRouters: { "/__alpha": () => router() },
      portalRouters: { "/__alpha": () => router() },
      publicRoutes: [{ surface: "api", method: "POST", path: "/__alpha/login", handler: () => (_req, res) => void res.end() }],
      subscribers: () => [{ name: "alpha.reactor", eventTypes: ["AlphaRecorded"], handle: async () => undefined }],
    });
    const api = build([module], "api");
    expect(api.apiRouters.map((r) => r.namespace)).toEqual(["/__alpha"]);
    expect(api.portalRouters.map((r) => r.namespace)).toEqual(["/__alpha"]);
    expect(api.publicRoutes).toHaveLength(1);
    expect(api.subscribers.size).toBe(0);
    expect(api.auditCatalogue.get("alpha_entry")).toEqual({ owner: "alpha", jobRequired: false });

    const worker = build([module], "worker");
    expect(worker.apiRouters).toEqual([]);
    expect(worker.publicRoutes).toEqual([]);
    expect(worker.subscribers.subscribersFor("AlphaRecorded").map((s) => s.subscriber.name)).toEqual(["alpha.reactor"]);
    expect(worker.subscribers.subscribersFor("AlphaRecorded")[0]!.module).toBe("alpha");
  });

  it("the API never calls subscribers factories; the worker never calls router factories", () => {
    const subscribers = vi.fn(() => []);
    const apiFactory = vi.fn(() => router());
    const publicHandler = vi.fn(handler);
    const module = alpha({
      apiRouters: { "/__alpha": apiFactory },
      subscribers,
      publicRoutes: [{ surface: "api", method: "GET", path: "/__alpha/x", handler: publicHandler }],
    });
    build([module], "api");
    expect(subscribers).not.toHaveBeenCalled();
    expect(apiFactory).toHaveBeenCalledTimes(1);
    expect(publicHandler).toHaveBeenCalledTimes(1);
    build([module], "worker");
    expect(subscribers).toHaveBeenCalledTimes(1);
    expect(apiFactory).toHaveBeenCalledTimes(1);
    expect(publicHandler).toHaveBeenCalledTimes(1);
  });

  it("module deps carry the documented members and nothing that is a connection or secret", () => {
    let seen: Record<string, unknown> = {};
    build([
      alpha({
        apiRouters: {
          "/__alpha": (deps) => {
            seen = { ...deps };
            return router();
          },
        },
      }),
    ]);
    expect(Object.keys(seen).sort()).toEqual(["adopt", "contextOf", "logger", "nodeEnv", "ports", "runInTransaction"]);
    expect(seen.nodeEnv).toBe("test");
  });
});

describe("module names and catalogues", () => {
  it("rejects a bad or duplicate module name", () => {
    expectRegistryError(() => build([{ name: "Bad Name" }]), "Bad Name");
    expectRegistryError(() => build([alpha(), alpha()]), '"alpha" is registered more than once');
  });

  it("(o) one audit entry type, or one event type, registered by two modules", () => {
    expectRegistryError(
      () => build([alpha(), beta({ auditEntryTypes: [{ type: "alpha_entry", jobRequired: false }] })]),
      "alpha_entry",
      "exactly one owner",
    );
    expectRegistryError(
      () => build([alpha(), beta({ producesEvents: [{ type: "AlphaRecorded", jobRequired: true }] })]),
      "AlphaRecorded",
    );
  });
});

describe("namespaces and public routes (G0-41 j to m)", () => {
  it("(j) a namespace claimed by two modules, per surface", () => {
    expectRegistryError(
      () => build([alpha({ apiRouters: { "/jobs": router } }), beta({ apiRouters: { "/jobs": router } })]),
      '"/jobs"',
      '"alpha"',
      '"beta"',
    );
    // the same namespace on different surfaces is fine
    expect(() =>
      build([alpha({ apiRouters: { "/jobs": router } }), beta({ portalRouters: { "/jobs": router } })]),
    ).not.toThrow();
  });

  it.each(["/jobs/x", "jobs", "/", "/Jobs", "/jobs/", "/9jobs", "/job_s", "/_jobs", "/___jobs", "/__"])(
    "(k) the namespace %j is refused",
    (namespace) => {
      expectRegistryError(
        () => build([alpha({ apiRouters: { [namespace]: router } })]),
        "single lower-case path segment",
      );
    },
  );

  it("a leading __ namespace is accepted only under Vitest (production modules never claim one)", () => {
    const probe = alpha({ apiRouters: { "/__x": router } });
    const outside = () => buildRegistries({ modules: [probe], process: "api", pool, logger, nodeEnv: "production", env: {} });
    expect(outside).toThrow(RegistryError);
    expect(outside).toThrow(/single lower-case path segment/);
    expect(() => buildRegistries({ modules: [probe], process: "api", pool, logger, nodeEnv: "production", env: { NODE_ENV: "production" } })).toThrow(RegistryError);
    expect(() => buildRegistries({ modules: [probe], process: "api", pool, logger, nodeEnv: "test", env: { VITEST: "true" } })).not.toThrow();
    // ... and a plain namespace is fine everywhere
    expect(() => buildRegistries({ modules: [alpha({ apiRouters: { "/jobs": router } })], process: "api", pool, logger, nodeEnv: "production", env: {} })).not.toThrow();
  });

  it("(l) a public route outside its module's namespaces, or on the other surface's namespaces", () => {
    const withRoute = (surface: "api" | "portal", path: string) =>
      alpha({
        apiRouters: { "/__alpha": router },
        publicRoutes: [{ surface, method: "POST", path, handler }],
      });
    expectRegistryError(() => build([withRoute("api", "/__beta/login")]), "outside its own namespaces");
    expectRegistryError(() => build([withRoute("portal", "/__alpha/login")]), "outside its own namespaces");
    expectRegistryError(() => build([withRoute("api", "/__alphabet/login")]), "outside its own namespaces");
    expect(() => build([withRoute("api", "/__alpha")])).not.toThrow();
    expect(() => build([withRoute("api", "/__alpha/login")])).not.toThrow();
  });

  it("(m) two public routes with the same surface, method and path", () => {
    const routes = (...methods: ("POST" | "GET")[]) =>
      alpha({
        apiRouters: { "/__alpha": router },
        publicRoutes: methods.map((method) => ({ surface: "api" as const, method, path: "/__alpha/login", handler })),
      });
    expectRegistryError(() => build([routes("POST", "POST")]), "POST /__alpha/login");
    expect(() => build([routes("POST", "GET")])).not.toThrow();
  });

  it("refuses a public route path that is a pattern or has an unknown method", () => {
    for (const path of ["/__alpha/:id", "/__alpha/*", "/__alpha//x", "__alpha/x", "/__alpha/x?y"]) {
      expectRegistryError(
        () =>
          build([
            alpha({
              apiRouters: { "/__alpha": router },
              publicRoutes: [{ surface: "api", method: "POST", path, handler }],
            }),
          ]),
        "not an exact path",
      );
    }
    expectRegistryError(
      () =>
        build([
          alpha({
            apiRouters: { "/__alpha": router },
            publicRoutes: [{ surface: "api", method: "TRACE" as never, path: "/__alpha/x", handler }],
          }),
        ]),
      "unknown method",
    );
  });
});

describe("subscribers (PS-15, G0-41 a, b, n)", () => {
  const handle = async () => undefined;
  const withSubscribers = (...subscribers: { name: string; eventTypes: string[] }[]) =>
    alpha({ subscribers: () => subscribers.map((s) => ({ ...s, handle })) });

  it("(a) two subscribers with the same name, within or across modules", () => {
    expectRegistryError(
      () =>
        build(
          [withSubscribers({ name: "alpha.x", eventTypes: ["AlphaRecorded"] }, { name: "alpha.x", eventTypes: ["AlphaRecorded"] })],
          "worker",
        ),
      '"alpha.x"',
    );
    expectRegistryError(
      () =>
        build(
          [
            withSubscribers({ name: "alpha.x", eventTypes: ["AlphaRecorded"] }),
            beta({ subscribers: () => [{ name: "alpha.x", eventTypes: ["AlphaRecorded"], handle }] }),
          ],
          "worker",
        ),
      '"alpha.x"',
    );
  });

  it("(b) a subscriber with no event types", () => {
    expectRegistryError(
      () => build([withSubscribers({ name: "alpha.x", eventTypes: [] })], "worker"),
      '"alpha.x"',
      "no event types",
    );
  });

  it("(n) a subscriber to an unregistered event type", () => {
    expectRegistryError(
      () => build([withSubscribers({ name: "alpha.x", eventTypes: ["Misspelt"] })], "worker"),
      '"alpha.x"',
      '"Misspelt"',
    );
  });

  it.each(["x", "Alpha.x", "alpha.", "alpha.x y", "alpha..x", "alpha.1x", "alpha.x.y"])("refuses the name %j", (name) => {
    expectRegistryError(
      () => build([withSubscribers({ name, eventTypes: ["AlphaRecorded"] })], "worker"),
      "<module>.<purpose>",
    );
  });

  it("refuses an event type that is not PascalCase, or listed twice", () => {
    expectRegistryError(
      () => build([withSubscribers({ name: "alpha.x", eventTypes: ["alpha_recorded"] })], "worker"),
      "PascalCase",
    );
    expectRegistryError(
      () => build([withSubscribers({ name: "alpha.x", eventTypes: ["AlphaRecorded", "AlphaRecorded"] })], "worker"),
      "twice",
    );
  });

  it("subscribersFor returns subscribers in registration order", () => {
    const registries = build(
      [
        withSubscribers(
          { name: "alpha.first", eventTypes: ["AlphaRecorded"] },
          { name: "alpha.second", eventTypes: ["AlphaRecorded"] },
        ),
        beta({ subscribers: () => [{ name: "beta.third", eventTypes: ["AlphaRecorded"], handle }] }),
      ],
      "worker",
    );
    expect(registries.subscribers.subscribersFor("AlphaRecorded").map((s) => s.subscriber.name)).toEqual([
      "alpha.first",
      "alpha.second",
      "beta.third",
    ]);
    expect(registries.subscribers.subscribersFor("Unknown")).toEqual([]);
  });
});

describe("ports (PS-16, G0-41 c to h, p)", () => {
  it("(c) a required port with no provider", () => {
    expectRegistryError(() => build([alpha({ requiresPorts: [ping] })]), '"alpha.ping"', "no module provides it");
  });

  it("(d) two providers for one port", () => {
    expectRegistryError(
      () => build([alpha({ requiresPorts: [ping] }), pingProvider("beta"), pingProvider("gamma")]),
      '"alpha.ping"',
      "two providers",
    );
  });

  it("(e) a provider for a port no module requires", () => {
    expectRegistryError(() => build([pingProvider()]), '"alpha.ping"', "no module requires");
  });

  it("two different tokens with one name", () => {
    const twin = definePort<PingPort>("alpha.ping");
    expectRegistryError(
      () => build([alpha({ requiresPorts: [ping] }), { name: "beta", providesPorts: [bind(twin, () => ({ ping: async () => "x" }))] }]),
      '"alpha.ping"',
      "more than one token",
    );
  });

  it("(f) a provider's create calling deps.ports.get", () => {
    const bad: ModuleRegistration = {
      name: "beta",
      providesPorts: [
        bind(ping, (deps) => {
          deps.ports.get(ping);
          return { ping: async () => "x" };
        }),
      ],
    };
    expectRegistryError(
      () => build([alpha({ requiresPorts: [ping] }), bad]),
      '"alpha.ping"',
      "implementations cannot depend on other ports",
    );
  });

  it("(g) a module asking for a token missing from its requiresPorts", () => {
    expectRegistryError(
      () =>
        build([
          alpha({
            requiresPorts: [ping],
            apiRouters: {
              "/__alpha": (deps) => {
                deps.ports.get(secret);
                return router();
              },
            },
          }),
          pingProvider(),
        ]),
      '"alpha"',
      '"alpha.secret"',
      "requiresPorts",
    );
  });

  it("(h) Ports.get after start-up throws", () => {
    let kept: { get: (token: PortToken<PingPort>) => unknown } | undefined;
    build([
      alpha({
        requiresPorts: [ping],
        apiRouters: {
          "/__alpha": (deps) => {
            kept = deps.ports;
            return router();
          },
        },
      }),
      pingProvider(),
    ]);
    expectRegistryError(() => kept!.get(ping), "after start-up");
  });

  it("(p) a worker subscriber factory asking for a human-only token; the API may hold it", () => {
    const humanProvider: ModuleRegistration = {
      name: "beta",
      providesPorts: [bind(secret, () => ({ approve: async () => undefined }))],
    };
    const subscriber = alpha({
      requiresPorts: [secret],
      subscribers: (deps) => {
        deps.ports.get(secret);
        return [{ name: "alpha.x", eventTypes: ["AlphaRecorded"], handle: async () => undefined }];
      },
    });
    expectRegistryError(() => build([subscriber, humanProvider], "worker"), '"alpha.secret"', "human-only", "worker");
    expect(() =>
      build(
        [
          alpha({
            requiresPorts: [secret],
            apiRouters: {
              "/__alpha": (deps) => {
                deps.ports.get(secret);
                return router();
              },
            },
          }),
          humanProvider,
        ],
        "api",
      ),
    ).not.toThrow();
  });

  it("(m1) a look-alike token - same name, humanOnly false - is refused, in the worker and in the API", () => {
    const humanProvider: ModuleRegistration = {
      name: "beta",
      providesPorts: [bind(secret, () => ({ approve: async () => undefined }))],
    };
    const lookAlike = { name: "alpha.secret", humanOnly: false } as unknown as PortToken<never>;
    const worker = alpha({
      requiresPorts: [secret],
      subscribers: (deps) => {
        deps.ports.get(lookAlike);
        return [];
      },
    });
    expectRegistryError(() => build([worker, humanProvider], "worker"), '"alpha.secret"', "not the registered one");
    const api = alpha({
      requiresPorts: [secret],
      apiRouters: {
        "/__alpha": (deps) => {
          deps.ports.get(lookAlike);
          return router();
        },
      },
    });
    expectRegistryError(() => build([api, humanProvider], "api"), '"alpha.secret"', "not the registered one");
    // a frozen copy of the real token is a look-alike too (identity, not shape)
    const copy = { ...secret } as PortToken<never>;
    const copied = alpha({
      requiresPorts: [secret],
      subscribers: (deps) => {
        deps.ports.get(copy);
        return [];
      },
    });
    expectRegistryError(() => build([copied, humanProvider], "worker"), "not the registered one");
  });

  it("a correct wiring hands the requiring module the provider's frozen implementation", () => {
    let got: PingPort | undefined;
    build([
      alpha({
        requiresPorts: [ping],
        apiRouters: {
          "/__alpha": (deps) => {
            got = deps.ports.get(ping);
            return router();
          },
        },
      }),
      pingProvider(),
    ]);
    expect(got).toBeDefined();
    expect(Object.isFrozen(got)).toBe(true);
    expect(Object.keys(got!)).toEqual(["ping"]);
  });

  it("definePort checks its name and roles", () => {
    expect(() => definePort("nodot")).toThrow(/<module>\.<port>/);
    expect(() => definePort("a.b", { roles: [] })).toThrow(/no roles/);
    expect(definePort("a.b", { roles: ["ceo"] })).toMatchObject({ humanOnly: true, roles: ["ceo"] });
    expect(definePort("a.b")).toMatchObject({ humanOnly: false });
  });
});
