import type pg from "pg";
import type { TypeCatalogue } from "../audit/catalogue";
import type { ExecutionContext } from "../context/execution-context";

// The state shared by every view of one unit of work (Phase 0 spec §4.4). A unit has one
// transaction, one context and one poison flag; `adopt` creates another view of the SAME
// state bound to another module (R3-10).

export type PoisonKind = "audit" | "outbox" | "human";

export interface UnitPoison {
  readonly kind: PoisonKind;
  /** The first failure. Later failures do not replace it. */
  readonly cause: unknown;
}

export interface UnitState {
  readonly context: ExecutionContext;
  /** The transaction's client, reached only through the closed-checking proxy. */
  readonly client: pg.PoolClient;
  readonly auditCatalogue: TypeCatalogue;
  readonly eventCatalogue: TypeCatalogue;
  closed: boolean;
  poison: UnitPoison | undefined;
}

/** Records the first failure only. */
export function poisonUnit(state: UnitState, kind: PoisonKind, cause: unknown): void {
  state.poison ??= { kind, cause };
}
