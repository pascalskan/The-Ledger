import { createServer, type Server } from "node:http";
import type { Express } from "express";
import type { Logger } from "pino";
import { importAuthKeys, type AuthKeys } from "../auth/keys";
import {
  loadApiConfig,
  hardenEnvironment,
  scrubOwnerVariables,
  type ApiConfig,
  type Env,
  type LoadOptions,
} from "../config";
import { createRuntimePool, type DbPool } from "../db/client";
import { installDefaultRunner } from "../db/default-runner";
import type { UnitOfWorkRunner } from "../db/unit-of-work";
import { ConfigError } from "../errors/config-error";
import { createApiApp } from "../http/app";
import { createLogger } from "../logging/logger";
import { installCrashHandlers, type RegisterCrashHandlers } from "./crash-handlers";
import { buildRegistries, type Registries } from "../registry/build-registries";
import { RegistryError } from "../registry/registry-error";
import type { ModuleRegistration } from "../registry/types";

// PS-02, Phase 0 spec §4.8: the API process start-up sequence.
//
// `server/index.ts` is a thin call to this function with the module registry. The modules
// are a PARAMETER, so nothing under server/platform/ imports server/modules/ (import rule 8),
// and so a test can start the sequence with a deliberately broken list. `exit` is
// injectable for the same reason: a start-up failure is one FATAL line and exit code 1,
// before the API listens, and a test can observe that without ending its own process.
//
// Order: 1. load and validate the configuration, then scrub the owner's variables (RB2-02);
// 2. create the logger; 3. in full mode, create the ledger_app pool (no connection yet),
// import the token keys, check the registry and wire the ports, and install the process's
// unit of work runner; 4. build the app (PS-04); 5. mount the frontend LAST, so its catch-all
// can never shadow /health, /api or /portal/v1; 6. listen.

export interface StartApiOptions {
  readonly modules: readonly ModuleRegistration[];
  /** Default: the real process environment (read inside config/). */
  readonly env?: Env;
  readonly loadOptions?: LoadOptions;
  /** Default: `process.exit`. Called once on a start-up failure; start-up then stops. */
  readonly exit?: (code: number) => void;
  /** Default: a logger at the configured level. */
  readonly logger?: Logger;
  /** Mounts the frontend (Vite or static files) after the API routes. */
  readonly mountFrontend?: (app: Express, server: Server, config: ApiConfig) => Promise<void> | void;
  /** Default: the process-wide `installDefaultRunner`. */
  readonly installRunner?: (runner: UnitOfWorkRunner) => void;
  /** Default: the real process events. Injectable so the handlers can be invoked in a test. */
  readonly registerCrashHandlers?: RegisterCrashHandlers;
  /** Default true. */
  readonly listen?: boolean;
  /** Default: the configured port. 0 picks a free one. */
  readonly port?: number;
}

export interface RunningApi {
  readonly config: ApiConfig;
  readonly app: Express;
  readonly server: Server;
  readonly registries: Registries | undefined;
  /** Stops listening and closes the pool. */
  close(): Promise<void>;
}

export async function startApi(options: StartApiOptions): Promise<RunningApi | undefined> {
  const exit = options.exit ?? ((code: number) => process.exit(code));
  const earlyLogger = options.logger ?? createLogger({ service: "api" });

  let config: ApiConfig;
  try {
    config = loadApiConfig(options.env, options.loadOptions);
  } catch (error) {
    if (error instanceof ConfigError) {
      // The configured log level is not known yet; the line names variables, never values.
      earlyLogger.fatal({ variables: error.variables }, error.message);
      exit(1);
      return undefined;
    }
    throw error;
  }
  scrubOwnerVariables(options.env as Record<string, string | undefined> | undefined);
  hardenEnvironment(options.env as Record<string, string | undefined> | undefined);

  const logger = options.logger ?? createLogger({ service: "api", level: config.logLevel });
  installCrashHandlers(logger, exit, options.registerCrashHandlers);
  for (const warning of config.warnings) logger.warn(warning);

  let db: DbPool | undefined;
  try {
    let auth: AuthKeys | undefined;
    let registries: Registries | undefined;
    if (config.mode === "full") {
      // The API does not connect at start-up: /health reports whether the database is reachable.
      db = createRuntimePool({
        settings: config.database,
        logger,
        expectedRole: "ledger_app",
        exitOnRefusal: config.nodeEnv === "production",
      });
      auth = await importAuthKeys(config);
      // Check the namespaces, public routes and catalogues, and wire the ports. Any registry
      // error stops the API with one FATAL line, before it listens.
      registries = buildRegistries({
        modules: options.modules,
        process: "api",
        pool: db,
        logger,
        nodeEnv: config.nodeEnv,
      });
      // The process's single runner install, carrying the registry's catalogues.
      (options.installRunner ?? installDefaultRunner)(registries.runner);
    }

    const app = createApiApp({
      config,
      logger,
      ...(db === undefined ? {} : { db }),
      ...(auth === undefined ? {} : { auth }),
      ...(registries === undefined ? {} : { registries }),
    });
    const server = createServer(app);
    await options.mountFrontend?.(app, server, config);

    if (options.listen !== false) {
      const port = options.port ?? config.port;
      await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, () => {
          server.off("error", reject);
          resolve();
        });
      });
      logger.info({ port: (server.address() as { port: number } | null)?.port ?? port, mode: config.mode }, "serving");
    }

    const pool = db;
    return {
      config,
      app,
      server,
      registries,
      async close() {
        if (server.listening) await new Promise<void>((resolve) => server.close(() => resolve()));
        await pool?.end();
      },
    };
  } catch (error) {
    await db?.end().catch(() => undefined);
    if (error instanceof RegistryError) logger.fatal({ err: error }, error.message);
    else logger.fatal({ err: error }, "API failed to start");
    exit(1);
    return undefined;
  }
}
