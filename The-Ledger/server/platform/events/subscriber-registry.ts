import type { TypeCatalogue } from "../audit/catalogue";
import type { CompanyId } from "../context/execution-context";
import type { UnitOfWork } from "../db/unit-of-work";
import { RegistryError } from "../registry/registry-error";

// PS-15, Phase 0 spec §4.5: the subscriber registry.

/** What a subscriber receives (spec §4.5). The envelope has no causation fields. */
export interface EventEnvelope {
  eventId: string;
  eventType: string;
  eventVersion: string;
  /** ISO 8601 UTC. */
  occurredAt: string;
  companyId: CompanyId;
  actorId: string | null;
  sourceObjectId: string;
  sourceObjectType: string;
  jobId: string | null;
  payload: Record<string, unknown>;
}

export interface Subscriber {
  /** Unique, `<module>.<purpose>`, for example `identity.createInitialCeo`. */
  name: string;
  eventTypes: readonly string[];
  /** Must be idempotent: delivery is at least once (spec §4.5). */
  handle(event: EventEnvelope, uow: UnitOfWork): Promise<void>;
}

export interface RegisteredSubscriber {
  /** The registering module: each subscriber's unit is bound to it. */
  readonly module: string;
  readonly subscriber: Subscriber;
}

export interface SubscriberRegistry {
  /** Subscribers of an event type, in registration order. */
  subscribersFor(eventType: string): readonly RegisteredSubscriber[];
  readonly size: number;
}

const SUBSCRIBER_NAME = /^[a-z][a-z_]*\.[a-zA-Z][a-zA-Z0-9]*$/;
const EVENT_TYPE = /^[A-Z][A-Za-z0-9]{2,99}$/;

/**
 * Builds the registry, checking at start-up (never at run time): unique subscriber names
 * matching the pattern; at least one event type each, in PascalCase, none listed twice; and
 * every subscribed event type registered in the event catalogue. Immutable afterwards.
 */
export function createSubscriberRegistry(
  registered: readonly RegisteredSubscriber[],
  eventCatalogue: TypeCatalogue,
): SubscriberRegistry {
  const names = new Set<string>();
  const byType = new Map<string, RegisteredSubscriber[]>();

  for (const entry of registered) {
    const { name, eventTypes } = entry.subscriber;
    if (typeof name !== "string" || !SUBSCRIBER_NAME.test(name)) {
      throw new RegistryError(
        `Subscriber name "${String(name)}" (module "${entry.module}") must look like <module>.<purpose>`,
      );
    }
    if (names.has(name)) {
      throw new RegistryError(`Subscriber name "${name}" is registered more than once`);
    }
    names.add(name);

    if (!Array.isArray(eventTypes) || eventTypes.length === 0) {
      throw new RegistryError(`Subscriber "${name}" lists no event types`);
    }
    const seen = new Set<string>();
    for (const eventType of eventTypes) {
      if (typeof eventType !== "string" || !EVENT_TYPE.test(eventType)) {
        throw new RegistryError(`Subscriber "${name}" lists an event type that is not PascalCase`);
      }
      if (seen.has(eventType)) {
        throw new RegistryError(`Subscriber "${name}" lists the event type "${eventType}" twice`);
      }
      seen.add(eventType);
      if (!eventCatalogue.has(eventType)) {
        throw new RegistryError(
          `Subscriber "${name}" subscribes to the event type "${eventType}", which no module registers`,
        );
      }
      const list = byType.get(eventType) ?? [];
      list.push(Object.freeze({ module: entry.module, subscriber: entry.subscriber }));
      byType.set(eventType, list);
    }
  }

  const frozen = new Map([...byType].map(([type, list]) => [type, Object.freeze(list)] as const));
  return Object.freeze({
    subscribersFor: (eventType: string) => frozen.get(eventType) ?? [],
    size: registered.length,
  });
}
