import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestPools, runMigrations, type TestPools } from "../testing";

// The generated and custom migrations, applied to the test database by the global
// setup, reviewed against spec §3.2 to §3.6.

let pools: TestPools;
beforeAll(() => {
  pools = createTestPools();
});
afterAll(async () => {
  await pools.end();
});

async function rows<T = Record<string, unknown>>(sql: string, values: unknown[] = []): Promise<T[]> {
  return pools.owner.withClient(async (client) => (await client.query(sql, values)).rows as T[]);
}

describe("migrations on the test database", () => {
  it("records the three platform migrations and applying again is a no-op", async () => {
    const before = await rows("SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations");
    expect(before[0]).toEqual({ n: 3 });
    await pools.owner.withClient((client) => runMigrations(client));
    const after = await rows("SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations");
    expect(after[0]).toEqual({ n: 3 });
  });

  it("creates exactly the audit and intelligence schemas (plus drizzle's journal) and nothing in public", async () => {
    const schemas = await rows<{ nspname: string }>(
      `SELECT nspname FROM pg_namespace
        WHERE nspname NOT LIKE 'pg\_%' AND nspname <> 'information_schema'
        ORDER BY nspname`,
    );
    // Other db test files create their own throwaway schemas (test files run in no fixed
    // order); each is named here, so any OTHER schema the platform owns is still a failure.
    const knownTestSchemas = ["uow_probe"];
    expect(schemas.map((s) => s.nspname).filter((name) => !knownTestSchemas.includes(name))).toEqual([
      "audit",
      "drizzle",
      "intelligence",
      "public",
    ]);
    const inPublic = await rows(
      `SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind IN ('r','v','m','S','f','p')`,
    );
    expect(inPublic).toEqual([]);
  });

  it("creates exactly the three Phase 0 tables", async () => {
    const tables = await rows<{ t: string }>(
      `SELECT table_schema || '.' || table_name AS t FROM information_schema.tables
        WHERE table_schema IN ('audit','intelligence') ORDER BY 1`,
    );
    expect(tables.map((t) => t.t)).toEqual([
      "audit.audit_entries",
      "intelligence.event_log",
      "intelligence.event_outbox",
    ]);
  });
});

describe("T-1 audit.audit_entries (spec 3.2)", () => {
  it("has the specified columns, types, nullability and defaults", async () => {
    const columns = await rows<{
      column_name: string;
      data_type: string;
      is_nullable: string;
      column_default: string | null;
      identity_generation: string | null;
    }>(
      `SELECT column_name, data_type, is_nullable, column_default, identity_generation
         FROM information_schema.columns
        WHERE table_schema = 'audit' AND table_name = 'audit_entries' ORDER BY ordinal_position`,
    );
    const summary = columns.map(
      (c) => `${c.column_name} ${c.data_type} ${c.is_nullable === "NO" ? "not null" : "null"}`,
    );
    expect(summary).toEqual([
      "audit_id uuid not null",
      "sequence_no bigint not null",
      "company_id uuid not null",
      "entry_type text not null",
      "actor_id uuid null",
      "actor_role text not null",
      "occurred_at timestamp with time zone not null",
      "source_object_type text not null",
      "source_object_id uuid not null",
      "destination_object_type text null",
      "destination_object_id uuid null",
      "job_id uuid null",
      "site_id uuid null",
      "client_id uuid null",
      "previous_value jsonb null",
      "new_value jsonb null",
      "external_reference text null",
      "metadata jsonb not null",
      "causation_event_id uuid null",
      "causation_actor_id uuid null",
    ]);
    const byName = Object.fromEntries(columns.map((c) => [c.column_name, c]));
    expect(byName.audit_id!.column_default).toBe("gen_random_uuid()");
    expect(byName.occurred_at!.column_default).toBe("now()");
    expect(byName.metadata!.column_default).toContain("'{}'");
    expect(byName.sequence_no!.identity_generation).toBe("ALWAYS");
    expect(byName.company_id!.column_default).toBeNull();
  });

  it("has only the primary key as an index, no unique constraint on sequence_no, and no foreign key (3.1.7)", async () => {
    const indexes = await rows<{ indexname: string }>(
      "SELECT indexname FROM pg_indexes WHERE schemaname = 'audit' AND tablename = 'audit_entries'",
    );
    expect(indexes.map((i) => i.indexname)).toEqual(["audit_entries_pkey"]);
    const constraints = await rows<{ contype: string }>(
      `SELECT contype FROM pg_constraint WHERE conrelid = 'audit.audit_entries'::regclass AND contype IN ('f','u')`,
    );
    expect(constraints).toEqual([]);
  });

  it("has the seven CHECK constraints of the spec", async () => {
    const checks = await rows<{ conname: string }>(
      `SELECT conname FROM pg_constraint WHERE conrelid = 'audit.audit_entries'::regclass AND contype = 'c' ORDER BY conname`,
    );
    expect(checks).toHaveLength(7);
  });
});

