-- Phase 0 immutability triggers (specification section 3.5, R2-09). Custom migration.
--
-- Grants stop the runtime roles; these triggers also stop the owner's ordinary UPDATE,
-- DELETE and TRUNCATE on the two append-only tables. DROP TABLE and DROP SCHEMA ... CASCADE
-- fire no row or TRUNCATE triggers, so the test-database rebuild still works.
CREATE FUNCTION audit.refuse_change() RETURNS trigger LANGUAGE plpgsql
  SET search_path = pg_catalog AS $$
BEGIN
  RAISE EXCEPTION 'append-only table %.%: % refused', TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'insufficient_privilege';
END $$;
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION audit.refuse_change() FROM PUBLIC;
--> statement-breakpoint
CREATE TRIGGER audit_entries_no_update_delete BEFORE UPDATE OR DELETE ON audit.audit_entries
  FOR EACH ROW EXECUTE FUNCTION audit.refuse_change();
--> statement-breakpoint
CREATE TRIGGER audit_entries_no_truncate BEFORE TRUNCATE ON audit.audit_entries
  FOR EACH STATEMENT EXECUTE FUNCTION audit.refuse_change();
--> statement-breakpoint
CREATE TRIGGER event_log_no_update_delete BEFORE UPDATE OR DELETE ON intelligence.event_log
  FOR EACH ROW EXECUTE FUNCTION audit.refuse_change();
--> statement-breakpoint
CREATE TRIGGER event_log_no_truncate BEFORE TRUNCATE ON intelligence.event_log
  FOR EACH STATEMENT EXECUTE FUNCTION audit.refuse_change();
