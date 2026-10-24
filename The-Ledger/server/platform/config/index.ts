// The configuration module: the only code under server/ that reads the
// environment (Phase 0 spec §4.6, import rule 13). Platform-internal; modules
// never import it (they import server/platform/index.ts only).
export * from "./database-url";
export * from "./env";
export * from "./test-database";
