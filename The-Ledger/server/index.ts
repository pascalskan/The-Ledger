import { serveStatic } from "./static";
import { modules } from "./modules/registry";
import { startApi } from "./platform/process/start-api";

// API process entry (Phase 0 spec PS-02). The start-up sequence lives in
// platform/process/start-api.ts and takes the module registry as a parameter; this file only
// passes it in and says how the frontend is served: Vite middleware in development, static
// files in production, mounted after the API routes so its catch-all can never shadow one.
void startApi({
  modules,
  mountFrontend: async (app, server, config) => {
    if (config.nodeEnv === "production") {
      serveStatic(app);
    } else {
      const { setupVite } = await import("./vite");
      await setupVite(server, app);
    }
  },
});
