-- Phase 0 platform grants (specification section 3.5). Custom migration.
--
-- Fails with a clear message when the owner action has not been done: the three roles must
-- exist, ledger_app and ledger_worker must be members of ledger_runtime, and they must not
-- be members of each other. Then it removes PUBLIC's access and grants each runtime role
-- exactly what it needs, column by column.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ledger_runtime') THEN
    RAISE EXCEPTION 'Role ledger_runtime does not exist: run the owner action in the Phase 0 specification, section 3.5, first';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ledger_app') THEN
    RAISE EXCEPTION 'Role ledger_app does not exist: run the owner action in the Phase 0 specification, section 3.5, first';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ledger_worker') THEN
    RAISE EXCEPTION 'Role ledger_worker does not exist: run the owner action in the Phase 0 specification, section 3.5, first';
  END IF;
  IF NOT pg_has_role('ledger_app', 'ledger_runtime', 'MEMBER') THEN
    RAISE EXCEPTION 'Role ledger_app must be a member of ledger_runtime (Phase 0 specification, section 3.5)';
  END IF;
  IF NOT pg_has_role('ledger_worker', 'ledger_runtime', 'MEMBER') THEN
    RAISE EXCEPTION 'Role ledger_worker must be a member of ledger_runtime (Phase 0 specification, section 3.5)';
  END IF;
  IF pg_has_role('ledger_app', 'ledger_worker', 'MEMBER') OR pg_has_role('ledger_worker', 'ledger_app', 'MEMBER') THEN
    RAISE EXCEPTION 'Roles ledger_app and ledger_worker must not be members of each other (Phase 0 specification, section 3.5)';
  END IF;
END $$;
--> statement-breakpoint
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON SCHEMA audit, intelligence FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON ALL TABLES IN SCHEMA audit, intelligence FROM PUBLIC;
--> statement-breakpoint
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA audit, intelligence FROM PUBLIC;
--> statement-breakpoint
-- Functions the owner creates later, in any schema, are not executable by PUBLIC (R3-17).
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
--> statement-breakpoint
GRANT USAGE ON SCHEMA audit, intelligence TO ledger_runtime;
--> statement-breakpoint
-- T-1: append-only. Only content columns may be supplied: audit_id, sequence_no and
-- occurred_at come from the database.
GRANT SELECT ON audit.audit_entries TO ledger_runtime;
--> statement-breakpoint
GRANT INSERT (company_id, entry_type, actor_id, actor_role, source_object_type, source_object_id,
              destination_object_type, destination_object_id, job_id, site_id, client_id,
              previous_value, new_value, external_reference, metadata,
              causation_event_id, causation_actor_id)
  ON audit.audit_entries TO ledger_runtime;
--> statement-breakpoint
-- T-2: either process inserts the envelope columns only; only the worker changes delivery state.
GRANT SELECT ON intelligence.event_outbox TO ledger_runtime;
--> statement-breakpoint
GRANT INSERT (event_id, event_type, event_version, source_module, company_id, actor_id,
              source_object_type, source_object_id, job_id, payload,
              causation_event_id, causation_actor_id)
  ON intelligence.event_outbox TO ledger_runtime;
--> statement-breakpoint
GRANT UPDATE (status, retry_count, next_attempt_at, locked_at, locked_by,
              delivered_subscribers, last_error, delivered_at, dead_lettered_at)
  ON intelligence.event_outbox TO ledger_worker;
--> statement-breakpoint
-- T-3: read by both; written only by the worker, copying the outbox row
-- (event_log_id and logged_at come from the database).
GRANT SELECT ON intelligence.event_log TO ledger_runtime;
--> statement-breakpoint
GRANT INSERT (event_id, event_type, event_version, source_module, company_id, actor_id,
              source_object_type, source_object_id, job_id, payload,
              causation_event_id, causation_actor_id, occurred_at)
  ON intelligence.event_log TO ledger_worker;
