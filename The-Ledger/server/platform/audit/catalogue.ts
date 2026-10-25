// Phase 0 spec §4.4 (R2-16, R3-10): the audit and event catalogues.
//
// Each module declares the audit entry types and event types it produces in its
// registration. A type is registered once across all modules, and the module that
// registers it is its OWNER: only that module's units may write it.

export interface CatalogueEntry {
  readonly owner: string;
  readonly jobRequired: boolean;
}

export type TypeCatalogue = ReadonlyMap<string, CatalogueEntry>;

export interface CatalogueRegistration {
  /** The module's registration name. */
  readonly module: string;
  readonly types: readonly { readonly type: string; readonly jobRequired: boolean }[];
}

/** A catalogue problem found at start-up. The message names the type and modules. */
export class CatalogueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogueError";
  }
}

/**
 * Builds a catalogue from the module registrations. A type registered twice, by one module
 * or two, is a start-up error naming the type.
 */
export function buildTypeCatalogue(
  kind: "audit entry type" | "event type",
  registrations: readonly CatalogueRegistration[],
): TypeCatalogue {
  const catalogue = new Map<string, CatalogueEntry>();
  for (const registration of registrations) {
    for (const { type, jobRequired } of registration.types) {
      const existing = catalogue.get(type);
      if (existing !== undefined) {
        throw new CatalogueError(
          `The ${kind} "${type}" is registered by both "${existing.owner}" and "${registration.module}"; each type has exactly one owner`,
        );
      }
      catalogue.set(type, Object.freeze({ owner: registration.module, jobRequired }));
    }
  }
  return catalogue;
}

/** An empty catalogue, for processes and tests that register nothing. */
export const EMPTY_CATALOGUE: TypeCatalogue = new Map();
