import os from "node:os";
import { describe, expect, it, vi } from "vitest";
import { createLogger } from "../logging/logger";
import { createRuntimePool } from "../db/client";
import { startWorker } from "./start-worker";

// Review round 3, item 11: the worker handles one event at a time, so its pool is two connections.

vi.mock("../db/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../db/client")>();
  return { ...actual, createRuntimePool: vi.fn(actual.createRuntimePool) };
});

describe("startWorker", () => {
  it("creates its pool with at most two connections", async () => {
    const logger = createLogger({ service: "worker", level: "fatal", destination: { write: () => undefined } });
    const worker = await startWorker({
      modules: [],
      env: {
        NODE_ENV: "development",
        LEDGER_WORKER_DATABASE_URL: "postgresql://ledger_worker:pw-worker@127.0.0.1:55432/ledger_test",
      },
      loadOptions: { appDir: os.tmpdir() },
      exit: vi.fn(),
      logger,
      installRunner: vi.fn(),
      handleSignals: false,
      startLoop: false,
      registerCrashHandlers: () => undefined,
    });
    try {
      expect(createRuntimePool).toHaveBeenCalledTimes(1);
      expect(vi.mocked(createRuntimePool).mock.calls[0]![0]).toMatchObject({ expectedRole: "ledger_worker", max: 2 });
    } finally {
      await worker?.stop();
    }
  });
});
