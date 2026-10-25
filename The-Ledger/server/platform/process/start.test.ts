import { generateKeyPairSync, randomBytes } from "node:crypto";
import os from "node:os";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createLogger } from "../logging/logger";
import { bind, definePort } from "../registry/ports";
import type { ModuleRegistration } from "../registry/types";
import { startApi, type RunningApi } from "./start-api";
import { startWorker } from "./start-worker";

// PS-02 and PS-03 in-process: the start-up sequences take the modules, the environment and
// `exit` as parameters, so a failure (G0-41 i) is observed here without ending the test process.
// No connection is made: the pools are created but never used.

const PEM = (() => {
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  return {
    privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    publicKey: publicKey.export({ type: "spki", format: "pem" }).toString(),
  };
})();

const fullEnv = (extra: Record<string, string> = {}) => ({
  NODE_ENV: "development",
  LEDGER_APP_DATABASE_URL: "postgresql://ledger_app:pw-app@127.0.0.1:55432/ledger_test",
  LEDGER_WORKER_DATABASE_URL: "postgresql://ledger_worker:pw-worker@127.0.0.1:55432/ledger_test",
  JWT_PRIVATE_KEY: PEM.privateKey,
  JWT_PUBLIC_KEY: PEM.publicKey,
  PORTAL_JWT_SECRET: randomBytes(48).toString("base64"),
  ...extra,
});
const loadOptions = { appDir: os.tmpdir() };

function capture() {
  const lines: string[] = [];
  const logger = createLogger({ service: "api", level: "debug", destination: { write: (c: string) => void lines.push(c) } });
  return { lines, logger, records: () => lines.map((l) => JSON.parse(l) as Record<string, any>) };
}

const ping = definePort<{ ping(): Promise<string> }>("alpha.ping");
/** A broken registration: a required port nobody provides. */
const unprovided: ModuleRegistration = { name: "alpha", requiresPorts: [ping] };

const started: RunningApi[] = [];
afterEach(async () => {
  await Promise.all(started.splice(0).map((api) => api.close()));
});

describe("startApi", () => {
  it("(G0-41 i) a registry error is one FATAL line naming the port, then exit 1, and the API never listens", async () => {
    const { lines, logger, records } = capture();
    const exit = vi.fn();
    const installRunner = vi.fn();
    const result = await startApi({ modules: [unprovided], env: fullEnv(), loadOptions, exit, logger, installRunner });
    expect(result).toBeUndefined();
    expect(exit).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(1);
    const fatal = records().filter((r) => r.level === "FATAL");
    expect(fatal).toHaveLength(1);
    expect(fatal[0]!.message).toContain('"alpha.ping"');
    expect(records().some((r) => r.message === "serving")).toBe(false);
    expect(installRunner).not.toHaveBeenCalled();
    expect(lines.join("\n")).not.toContain("pw-app");
  });

  it("a configuration error is one FATAL line naming the variables, then exit 1", async () => {
    const { logger, records } = capture();
    const exit = vi.fn();
    const result = await startApi({ modules: [], env: { NODE_ENV: "production" }, loadOptions, exit, logger });
    expect(result).toBeUndefined();
    expect(exit).toHaveBeenCalledWith(1);
    const fatal = records().filter((r) => r.level === "FATAL");
    expect(fatal).toHaveLength(1);
    expect(fatal[0]!.variables).toEqual(["LEDGER_APP_DATABASE_URL", "JWT_PRIVATE_KEY", "JWT_PUBLIC_KEY", "PORTAL_JWT_SECRET"]);
  });

  it("scrubs the owner's variables from the environment it was given, after loading", async () => {
    const env: Record<string, string | undefined> = fullEnv({
      DATABASE_URL: "postgresql://postgres:x@helium/heliumdb",
      PGHOST: "helium",
      LEDGER_MIGRATION_DATABASE_URL: "postgresql://postgres:x@h/d",
    });
    const { logger } = capture();
    const api = await startApi({ modules: [], env, loadOptions, exit: vi.fn(), logger, installRunner: vi.fn(), listen: false });
    expect(api).toBeDefined();
    started.push(api!);
    expect(env.DATABASE_URL).toBeUndefined();
    expect(env.PGHOST).toBeUndefined();
    expect(env.LEDGER_MIGRATION_DATABASE_URL).toBeUndefined();
    expect(env.LEDGER_APP_DATABASE_URL).toBeDefined();
  });

  it("starts, installs the registry's runner once, mounts the frontend last and listens", async () => {
    const { logger, records } = capture();
    const installRunner = vi.fn();
    const mountFrontend = vi.fn((app: import("express").Express) => {
      app.use((_req, res) => void res.type("html").send("<html>frontend</html>"));
    });
    const api = await startApi({ modules: [], env: fullEnv(), loadOptions, exit: vi.fn(), logger, installRunner, mountFrontend, port: 0 });
    expect(api).toBeDefined();
    started.push(api!);
    expect(installRunner).toHaveBeenCalledTimes(1);
    expect(installRunner).toHaveBeenCalledWith(api!.registries!.runner);
    expect(mountFrontend).toHaveBeenCalledTimes(1);
    expect(api!.server.listening).toBe(true);
    expect(records().find((r) => r.message === "serving")).toMatchObject({ mode: "full" });
    // the frontend is reachable, and the API paths are not shadowed by it
    expect((await request(api!.server).get("/portal/projects")).text).toContain("frontend");
    expect((await request(api!.server).get("/api/v1/x")).status).toBe(401);
  });

  it("frontend-only mode: one WARN, no registries, no pool, and it listens", async () => {
    const { logger, records } = capture();
    const installRunner = vi.fn();
    const api = await startApi({ modules: [unprovided], env: { NODE_ENV: "development" }, loadOptions, exit: vi.fn(), logger, installRunner, port: 0 });
    started.push(api!);
    // the unprovided port is not checked: frontend-only mode has no backend
    expect(api!.registries).toBeUndefined();
    expect(installRunner).not.toHaveBeenCalled();
    expect(records().filter((r) => r.level === "WARN")).toHaveLength(1);
    expect((await request(api!.server).get("/health")).body).toEqual({ status: "ok", mode: "frontend_only" });
  });

  it("an error from mounting the frontend, or from listening, is a FATAL line and exit 1", async () => {
    const { logger, records } = capture();
    const exit = vi.fn();
    const result = await startApi({
      modules: [],
      env: { NODE_ENV: "development" },
      loadOptions,
      exit,
      logger,
      mountFrontend: () => {
        throw new Error("vite failed");
      },
    });
    expect(result).toBeUndefined();
    expect(exit).toHaveBeenCalledWith(1);
    expect(records().find((r) => r.level === "FATAL")).toMatchObject({ message: "API failed to start" });
  });
});

