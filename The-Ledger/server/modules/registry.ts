import type { ModuleRegistration } from "../platform";

// The list of registered modules (Phase 0 spec section 4.8). Empty in Phase 0: the platform
// engineer creates this file and each module engineer adds one line. Only the two process
// entry points import it (import rule 8). It is the composition root, not a module: it reaches
// the platform through its public surface like a module does.
export const modules: readonly ModuleRegistration[] = [];
