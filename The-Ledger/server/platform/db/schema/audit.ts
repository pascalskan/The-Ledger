import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// Phase 0 spec §3.2: T-1 audit.audit_entries.
//
// Append-only and permanent. Every column is immutable: the runtime roles can only
// INSERT (a listed set of columns) and SELECT, and owner DML is refused by triggers
// (migration 0002). Indexes: the primary key only (R3-02); the readers of the audit
// trail add the indexes they need in their own phase.
//
// Check expressions use plain column names on purpose: drizzle-kit would otherwise
// qualify them with the table name.

/** The `audit` schema. Declared once, here. */
export const auditSchema = pgSchema("audit");

export const auditEntries = auditSchema.table(
  "audit_entries",
  {
    auditId: uuid("audit_id").primaryKey().defaultRandom(),
    // Insertion order: the stable sort and cursor key (entries in one transaction share occurred_at).
    // No index and no UNIQUE constraint: uniqueness comes from the identity sequence, and no
    // runtime role may supply the column (§3.5).
    sequenceNo: bigint("sequence_no", { mode: "number" }).notNull().generatedAlwaysAsIdentity(),
    companyId: uuid("company_id").notNull(),
    entryType: text("entry_type").notNull(),
    actorId: uuid("actor_id"),
    actorRole: text("actor_role").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    sourceObjectType: text("source_object_type").notNull(),
    sourceObjectId: uuid("source_object_id").notNull(),
    destinationObjectType: text("destination_object_type"),
    destinationObjectId: uuid("destination_object_id"),
    jobId: uuid("job_id"),
    siteId: uuid("site_id"),
    clientId: uuid("client_id"),
    previousValue: jsonb("previous_value"),
    newValue: jsonb("new_value"),
    externalReference: text("external_reference"),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    causationEventId: uuid("causation_event_id"),
    causationActorId: uuid("causation_actor_id"),
  },
  () => [
    check("audit_entries_entry_type_format", sql`entry_type ~ '^[a-z][a-z0-9_]{2,99}$'`),
    check(
      "audit_entries_actor_role_values",
      sql`actor_role IN ('ceo','pm','worker','client','system')`,
    ),
    check(
      "audit_entries_system_actor_has_no_id",
      sql`(actor_role = 'system') = (actor_id IS NULL)`,
    ),
    check(
      "audit_entries_source_object_type_length",
      sql`length(source_object_type) BETWEEN 1 AND 100`,
    ),
    check(
      "audit_entries_destination_pair",
      sql`(destination_object_type IS NULL) = (destination_object_id IS NULL)`,
    ),
    check(
      "audit_entries_causation_event_is_system",
      sql`causation_event_id IS NULL OR actor_role = 'system'`,
    ),
    check(
      "audit_entries_causation_actor_needs_event",
      sql`causation_actor_id IS NULL OR causation_event_id IS NOT NULL`,
    ),
  ],
);
