import type { ModuleRegistration } from "../platform/registry/types";

// The list of registered modules (Phase 0 spec section 4.8). Empty in Phase 0: the platform
// engineer creates this file and each module engineer adds one line. Only the two process
// entry points import it (import rule 8).
export const modules: readonly ModuleRegistration[] = [];
