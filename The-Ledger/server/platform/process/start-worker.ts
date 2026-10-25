import type { Logger } from "pino";
import {
  loadWorkerConfig,
  hardenEnvironment,
  scrubOwnerVariables,
  type Env,
  type LoadOptions,
  type WorkerConfig,
} from "../config";
import { createRuntimePool, type DbPool } from "../db/client";
import { installDefaultRunner } from "../db/default-runner";
import type { UnitOfWorkRunner } from "../db/unit-of-work";
import { ConfigError } from "../errors/config-error";
import { createOutboxWorker, newInstanceId, type OutboxWorker } from "../events/outbox-worker";
import { createLogger } from "../logging/logger";
import { installCrashHandlers, type RegisterCrashHandlers } from "./crash-handlers";
import { buildRegistries, type Registries } from "../registry/build-registries";
import { RegistryError } from "../registry/registry-error";
import type { ModuleRegistration } from "../registry/types";

// PS-03, Phase 0 spec §4.5: the worker process start-up sequence.
//
// `server/worker.ts` is a thin call to this function with the module registry (see
// start-api.ts for why the modules and `exit` are parameters). Order:
// 1. load the worker configuration (the worker has no frontend-only mode), then scrub the
//    owner's variables (RB2-02);
// 2. create the logger (service "worker") and the ledger_worker pool (no connection yet);
// 3. check the catalogues, wire the ports (human-only ports are not available to
//    subscribers) and build the subscriber registry; any registry error stops the worker with
//    one FATAL line before it claims an event;
// 4. create the outbox worker with an instance ID `<hostname>:<pid>:<8 random hex>` and start it;
// 5. on SIGINT or SIGTERM: stop (finish the event in hand, claim no more), close the pool, exit 0.
//    Full graceful shutdown with timeouts is Phase 9.

export interface StartWorkerOptions {
  readonly modules: readonly ModuleRegistration[];
  readonly env?: Env;
  readonly loadOptions?: LoadOptions;
  readonly exit?: (code: number) => void;
  readonly logger?: Logger;
  /** Default: the process-wide `installDefaultRunner`. */
  readonly installRunner?: (runner: UnitOfWorkRunner) => void;
  /** Default: the real process events. Injectable so the handlers can be invoked in a test. */
  readonly registerCrashHandlers?: RegisterCrashHandlers;
  /** Default true: handle SIGINT and SIGTERM. */
  readonly handleSignals?: boolean;
  /** Default: `process.once` for SIGINT and SIGTERM. Injectable so the shutdown path can be tested in-process. */
  readonly registerShutdown?: (shutdown: () => void) => void;
  /** Default true: start the polling loop. Tests that drive `runOnce()` themselves pass false. */
  readonly startLoop?: boolean;
}

export interface RunningWorker {
  readonly config: WorkerConfig;
  readonly registries: Registries;
  readonly worker: OutboxWorker;
  /** Stops the loop and closes the pool. */
  stop(): Promise<void>;
}

export async function startWorker(options: StartWorkerOptions): Promise<RunningWorker | undefined> {
  const exit = options.exit ?? ((code: number) => process.exit(code));
  const earlyLogger = options.logger ?? createLogger({ service: "worker" });

  let config: WorkerConfig;
  try {
    config = loadWorkerConfig(options.env, options.loadOptions);
  } catch (error) {
    if (error instanceof ConfigError) {
      earlyLogger.fatal({ variables: error.variables }, error.message);
      exit(1);
      return undefined;
    }
    throw error;
  }
  scrubOwnerVariables(options.env as Record<string, string | undefined> | undefined);
  hardenEnvironment(options.env as Record<string, string | undefined> | undefined);

  const logger = options.logger ?? createLogger({ service: "worker", level: config.logLevel });
  installCrashHandlers(logger, exit, options.registerCrashHandlers);
  for (const warning of config.warnings) logger.warn(warning);

  let pool: DbPool | undefined;
  try {
    pool = createRuntimePool({
      settings: config.database,
      logger,
      expectedRole: "ledger_worker",
      exitOnRefusal: config.nodeEnv === "production",
    });
    const registries = buildRegistries({
      modules: options.modules,
      process: "worker",
      pool,
      logger,
      nodeEnv: config.nodeEnv,
    });
    (options.installRunner ?? installDefaultRunner)(registries.runner);

    const worker = createOutboxWorker({
      pool,
      runner: registries.runner,
      subscribers: registries.subscribers,
      settings: config.outbox,
      logger,
      instanceId: newInstanceId(),
    });
    if (options.startLoop !== false) {
      worker.start();
      logger.info({ instanceId: worker.instanceId, subscribers: registries.subscribers.size }, "worker started");
    }

    const openPool = pool;
    const running: RunningWorker = {
      config,
      registries,
      worker,
      async stop() {
        await worker.stop();
        await openPool.end();
      },
    };
    if (options.handleSignals !== false) {
      const shutdown = () => {
        void running.stop().then(
          () => {
            logger.info({ instanceId: worker.instanceId }, "worker stopped");
            exit(0);
          },
          () => exit(1),
        );
      };
      (options.registerShutdown ?? ((handler) => {
        process.once("SIGINT", handler);
        process.once("SIGTERM", handler);
      }))(shutdown);
    }
    return running;
  } catch (error) {
    await pool?.end().catch(() => undefined);
    if (error instanceof RegistryError) logger.fatal({ err: error }, error.message);
    else logger.fatal({ err: error }, "Worker failed to start");
    exit(1);
    return undefined;
  }
}