describe("T-2 intelligence.event_outbox (spec 3.3)", () => {
  it("has the specified columns, types, nullability and defaults", async () => {
    const columns = await rows<{
      column_name: string;
      data_type: string;
      is_nullable: string;
      column_default: string | null;
    }>(
      `SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
        WHERE table_schema = 'intelligence' AND table_name = 'event_outbox' ORDER BY ordinal_position`,
    );
    expect(columns.map((c) => `${c.column_name} ${c.data_type} ${c.is_nullable === "NO" ? "not null" : "null"}`)).toEqual([
      "outbox_id uuid not null",
      "event_id uuid not null",
      "event_type text not null",
      "event_version text not null",
      "source_module text not null",
      "company_id uuid not null",
      "actor_id uuid null",
      "source_object_type text not null",
      "source_object_id uuid not null",
      "payload jsonb not null",
      "job_id uuid null",
      "causation_event_id uuid null",
      "causation_actor_id uuid null",
      "occurred_at timestamp with time zone not null",
      "created_at timestamp with time zone not null",
      "status text not null",
      "retry_count integer not null",
      "next_attempt_at timestamp with time zone not null",
      "locked_at timestamp with time zone null",
      "locked_by text null",
      "delivered_subscribers ARRAY not null",
      "last_error text null",
      "delivered_at timestamp with time zone null",
      "dead_lettered_at timestamp with time zone null",
    ]);
    const byName = Object.fromEntries(columns.map((c) => [c.column_name, c]));
    expect(byName.event_version!.column_default).toBe("'1.0'::text");
    expect(byName.status!.column_default).toBe("'pending'::text");
    expect(byName.retry_count!.column_default).toBe("0");
    expect(byName.next_attempt_at!.column_default).toBe("now()");
    expect(byName.delivered_subscribers!.column_default).toBe("'{}'::text[]");
  });

  it("has exactly the four specified indexes, the partial ones with the specified predicates", async () => {
    const indexes = await rows<{ indexname: string; indexdef: string }>(
      `SELECT indexname, indexdef FROM pg_indexes
        WHERE schemaname = 'intelligence' AND tablename = 'event_outbox' ORDER BY indexname`,
    );
    expect(indexes.map((i) => i.indexname)).toEqual([
      "event_outbox_event_id_key",
      "event_outbox_pkey",
      "event_outbox_processing_idx",
      "event_outbox_ready_idx",
    ]);
    const byName = Object.fromEntries(indexes.map((i) => [i.indexname, i.indexdef]));
    expect(byName.event_outbox_ready_idx).toContain("(next_attempt_at, created_at)");
    expect(byName.event_outbox_ready_idx).toMatch(/WHERE .*status.*pending.*failed/s);
    expect(byName.event_outbox_processing_idx).toContain("(locked_at)");
    expect(byName.event_outbox_processing_idx).toMatch(/WHERE .*status.*processing/s);
    expect(byName.event_outbox_event_id_key).toContain("UNIQUE");
  });

  it("has the ten CHECK constraints of the spec and no foreign key", async () => {
    const checks = await rows(
      `SELECT conname FROM pg_constraint WHERE conrelid = 'intelligence.event_outbox'::regclass AND contype = 'c'`,
    );
    expect(checks).toHaveLength(10);
    const fks = await rows(
      `SELECT 1 FROM pg_constraint WHERE conrelid = 'intelligence.event_outbox'::regclass AND contype = 'f'`,
    );
    expect(fks).toEqual([]);
  });
});

describe("T-3 intelligence.event_log (spec 3.4)", () => {
  it("has event_id as the primary key and no other index", async () => {
    const indexes = await rows<{ indexname: string; indexdef: string }>(
      "SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'intelligence' AND tablename = 'event_log'",
    );
    expect(indexes.map((i) => i.indexname)).toEqual(["event_log_pkey"]);
    expect(indexes[0]!.indexdef).toContain("(event_id)");
  });

  it("has the specified columns, nullability and defaults", async () => {
    const columns = await rows<{
      column_name: string;
      is_nullable: string;
      column_default: string | null;
    }>(
      `SELECT column_name, is_nullable, column_default FROM information_schema.columns
        WHERE table_schema = 'intelligence' AND table_name = 'event_log' ORDER BY ordinal_position`,
    );
    expect(columns.map((c) => `${c.column_name} ${c.is_nullable === "NO" ? "not null" : "null"}`)).toEqual([
      "event_log_id not null",
      "event_id not null",
      "event_type not null",
      "event_version not null",
      "source_module not null",
      "company_id not null",
      "actor_id null",
      "source_object_type not null",
      "source_object_id not null",
      "payload not null",
      "job_id null",
      "causation_event_id null",
      "causation_actor_id null",
      "occurred_at not null",
      "logged_at not null",
    ]);
    const byName = Object.fromEntries(columns.map((c) => [c.column_name, c]));
    expect(byName.event_log_id!.column_default).toBe("gen_random_uuid()");
    expect(byName.logged_at!.column_default).toBe("now()");
    expect(byName.occurred_at!.column_default).toBeNull();
  });

  it("has the two causation CHECK constraints", async () => {
    const checks = await rows(
      `SELECT conname FROM pg_constraint WHERE conrelid = 'intelligence.event_log'::regclass AND contype = 'c'`,
    );
    expect(checks).toHaveLength(2);
  });
});

describe("immutability triggers (3.5)", () => {
  it("creates the four enabled triggers on T-1 and T-3 and nothing on T-2", async () => {
    const triggers = await rows<{ tgname: string; tgrelid: string; tgenabled: string }>(
      `SELECT tgname, tgrelid::regclass::text AS tgrelid, tgenabled FROM pg_trigger
        WHERE NOT tgisinternal ORDER BY tgname`,
    );
    expect(triggers).toEqual([
      { tgname: "audit_entries_no_truncate", tgrelid: "audit.audit_entries", tgenabled: "O" },
      { tgname: "audit_entries_no_update_delete", tgrelid: "audit.audit_entries", tgenabled: "O" },
      { tgname: "event_log_no_truncate", tgrelid: "intelligence.event_log", tgenabled: "O" },
      { tgname: "event_log_no_update_delete", tgrelid: "intelligence.event_log", tgenabled: "O" },
    ]);
  });
});
