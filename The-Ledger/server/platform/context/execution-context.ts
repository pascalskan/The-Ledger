import {
  ContextExpiredError,
  ForgedContextError,
  MissingTenantContextError,
} from "../errors/platform-errors";

// Phase 0 spec §4.1: tenant context and actor.
//
// A context is genuine only if that exact object was built by a platform factory and is a
// member of a platform-private WeakSet. A copy made with spread, Object.assign,
// structuredClone or an object literal is not a member, even if every field matches.
// Genuine contexts are deep-frozen. Request contexts are marked dead when the response
// finishes; subscriber contexts when their unit of work closes.
//
// This file is platform-internal. Modules receive contexts and never build them; the
// factories are reachable only through platform code, the token middleware, the worker
// and server/platform/system/index.ts (import rule 11).

export type CompanyId = string & { readonly __brand: "CompanyId" };
export type PlatformRole = "ceo" | "pm" | "worker";

export type Actor =
  | { readonly kind: "user"; readonly userId: string; readonly role: PlatformRole }
  | {
      readonly kind: "portal_user";
      readonly portalAccountId: string;
      readonly clientId: string;
      readonly role: "client";
    }
  | { readonly kind: "system"; readonly component: string };

/** What module code can see of the cause of a subscriber's work: the event, nothing else. */
export interface Causation {
  readonly eventId: string;
}

export interface TenantContext {
  readonly companyId: CompanyId;
}

export interface ExecutionContext extends TenantContext {
  readonly actor: Actor;
  /** Set only for subscriber work. */
  readonly causation: Causation | null;
  /** API requests. */
  readonly requestId?: string;
  /** Worker runs. */
  readonly runId?: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

/**
 * The only way to make a CompanyId. Throws MissingTenantContextError unless the value is a
 * UUID. Re-exported only from server/platform/system/index.ts (R2-03).
 */
export function toCompanyId(value: unknown): CompanyId {
  if (!isUuid(value)) throw new MissingTenantContextError();
  return value.toLowerCase() as CompanyId;
}

// --- platform-private state -------------------------------------------------

const genuine = new WeakSet<object>();
const expired = new WeakSet<object>();
/** The nearest human in the causal chain: kept off the context so module code cannot read it (R2-02). */
const causationActors = new WeakMap<object, string | null>();

export interface CreateContextInput {
  readonly companyId: CompanyId;
  readonly actor: Actor;
  /**
   * Subscriber work only. `humanActorId` is the nearest human in the chain: the triggering
   * event's `actor_id`, or its `causation_actor_id` if that event was itself written by a
   * subscriber. It goes into the private slot; module code never sees it.
   */
  readonly causation?: { readonly eventId: string; readonly humanActorId: string | null };
  readonly requestId?: string;
  readonly runId?: string;
}

/** Builds a genuine, frozen context. Platform-internal. */
export function createExecutionContext(input: CreateContextInput): ExecutionContext {
  const companyId = toCompanyId(input.companyId);
  const actor = validateActor(input.actor);
  if (input.causation !== undefined && actor.kind !== "system") {
    // Only system work can be caused by an event (T-1 and T-2 CHECK constraints).
    throw new ForgedContextError("Only a system actor can carry causation");
  }
  if (input.causation !== undefined && !isUuid(input.causation.eventId)) {
    throw new ForgedContextError("Causation needs an event ID");
  }
  const context: ExecutionContext = Object.freeze({
    companyId,
    actor: Object.freeze({ ...actor }) as Actor,
    causation:
      input.causation === undefined
        ? null
        : Object.freeze({ eventId: input.causation.eventId.toLowerCase() }),
    ...(input.requestId === undefined ? {} : { requestId: input.requestId }),
    ...(input.runId === undefined ? {} : { runId: input.runId }),
  });
  genuine.add(context);
  if (input.causation !== undefined) {
    causationActors.set(context, input.causation.humanActorId);
  }
  return context;
}

function validateActor(actor: Actor): Actor {
  switch (actor.kind) {
    case "user":
      if (!isUuid(actor.userId) || !["ceo", "pm", "worker"].includes(actor.role)) {
        throw new ForgedContextError("Invalid user actor");
      }
      return actor;
    case "portal_user":
      if (!isUuid(actor.portalAccountId) || !isUuid(actor.clientId) || actor.role !== "client") {
        throw new ForgedContextError("Invalid portal actor");
      }
      return actor;
    case "system":
      if (typeof actor.component !== "string" || actor.component.trim() === "") {
        throw new ForgedContextError("A system actor needs a component name");
      }
      return actor;
    default:
      throw new ForgedContextError("Unknown actor kind");
  }
}

/**
 * Checks, before any SQL runs, that `value` is a genuine, live execution context.
 * - not an object, or its company ID missing or not a UUID: MissingTenantContextError;
 * - not built by a platform factory (literal, copy, clone): ForgedContextError;
 * - belongs to a request or unit that has ended: ContextExpiredError.
 */
export function assertLiveContext(value: unknown): asserts value is ExecutionContext {
  if (typeof value !== "object" || value === null) throw new MissingTenantContextError();
  toCompanyId((value as { companyId?: unknown }).companyId);
  if (!genuine.has(value)) throw new ForgedContextError();
  if (expired.has(value)) throw new ContextExpiredError();
}

/** Marks a context dead: `runInTransaction` then refuses it (§4.1). */
export function expireContext(context: ExecutionContext): void {
  expired.add(context);
}

/** Platform-private: read only by AuditWriter and OutboxWriter, to fill `causation_actor_id`. */
export function readCausationActor(context: ExecutionContext): string | null {
  return causationActors.get(context) ?? null;
}

/** True for `user` and `portal_user`. Never authority on its own (§4.1). */
export function isHumanActor(actor: Actor): actor is Exclude<Actor, { kind: "system" }> {
  return actor.kind === "user" || actor.kind === "portal_user";
}

/** The mapping of actor to audit/outbox columns (§4.1). */
export function actorColumns(actor: Actor): { actorId: string | null; actorRole: string } {
  switch (actor.kind) {
    case "user":
      return { actorId: actor.userId, actorRole: actor.role };
    case "portal_user":
      return { actorId: actor.portalAccountId, actorRole: "client" };
    case "system":
      return { actorId: null, actorRole: "system" };
  }
}
