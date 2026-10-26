import { spawn, spawnSync } from "node:child_process";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { createTestPools, testDatabase } from "../testing";

// One spawned-process smoke test per entry point: the REAL server/index.ts and
// server/worker.ts still start (or exit) as expected. They run with an empty working
// directory, so no .env is read, and with a minimal environment.

const root = process.cwd();
// absolute, because the children run in another working directory
const tsxLoader = pathToFileURL(path.join(root, "node_modules", "tsx", "dist", "esm", "index.mjs")).href;

interface Outcome {
  output: string;
  exitCode: number | null;
}

/**
 * Runs an entry point until `until` matches its output (then kills it) or it exits. It is ONE
 * process (`node --import tsx file.ts`, not the tsx CLI, which starts a second node process
 * that a kill of the parent would leave running on Linux): after the kill, the test waits for
 * the exit and checks the process is really gone, so no stray worker can outlive the run and
 * consume other tests' events.
 */
function run(file: string, env: Record<string, string>, until?: RegExp, timeoutMs = 40_000): Promise<Outcome> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", tsxLoader, path.join(root, file)], {
      cwd: os.tmpdir(),
      env: { PATH: process.env.PATH ?? "", ...(process.env.SystemRoot ? { SystemRoot: process.env.SystemRoot } : {}), ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    let settled = false;
    let killed = false;
    const pid = child.pid!;
    const finish = (exitCode: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ output, exitCode });
    };
    const kill = () => {
      killed = true;
      if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"]);
      else child.kill("SIGKILL");
    };
    const onData = (chunk: Buffer) => {
      output += chunk.toString();
      if (!killed && until?.test(output)) kill();
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("exit", (code) => {
      // Gone: the pid no longer exists.
      expect(() => process.kill(pid, 0)).toThrow(expect.objectContaining({ code: "ESRCH" }));
      finish(killed ? null : code);
    });
    const timer = setTimeout(() => {
      kill();
      settled = true;
      reject(new Error(`${file} did not finish in ${timeoutMs} ms. Output so far:\n${output.slice(-2000)}`));
    }, timeoutMs);
  });
}

async function freePort(): Promise<number> {
  const server = net.createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as net.AddressInfo;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return port;
}

const records = (output: string) =>
  output
    .split("\n")
    .filter((line) => line.startsWith("{"))
    .map((line) => JSON.parse(line) as Record<string, any>);

describe("server/index.ts", () => {
  it("starts in frontend-only mode with no configuration, serving /health", async () => {
    const port = await freePort();
    const outcome = await run("server/index.ts", { NODE_ENV: "development", PORT: String(port) }, /"message":"serving"/);
    expect(outcome.exitCode).toBeNull();
    const lines = records(outcome.output);
    expect(lines.filter((l) => l.level === "WARN")).toHaveLength(1);
    expect(lines.find((l) => l.message === "serving")).toMatchObject({ port, mode: "frontend_only" });
  });

  it("exits 1 with one FATAL line naming the four backend variables when production has none", async () => {
    const outcome = await run("server/index.ts", { NODE_ENV: "production" });
    expect(outcome.exitCode).toBe(1);
    const fatal = records(outcome.output).filter((l) => l.level === "FATAL");
    expect(fatal).toHaveLength(1);
    expect(fatal[0]!.variables).toEqual(["LEDGER_APP_DATABASE_URL", "JWT_PRIVATE_KEY", "JWT_PUBLIC_KEY", "PORTAL_JWT_SECRET"]);
    expect(outcome.output).not.toContain('"message":"serving"');
  });
});

describe("server/worker.ts", () => {
  it("exits 1 with one FATAL line naming LEDGER_WORKER_DATABASE_URL when it is missing", async () => {
    const outcome = await run("server/worker.ts", { NODE_ENV: "development" });
    expect(outcome.exitCode).toBe(1);
    const fatal = records(outcome.output).filter((l) => l.level === "FATAL");
    expect(fatal).toHaveLength(1);
    expect(fatal[0]!.variables).toEqual(["LEDGER_WORKER_DATABASE_URL"]);
  });

  it("starts against the test database and logs its instance ID, with the owner's variables scrubbed", async () => {
    const { worker, migration } = testDatabase();
    const url = `postgresql://${worker.user}:${encodeURIComponent(worker.password)}@${worker.host}:${worker.port}/${worker.database}`;
    const outcome = await run(
      "server/worker.ts",
      {
        NODE_ENV: "development",
        LEDGER_WORKER_DATABASE_URL: url,
        OUTBOX_POLL_INTERVAL_MS: "200",
        // the owner's variables are present, as on Replit; the worker must never use them
        DATABASE_URL: `postgresql://${migration.user}:x@${migration.host}:${migration.port}/heliumdb`,
        PGUSER: migration.user,
      },
      /"message":"worker started"/,
    );
    expect(outcome.exitCode).toBeNull();
    const started = records(outcome.output).find((l) => l.message === "worker started");
    expect(started).toMatchObject({ service: "worker", subscribers: 0 });
    expect(started!.instanceId).toMatch(/^.+:\d+:[0-9a-f]{8}$/);
    expect(outcome.output).not.toContain(worker.password);
  });
});

describe("graceful shutdown of the real worker file", () => {
  // Covered on Linux only: Windows has no catchable SIGTERM for a child process. The same
  // shutdown path is covered in-process, on every platform, by start.test.ts.
  it.skipIf(process.platform === "win32")(
    "SIGTERM: exit code 0, 'worker stopped' logged, and the worker's database connections are closed",
    async () => {
      const { worker } = testDatabase();
      const url = `postgresql://${worker.user}:${encodeURIComponent(worker.password)}@${worker.host}:${worker.port}/${worker.database}`;
      const child = spawn(process.execPath, ["--import", tsxLoader, path.join(root, "server/worker.ts")], {
        cwd: os.tmpdir(),
        env: { PATH: process.env.PATH ?? "", NODE_ENV: "development", LEDGER_WORKER_DATABASE_URL: url, OUTBOX_POLL_INTERVAL_MS: "100" },
        stdio: ["ignore", "pipe", "pipe"],
      });
      let output = "";
      child.stdout.on("data", (chunk: Buffer) => (output += chunk.toString()));
      child.stderr.on("data", (chunk: Buffer) => (output += chunk.toString()));
      const exited = new Promise<number | null>((resolve) => child.on("exit", (code) => resolve(code)));
      const deadline = Date.now() + 30_000;
      while (!output.includes('"message":"worker started"') && Date.now() < deadline) await new Promise((r) => setTimeout(r, 100));
      // let it poll, so a connection is open
      await new Promise((r) => setTimeout(r, 500));
      child.kill("SIGTERM");
      expect(await exited).toBe(0);
      expect(output).toContain('"message":"worker stopped"');
      const pools = createTestPools();
      try {
        // backends can linger for a moment after their client disconnects: poll briefly
        const openConnections = () =>
          pools.owner.withClient(async (client) =>
            (await client.query("SELECT count(*)::int AS n FROM pg_stat_activity WHERE application_name = 'ledger-worker' AND datname = current_database()")).rows[0].n as number,
          );
        let open = await openConnections();
        for (let attempt = 0; open !== 0 && attempt < 30; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          open = await openConnections();
        }
        expect(open).toBe(0);
      } finally {
        await pools.end();
      }
    },
  );
});
