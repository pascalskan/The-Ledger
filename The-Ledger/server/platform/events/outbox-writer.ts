import { randomUUID } from "node:crypto";
import { z } from "zod";
import { actorColumns, readCausationActor } from "../context/execution-context";
import { jsonObject, uuidString, type JsonValue } from "../db/json-input";
import { poisonUnit, type UnitState } from "../db/unit-state";
import {
  EventTypeError,
  OutboxWriteFailedError,
  UnitOfWorkClosedError,
} from "../errors/platform-errors";

// PS-14, Phase 0 spec §4.4 and §4.5. `OutboxWriter` adds the event ID, version, company,
// actor and causation from the context, `source_module` from the unit's module and the
// time from the database. Delivery never happens in the writing process: the worker sees
// the row only once the caller's transaction commits.

export interface DomainEventInput {
  readonly eventType: string;
  readonly sourceObjectType: string;
  readonly sourceObjectId: string;
  /** A plain JSON object of at most 64 KB. Identifiers and operational metadata, not documents. */
  readonly payload: { readonly [key: string]: JsonValue };
  readonly jobId?: string;
}

export interface OutboxWriter {
  /** Records one event in the unit's transaction. Returns the new `event_id`. */
  record(event: DomainEventInput): Promise<string>;
}

// Strict: unknown keys (sourceModule, eventId, companyId, actorId, causation...) are refused.
const domainEventSchema = z
  .object({
    eventType: z.string().regex(/^[A-Z][A-Za-z0-9]{2,99}$/, "must be PascalCase, 3 to 100 characters"),
    sourceObjectType: z.string().min(1).max(100),
    sourceObjectId: uuidString,
    payload: jsonObject,
    jobId: uuidString.optional(),
  })
  .strict();

const INSERT_SQL = `
INSERT INTO intelligence.event_outbox
  (event_id, event_type, event_version, source_module, company_id, actor_id,
   source_object_type, source_object_id, job_id, payload,
   causation_event_id, causation_actor_id)
VALUES ($1, $2, '1.0', $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11)`;

/** Creates the writer for one view of a unit, bound to the acting module. */
export function createOutboxWriter(state: UnitState, module: string): OutboxWriter {
  return {
    async record(rawEvent: DomainEventInput): Promise<string> {
      if (state.closed) throw new UnitOfWorkClosedError();
      if (state.poison !== undefined) {
        throw new OutboxWriteFailedError("The unit of work is poisoned by an earlier failure", {
          cause: state.poison.cause,
        });
      }

      try {
        const parsed = domainEventSchema.safeParse(rawEvent);
        if (!parsed.success) {
          const error = new OutboxWriteFailedError("The domain event input is invalid", {
            cause: parsed.error,
          });
          poisonUnit(state, "outbox", parsed.error);
          throw error;
        }
        const event = parsed.data;

        const registered = state.eventCatalogue.get(event.eventType);
        let catalogueError: EventTypeError | undefined;
        if (registered === undefined) {
          catalogueError = new EventTypeError(
            `The event type "${event.eventType}" is not registered in any module's catalogue`,
          );
        } else if (registered.owner !== module) {
          catalogueError = new EventTypeError(
            `The event type "${event.eventType}" is owned by module "${registered.owner}", not "${module}"`,
          );
        } else if (registered.jobRequired && event.jobId === undefined) {
          catalogueError = new EventTypeError(`The event type "${event.eventType}" requires a jobId`);
        }
        if (catalogueError !== undefined) {
          poisonUnit(state, "outbox", catalogueError);
          throw catalogueError;
        }

        const { context } = state;
        const eventId = randomUUID();
        await state.client.query(INSERT_SQL, [
          eventId,
          event.eventType,
          module,
          context.companyId,
          actorColumns(context.actor).actorId,
          event.sourceObjectType,
          event.sourceObjectId,
          event.jobId ?? null,
          JSON.stringify(event.payload),
          context.causation?.eventId ?? null,
          readCausationActor(context),
        ]);
        return eventId;
      } catch (error) {
        poisonUnit(state, "outbox", error);
        throw error;
      }
    },
  };
}
