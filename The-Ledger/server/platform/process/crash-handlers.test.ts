import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import pg from "pg";
import { describe, expect, it, vi } from "vitest";
import { createLogger } from "../logging/logger";
import { installCrashHandlers, registerOnProcess, type CrashHandler } from "./crash-handlers";
import { startApi } from "./start-api";
import { startWorker } from "./start-worker";

// Review round 2, minor 6: an unhandled rejection or an uncaught exception is logged through the
// safe logger at FATAL and the process exits 1; Node's default handler (raw error on stderr,
// PostgreSQL `detail` and `where` included) never runs.

const MARK = "MARKER-CRASH-3318";
const leaky = () =>
  Object.assign(new pg.DatabaseError(`invalid input syntax for type uuid: "${MARK}"`, 100, "error"), {
    severity: "ERROR",
    code: "22P02",
    detail: `Key (value)=(${MARK}) detail`,
    where: `PL/pgSQL where ${MARK}`,
  });

function capture(service: "api" | "worker" = "api") {
  const lines: string[] = [];
  const logger = createLogger({ service, level: "debug", destination: { write: (c: string) => void lines.push(c) } });
  return { lines, logger, records: () => lines.map((l) => JSON.parse(l) as Record<string, any>) };
}

function setup() {
  const { lines, logger, records } = capture();
  const exit = vi.fn();
  let handler: CrashHandler | undefined;
  installCrashHandlers(logger, exit, (h) => {
    handler = h;
  });
  return { lines, exit, records, trigger: handler as CrashHandler };
}

describe("installCrashHandlers", () => {
  it.each(["unhandledRejection", "uncaughtException"] as const)(
    "%s with a pg error: one FATAL line through the serializer (no detail, where or raw message), then exit 1",
    (kind) => {
      const { lines, exit, trigger, records } = setup();
      trigger(kind, leaky());
      expect(exit).toHaveBeenCalledTimes(1);
      expect(exit).toHaveBeenCalledWith(1);
      const fatal = records().filter((r) => r.level === "FATAL");
      expect(fatal).toHaveLength(1);
      expect(fatal[0]).toMatchObject({
        message: kind === "unhandledRejection" ? "Unhandled promise rejection" : "Uncaught exception",
        err: { pgCode: "22P02", message: "PostgreSQL error 22P02" },
      });
      const text = lines.join("\n");
      expect(text).not.toContain(MARK);
      expect(text).not.toContain('"detail"');
      expect(text).not.toContain('"where"');
    },
  );

  it("a reason that is not an Error is never logged, only its type", () => {
    const { lines, exit, trigger, records } = setup();
    trigger("unhandledRejection", `a string carrying ${MARK}`);
    expect(exit).toHaveBeenCalledWith(1);
    expect(records()[0]).toMatchObject({ level: "FATAL", thrownType: "string" });
    expect(lines.join("\n")).not.toContain(MARK);
  });

  it("only the first failure is handled while exiting", () => {
    const { exit, trigger, records } = setup();
    trigger("uncaughtException", new Error("one"));
    trigger("unhandledRejection", new Error("two"));
    expect(exit).toHaveBeenCalledTimes(1);
    expect(records().filter((r) => r.level === "FATAL")).toHaveLength(1);
  });

  it("exits even when the logger itself fails", () => {
    const exit = vi.fn();
    const broken = {
      fatal: () => {
        throw new Error("logger down");
      },
    } as never;
    let handler: CrashHandler | undefined;
    installCrashHandlers(broken, exit, (h) => {
      handler = h;
    });
    expect(() => handler!("uncaughtException", new Error("x"))).toThrow("logger down");
    expect(exit).toHaveBeenCalledWith(1);
  });

  it("the default registration adds nothing under Vitest (a test worker keeps its own handlers)", () => {
    const count = () => [process.listenerCount("unhandledRejection"), process.listenerCount("uncaughtException")];
    const before = count();
    registerOnProcess(() => undefined);
    expect(count()).toEqual(before);
  });
});

