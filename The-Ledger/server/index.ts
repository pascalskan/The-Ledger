import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import {
  API_BACKEND_VARIABLES,
  loadApiConfig,
  scrubOwnerVariables,
} from "./platform/config";
import { ConfigError } from "./platform/errors/config-error";
import { createLogger } from "./platform/logging/logger";

// Phase 0 commit 2: configuration is loaded (and validated) before anything
// listens, and the owner's variables are removed from the process. The rest of
// this file is rewritten in commit 3. Import rule 13: the environment is read only inside platform/config.
const startupLogger = createLogger({ service: "api" });
let config: ReturnType<typeof loadApiConfig>;
try {
  config = loadApiConfig();
} catch (error) {
  if (error instanceof ConfigError) {
    startupLogger.fatal({ variables: error.variables }, error.message);
    process.exit(1);
  }
  throw error;
}
scrubOwnerVariables();
for (const warning of config.warnings) startupLogger.warn(warning);
if (config.mode === "frontend_only") {
  startupLogger.warn(
    { variables: API_BACKEND_VARIABLES },
    "Backend not configured: running in frontend-only mode",
  );
}

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (config.nodeEnv === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
const port = config.port;

httpServer.listen(port, () => {
  log(`serving on port ${port}`);
});
})();
