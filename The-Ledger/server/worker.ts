import { modules } from "./modules/registry";
import { startWorker } from "./platform/process/start-worker";

// Worker process entry (Phase 0 spec PS-03). The start-up sequence lives in
// platform/process/start-worker.ts and takes the module registry as a parameter.
void startWorker({ modules });
