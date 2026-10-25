import { z } from "zod";
import { actorColumns, readCausationActor } from "../context/execution-context";
import {
  jsonObject,
  jsonValue,
  toJsonParameter,
  uuidString,
  type JsonValue,
} from "../db/json-input";
import { poisonUnit, type UnitState } from "../db/unit-state";
import {
  AuditEntryTypeError,
  AuditWriteFailedError,
  UnitOfWorkClosedError,
} from "../errors/platform-errors";

// PS-13, Phase 0 spec §4.4 and §8.2. `AuditWriter` exposes only `append()`: it never
// updates, deletes or reads audit rows. The company, actor, causation and metadata IDs come
// from the unit's context and the time from the database, so an entry can never be written
// for another tenant, another actor or a made-up cause. The Drizzle table object for T-1 is
// not exported from the platform's public surface.

export interface AuditEntryInput {
  readonly entryType: string;
  readonly sourceObjectType: string;
  readonly sourceObjectId: string;
  readonly destinationObjectType?: string;
  readonly destinationObjectId?: string;
  readonly jobId?: string;
  readonly siteId?: string;
  readonly clientId?: string;
  readonly previousValue?: JsonValue;
  readonly newValue?: JsonValue;
  readonly externalReference?: string;
  readonly metadata?: { readonly [key: string]: JsonValue };
}

export interface AuditWriter {
  /** Appends one entry in the unit's transaction. Returns the new `audit_id`. */
  append(entry: AuditEntryInput): Promise<string>;
}

// Strict: unknown keys (companyId, actorId, actorRole, occurredAt, causation...) are refused.
const auditEntrySchema = z
  .object({
    entryType: z.string().regex(/^[a-z][a-z0-9_]{2,99}$/, "must be snake_case, 3 to 100 characters"),
    sourceObjectType: z.string().min(1).max(100),
    sourceObjectId: uuidString,
    destinationObjectType: z.string().min(1).max(100).optional(),
    destinationObjectId: uuidString.optional(),
    jobId: uuidString.optional(),
    siteId: uuidString.optional(),
    clientId: uuidString.optional(),
    previousValue: jsonValue.optional(),
    newValue: jsonValue.optional(),
    externalReference: z.string().min(1).max(1000).optional(),
    metadata: jsonObject.optional(),
  })
  .strict()
  .refine(
    (entry) => (entry.destinationObjectType === undefined) === (entry.destinationObjectId === undefined),
    { message: "destination type and ID must be given together", path: ["destinationObjectType"] },
  );

const INSERT_SQL = `
INSERT INTO audit.audit_entries
  (company_id, entry_type, actor_id, actor_role, source_object_type, source_object_id,
   destination_object_type, destination_object_id, job_id, site_id, client_id,
   previous_value, new_value, external_reference, metadata,
   causation_event_id, causation_actor_id)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13::jsonb, $14, $15::jsonb, $16, $17)
RETURNING audit_id`;

/** Creates the writer for one view of a unit, bound to the acting module. */
export function createAuditWriter(state: UnitState, module: string): AuditWriter {
  return {
    async append(rawEntry: AuditEntryInput): Promise<string> {
      if (state.closed) throw new UnitOfWorkClosedError();
      if (state.poison !== undefined) {
        throw new AuditWriteFailedError("The unit of work is poisoned by an earlier failure", {
          cause: state.poison.cause,
        });
      }

      try {
        // Validation (strict schema).
        const parsed = auditEntrySchema.safeParse(rawEntry);
        if (!parsed.success) {
          const error = new AuditWriteFailedError("The audit entry input is invalid", {
            cause: parsed.error,
          });
          poisonUnit(state, "audit", parsed.error);
          throw error;
        }
        const entry = parsed.data;

        // Catalogue: registered, owned by this unit's module, and a jobId where required.
        const registered = state.auditCatalogue.get(entry.entryType);
        let catalogueError: AuditEntryTypeError | undefined;
        if (registered === undefined) {
          catalogueError = new AuditEntryTypeError(
            `The audit entry type "${entry.entryType}" is not registered in any module's catalogue`,
          );
        } else if (registered.owner !== module) {
          catalogueError = new AuditEntryTypeError(
            `The audit entry type "${entry.entryType}" is owned by module "${registered.owner}", not "${module}"`,
          );
        } else if (registered.jobRequired && entry.jobId === undefined) {
          catalogueError = new AuditEntryTypeError(
            `The audit entry type "${entry.entryType}" requires a jobId`,
          );
        }
        if (catalogueError !== undefined) {
          poisonUnit(state, "audit", catalogueError);
          throw catalogueError;
        }

        // Everything from the context; nothing from the caller.
        const { context } = state;
        const { actorId, actorRole } = actorColumns(context.actor);
        const metadata: { [key: string]: JsonValue } = { ...(entry.metadata ?? {}) };
        delete metadata.requestId;
        delete metadata.runId;
        if (context.requestId !== undefined) metadata.requestId = context.requestId;
        if (context.runId !== undefined) metadata.runId = context.runId;

        const result = await state.client.query<{ audit_id: string }>(INSERT_SQL, [
          context.companyId,
          entry.entryType,
          actorId,
          actorRole,
          entry.sourceObjectType,
          entry.sourceObjectId,
          entry.destinationObjectType ?? null,
          entry.destinationObjectId ?? null,
          entry.jobId ?? null,
          entry.siteId ?? null,
          entry.clientId ?? null,
          toJsonParameter(entry.previousValue),
          toJsonParameter(entry.newValue),
          entry.externalReference ?? null,
          JSON.stringify(metadata),
          context.causation?.eventId ?? null,
          readCausationActor(context),
        ]);
        const row = result.rows[0];
        if (row === undefined) throw new AuditWriteFailedError("The audit insert returned no row");
        return row.audit_id;
      } catch (error) {
        // A database failure (anything not already recorded above) poisons the unit too.
        poisonUnit(state, "audit", error);
        throw error;
      }
    },
  };
}
