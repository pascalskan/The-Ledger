import { AsyncLocalStorage } from "node:async_hooks";

// The correlation fields the logger adds to every line (Phase 0 spec §4.7).
// API requests carry requestId (and companyId / userId once authenticated);
// worker runs carry runId. All values are identifiers, never personal data.
export interface LogContext {
  requestId?: string;
  companyId?: string;
  userId?: string;
  runId?: string;
}

const storage = new AsyncLocalStorage<LogContext>();

/**
 * Runs `fn` inside a log context. The scope is entered with `run()` only, never
 * `enterWith()`, so a context cannot leak into later, unrelated async work
 * (spec §4.8). The store is mutable so that authentication middleware can add
 * `companyId` and `userId` once they are known (see `updateLogContext`).
 */
export function runWithLogContext<T>(context: LogContext, fn: () => T): T {
  return storage.run(context, fn);
}

/** The active log context, or undefined outside any request or run. */
export function getLogContext(): Readonly<LogContext> | undefined {
  return storage.getStore();
}

/** Adds fields to the active log context. Does nothing outside a context. */
export function updateLogContext(fields: Partial<LogContext>): void {
  const store = storage.getStore();
  if (store) Object.assign(store, fields);
}