describe("both start-up sequences install them", () => {
  const loadOptions = { appDir: os.tmpdir() };

  it("startApi registers with its logger and exit", async () => {
    const { lines, logger } = capture("api");
    const exit = vi.fn();
    let handler: CrashHandler | undefined;
    const running = await startApi({
      modules: [],
      env: { NODE_ENV: "development" },
      loadOptions,
      exit,
      logger,
      listen: false,
      registerCrashHandlers: (h) => {
        handler = h;
      },
    });
    try {
      expect(handler).toBeDefined();
      handler!("unhandledRejection", leaky());
      expect(exit).toHaveBeenCalledWith(1);
      expect(lines.join("\n")).not.toContain(MARK);
      expect(lines.join("\n")).toContain("Unhandled promise rejection");
    } finally {
      await running?.close();
    }
  });

  it("startWorker registers with its logger and exit", async () => {
    const { lines, logger } = capture("worker");
    const exit = vi.fn();
    let handler: CrashHandler | undefined;
    const running = await startWorker({
      modules: [],
      env: {
        NODE_ENV: "development",
        LEDGER_WORKER_DATABASE_URL: "postgresql://ledger_worker:pw-worker@127.0.0.1:55432/ledger_test",
      },
      loadOptions,
      exit,
      logger,
      startLoop: false,
      handleSignals: false,
      installRunner: vi.fn(),
      registerCrashHandlers: (h) => {
        handler = h;
      },
    });
    try {
      expect(handler).toBeDefined();
      handler!("uncaughtException", leaky());
      expect(exit).toHaveBeenCalledWith(1);
      expect(lines.join("\n")).not.toContain(MARK);
      expect(lines.join("\n")).toContain("Uncaught exception");
    } finally {
      await running?.stop();
    }
  });
});

describe("the real process", () => {
  const root = process.cwd();
  const tsxLoader = pathToFileURL(path.join(root, "node_modules", "tsx", "dist", "esm", "index.mjs")).href;
  const startApiUrl = pathToFileURL(path.join(root, "server", "platform", "process", "start-api.ts")).href;
  const pgUrl = pathToFileURL(path.join(root, "node_modules", "pg", "lib", "index.js")).href;

  it("an un-awaited rejecting pg error is logged safely, no detail reaches stderr, and the process exits 1", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "ledger-crash-"));
    try {
      const script = path.join(dir, "crash.mjs");
      writeFileSync(
        script,
        [
          `import pg from ${JSON.stringify(pgUrl)};`,
          `import { startApi } from ${JSON.stringify(startApiUrl)};`,
          `const error = Object.assign(new pg.DatabaseError("invalid input syntax for type uuid: \\"${MARK}\\"", 100, "error"), {`,
          `  severity: "ERROR", code: "22P02", detail: "Key (value)=(${MARK}) detail", where: "PL/pgSQL where ${MARK}",`,
          `});`,
          `await startApi({ modules: [], env: { NODE_ENV: "development" }, loadOptions: { appDir: ${JSON.stringify(dir)} }, port: 0,`,
          `  mountFrontend: () => { Promise.reject(error); } });`,
          `await new Promise((resolve) => setTimeout(resolve, 20000));`,
          `console.log("STILL RUNNING");`,
        ].join("\n"),
      );
      const result = spawnSync(process.execPath, ["--import", tsxLoader, script], {
        cwd: dir,
        env: {
          PATH: process.env.PATH ?? "",
          ...(process.env.SystemRoot ? { SystemRoot: process.env.SystemRoot } : {}),
        },
        encoding: "utf8",
        timeout: 60_000,
      });
      expect(result.stdout).not.toContain("STILL RUNNING");
      expect(result.status).toBe(1);
      for (const stream of [result.stdout, result.stderr]) {
        expect(stream).not.toContain(MARK);
        expect(stream).not.toContain("detail");
        expect(stream).not.toMatch(/["']?where["']?\s*[:=]/);
      }
      const fatal = result.stdout
        .split("\n")
        .filter((line) => line.startsWith("{"))
        .map((line) => JSON.parse(line) as Record<string, any>)
        .find((record) => record.level === "FATAL");
      expect(fatal).toMatchObject({ message: "Unhandled promise rejection", err: { pgCode: "22P02" } });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 90_000);
});
