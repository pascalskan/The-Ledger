import { assertLiveContext, type PlatformRole } from "../context/execution-context";
import {
  adoptUnit,
  unitStateOf,
  type UnitOfWork,
} from "../db/unit-of-work";
import { poisonUnit } from "../db/unit-state";
import { HumanActorRequiredError } from "../errors/platform-errors";
import type { ModuleDeps } from "./types";

// PS-16, Phase 0 spec §4.9: typed cross-module ports.
//
// A port lets a lower module call into a higher one without importing it. The lower module
// defines the interface and the token, the higher module implements and `bind`s it, and the
// process entry points wire the two (see build-registries.ts). The first argument of every
// port method is the caller's `uow`; the implementation works only through that unit.
// Phase 0 defines no ports.

const PORT_NAME = /^[a-z][a-z_]*\.[a-zA-Z][a-zA-Z0-9]*$/;

/** A phantom-typed carrier: the type `T` is the port's interface. */
export interface PortToken<T> {
  /** `<defining module>.<port>`, for example `review_centre.approvalEffects`. Unique. */
  readonly name: string;
  /** Only a live, genuine `user` context with no causation may call it (R2-B2). */
  readonly humanOnly: boolean;
  /** If set, also only these roles. Implies `humanOnly` (R3-15). */
  readonly roles?: readonly PlatformRole[];
  readonly __type?: T;
}

export interface PortBinding<T> {
  readonly token: PortToken<T>;
  readonly create: (deps: ModuleDeps) => T;
}

export interface Ports {
  /**
   * The implementation of a port the calling module lists in `requiresPorts`. It works only
   * while the module's routers or subscribers are being built; before and after, it throws.
   */
  get<T>(token: PortToken<T>): T;
}

/** Called in the DEFINING (lower) module's application layer. */
export function definePort<T>(
  name: string,
  options: { humanOnly?: boolean; roles?: readonly PlatformRole[] } = {},
): PortToken<T> {
  if (!PORT_NAME.test(name)) {
    throw new Error(`Port name "${name}" must look like <module>.<port>`);
  }
  const roles = options.roles === undefined ? undefined : Object.freeze([...options.roles]);
  if (roles !== undefined && roles.length === 0) {
    throw new Error(`Port "${name}" lists no roles`);
  }
  return Object.freeze({
    name,
    humanOnly: options.humanOnly === true || roles !== undefined,
    ...(roles === undefined ? {} : { roles }),
  });
}

/** Used by the IMPLEMENTING (higher) module, in `providesPorts`. */
export function bind<T>(token: PortToken<T>, create: (deps: ModuleDeps) => T): PortBinding<T> {
  return Object.freeze({ token, create });
}

/** Every function-valued property of `target`, own or inherited below Object.prototype. */
function methodNames(target: object): string[] {
  const names = new Set<string>();
  for (let object: object | null = target; object !== null && object !== Object.prototype; object = Object.getPrototypeOf(object)) {
    for (const name of Object.getOwnPropertyNames(object)) {
      if (name !== "constructor" && typeof (target as Record<string, unknown>)[name] === "function") {
        names.add(name);
      }
    }
  }
  return [...names];
}

/** The refusal a human-only port makes before the implementation runs. */
function assertHumanCaller(token: PortToken<unknown>, uow: UnitOfWork): void {
  const state = unitStateOf(uow);
  if (state === undefined) throw new HumanActorRequiredError(`Port "${token.name}" needs a platform unit of work`);
  if (state.closed) throw new HumanActorRequiredError(`Port "${token.name}" was called on a closed unit of work`);
  try {
    assertLiveContext(uow.context);
  } catch (cause) {
    throw new HumanActorRequiredError(`Port "${token.name}" needs a genuine, live context`, { cause });
  }
  const { actor, causation } = uow.context;
  if (actor.kind !== "user" || causation !== null) {
    throw new HumanActorRequiredError(`Port "${token.name}" accepts only a human user without causation`);
  }
  if (token.roles !== undefined && !token.roles.includes(actor.role)) {
    throw new HumanActorRequiredError(`Port "${token.name}" does not accept the actor's role`);
  }
}

/**
 * Wraps an implementation. Every method (all async) adopts the caller's unit for the
 * IMPLEMENTING module, so its audit entries and events are checked against that module's
 * catalogue while the actor stays the caller's (R3-10). For a human-only port the checks
 * run first: if any fails, the method throws HumanActorRequiredError BEFORE the
 * implementation runs, and the unit is poisoned so the caller cannot commit around it.
 */
export function wrapPortImplementation<T extends object>(
  token: PortToken<T>,
  implementation: T,
  implementingModule: string,
): T {
  const wrapped: Record<string, unknown> = {};
  for (const name of methodNames(implementation)) {
    wrapped[name] = async (uow: UnitOfWork, ...args: unknown[]) => {
      if (token.humanOnly) {
        try {
          assertHumanCaller(token, uow);
        } catch (error) {
          const state = unitStateOf(uow);
          if (state !== undefined && !state.closed) poisonUnit(state, "human", error);
          throw error;
        }
      }
      const adopted = adoptUnit(uow, implementingModule);
      const method = (implementation as Record<string, (...a: unknown[]) => unknown>)[name]!;
      return await method.call(implementation, adopted, ...args);
    };
  }
  return Object.freeze(wrapped) as T;
}
