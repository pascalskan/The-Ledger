import { createServer } from "http";
import { importAuthKeys, type AuthKeys } from "./platform/auth/keys";
import { loadApiConfig, scrubOwnerVariables, type ApiConfig } from "./platform/config";
import { createRuntimePool, type DbPool } from "./platform/db/client";
import { installDefaultRunner } from "./platform/db/default-runner";
import { createUnitOfWorkRunner } from "./platform/db/unit-of-work";
import { ConfigError } from "./platform/errors/config-error";
import { createApiApp } from "./platform/http/app";
import { createLogger } from "./platform/logging/logger";
import { serveStatic } from "./static";

// API process entry (Phase 0 spec PS-02). Order:
//   1. load and validate the configuration (exit 1 on ConfigError), then scrub the
//      owner's variables from the process (RB2-02);
//   2. create the logger;
//   3. in full mode, create the ledger_app pool (no connection yet), import the token keys
//      and install the process's unit of work runner; then build the API app (PS-04):
//      /health, /api/v1, /portal/v1;
//   4. mount the frontend LAST, so its catch-all can never shadow an API path;
//   5. listen.
// Import rule 13: the environment is read only inside platform/config.

let config: ApiConfig;
try {
  config = loadApiConfig();
} catch (error) {
  if (error instanceof ConfigError) {
    // The configured log level is not known yet; the FATAL line names variables, never values.
    createLogger({ service: "api" }).fatal({ variables: error.variables }, error.message);
    process.exit(1);
  }
  throw error;
}
scrubOwnerVariables();

const logger = createLogger({ service: "api", level: config.logLevel });
for (const warning of config.warnings) logger.warn(warning);

(async () => {
  let db: DbPool | undefined;
  let auth: AuthKeys | undefined;
  if (config.mode === "full") {
    // The API does not connect at start-up: /health reports whether the database is reachable.
    db = createRuntimePool({
      settings: config.database,
      logger,
      expectedRole: "ledger_app",
      exitOnRefusal: config.nodeEnv === "production",
    });
    auth = await importAuthKeys(config);
    // Catalogues come from the module registry (commit 7); Phase 0 registers nothing.
    installDefaultRunner(createUnitOfWorkRunner({ pool: db }));
  }
  const app = createApiApp({
    config,
    logger,
    ...(db === undefined ? {} : { db }),
    ...(auth === undefined ? {} : { auth }),
  });
  const httpServer = createServer(app);

  // Vite middleware in development, static files in production. Errors raised here
  // keep Express's default handling (PS-04).
  if (config.nodeEnv === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // Port 5000 is the only port that is not firewalled on Replit; it serves both the
  // API and the client.
  httpServer.listen(config.port, () => {
    logger.info({ port: config.port, mode: config.mode }, "serving");
  });
})().catch((error: unknown) => {
  logger.fatal({ err: error }, "API failed to start");
  process.exit(1);
});