describe("startWorker", () => {
  it("(G0-41 i) a registry error is one FATAL line naming the port, then exit 1, before any event is claimed", async () => {
    const { logger, records } = capture();
    const exit = vi.fn();
    const installRunner = vi.fn();
    const result = await startWorker({ modules: [unprovided], env: fullEnv(), loadOptions, exit, logger, installRunner, handleSignals: false });
    expect(result).toBeUndefined();
    expect(exit).toHaveBeenCalledWith(1);
    const fatal = records().filter((r) => r.level === "FATAL");
    expect(fatal).toHaveLength(1);
    expect(fatal[0]!.message).toContain('"alpha.ping"');
    expect(records().some((r) => r.message === "worker started")).toBe(false);
    expect(installRunner).not.toHaveBeenCalled();
  });

  it("the worker has no frontend-only mode: a missing URL is a FATAL line naming it", async () => {
    const { logger, records } = capture();
    const exit = vi.fn();
    const result = await startWorker({ modules: [], env: { NODE_ENV: "development" }, loadOptions, exit, logger });
    expect(result).toBeUndefined();
    expect(exit).toHaveBeenCalledWith(1);
    expect(records().find((r) => r.level === "FATAL")!.variables).toEqual(["LEDGER_WORKER_DATABASE_URL"]);
  });

  it("scrubs the owner's variables and installs the registry's runner once", async () => {
    const env: Record<string, string | undefined> = fullEnv({ DATABASE_URL: "postgresql://postgres:x@helium/heliumdb", PGPASSWORD: "x" });
    const { logger } = capture();
    const installRunner = vi.fn();
    const worker = await startWorker({ modules: [], env, loadOptions, exit: vi.fn(), logger, installRunner, handleSignals: false, startLoop: false });
    expect(worker).toBeDefined();
    expect(env.DATABASE_URL).toBeUndefined();
    expect(env.PGPASSWORD).toBeUndefined();
    expect(installRunner).toHaveBeenCalledWith(worker!.registries.runner);
    expect(worker!.worker.instanceId).toMatch(/^.+:\d+:[0-9a-f]{8}$/);
    await worker!.stop();
  });

  it("a human-only port asked for by a subscriber factory stops the worker", async () => {
    const secret = definePort<{ approve(): Promise<void> }>("alpha.secret", { humanOnly: true });
    const { logger, records } = capture();
    const exit = vi.fn();
    const modules: ModuleRegistration[] = [
      {
        name: "alpha",
        requiresPorts: [secret],
        producesEvents: [{ type: "AlphaRecorded", jobRequired: false }],
        subscribers: (deps) => {
          deps.ports.get(secret);
          return [];
        },
      },
      { name: "beta", providesPorts: [bind(secret, () => ({ approve: async () => undefined }))] },
    ];
    expect(await startWorker({ modules, env: fullEnv(), loadOptions, exit, logger, handleSignals: false })).toBeUndefined();
    expect(exit).toHaveBeenCalledWith(1);
    expect(records().find((r) => r.level === "FATAL")!.message).toContain("human-only");
  });
});
