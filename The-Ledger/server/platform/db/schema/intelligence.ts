import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// Phase 0 spec §3.3 and §3.4: T-2 intelligence.event_outbox and T-3 intelligence.event_log.
//
// The Intelligence & Automation module owns the rest of this schema from Phase 7 and
// adds its tables through the `intelligenceSchema` handle, so the schema is declared once.
// The outbox and event log tables stay platform-owned.
//
// Check and index expressions use plain column names on purpose: drizzle-kit would
// otherwise qualify them with the table name.

/** The `intelligence` schema. Declared once, here. */
export const intelligenceSchema = pgSchema("intelligence");

/** T-2. One row per domain event, written in the state change's transaction. */
export const eventOutbox = intelligenceSchema.table(
  "event_outbox",
  {
    outboxId: uuid("outbox_id").primaryKey().defaultRandom(),
    eventId: uuid("event_id").notNull(),
    eventType: text("event_type").notNull(),
    eventVersion: text("event_version").notNull().default("1.0"),
    sourceModule: text("source_module").notNull(),
    companyId: uuid("company_id").notNull(),
    actorId: uuid("actor_id"),
    sourceObjectType: text("source_object_type").notNull(),
    sourceObjectId: uuid("source_object_id").notNull(),
    payload: jsonb("payload").notNull(),
    jobId: uuid("job_id"),
    causationEventId: uuid("causation_event_id"),
    causationActorId: uuid("causation_actor_id"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    // Delivery state: changed only by the outbox worker.
    status: text("status").notNull().default("pending"),
    retryCount: integer("retry_count").notNull().default(0),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: text("locked_by"),
    deliveredSubscribers: text("delivered_subscribers")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    lastError: text("last_error"),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    deadLetteredAt: timestamp("dead_lettered_at", { withTimezone: true }),
  },
  (table) => [
    // The envelope eventId is every subscriber's default idempotency key (§7.3).
    unique("event_outbox_event_id_key").on(table.eventId),
    // Serves the claim (PS-17): a range scan in ORDER BY next_attempt_at, created_at order.
    index("event_outbox_ready_idx")
      .on(table.nextAttemptAt, table.createdAt)
      .where(sql`status IN ('pending','failed')`),
    // Serves stale-lock recovery (PS-20).
    index("event_outbox_processing_idx").on(table.lockedAt).where(sql`status = 'processing'`),
    check("event_outbox_event_type_format", sql`event_type ~ '^[A-Z][A-Za-z0-9]{2,99}$'`),
    check("event_outbox_source_module_format", sql`source_module ~ '^[a-z][a-z_]{1,49}$'`),
    check("event_outbox_payload_is_object", sql`jsonb_typeof(payload) = 'object'`),
    check(
      "event_outbox_status_values",
      sql`status IN ('pending','processing','failed','delivered','dead_lettered')`,
    ),
    check("event_outbox_retry_count_not_negative", sql`retry_count >= 0`),
    check(
      "event_outbox_lock_matches_status",
      sql`(status = 'processing') = (locked_at IS NOT NULL AND locked_by IS NOT NULL)`,
    ),
    check(
      "event_outbox_delivered_has_time",
      sql`status <> 'delivered' OR delivered_at IS NOT NULL`,
    ),
    check(
      "event_outbox_dead_lettered_has_time",
      sql`status <> 'dead_lettered' OR dead_lettered_at IS NOT NULL`,
    ),
    check(
      "event_outbox_causation_event_is_system",
      sql`causation_event_id IS NULL OR actor_id IS NULL`,
    ),
    check(
      "event_outbox_causation_actor_needs_event",
      sql`causation_actor_id IS NULL OR causation_event_id IS NOT NULL`,
    ),
  ],
);

/**
 * T-3. Permanent, append-only history of delivered events. Every column is immutable.
 * `event_id` is the primary key: at most one log row per event, and the conflict target
 * of PS-18's `ON CONFLICT (event_id) DO NOTHING`. `event_log_id` is kept but not indexed.
 */
export const eventLog = intelligenceSchema.table(
  "event_log",
  {
    eventLogId: uuid("event_log_id").notNull().defaultRandom(),
    eventId: uuid("event_id").notNull(),
    eventType: text("event_type").notNull(),
    eventVersion: text("event_version").notNull(),
    sourceModule: text("source_module").notNull(),
    companyId: uuid("company_id").notNull(),
    actorId: uuid("actor_id"),
    sourceObjectType: text("source_object_type").notNull(),
    sourceObjectId: uuid("source_object_id").notNull(),
    payload: jsonb("payload").notNull(),
    jobId: uuid("job_id"),
    causationEventId: uuid("causation_event_id"),
    causationActorId: uuid("causation_actor_id"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    loggedAt: timestamp("logged_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ name: "event_log_pkey", columns: [table.eventId] }),
    check(
      "event_log_causation_event_is_system",
      sql`causation_event_id IS NULL OR actor_id IS NULL`,
    ),
    check(
      "event_log_causation_actor_needs_event",
      sql`causation_actor_id IS NULL OR causation_event_id IS NOT NULL`,
    ),
  ],
);
