-- Additive RLS closure for Results tables created after the original runtime
-- boundary migration. Existing school data and tenant_isolation_policy remain
-- untouched; this migration is transactional and idempotent.
BEGIN;
DO $$
DECLARE name text;
DECLARE predicate text := '(current_setting(''app.is_super_admin'', true) = ''true'' OR school_id::text = NULLIF(current_setting(''app.tenant_id'', true), ''''))';
DECLARE owner_name text;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='apex_app_runtime' AND rolbypassrls=false AND rolcanlogin=false)
  THEN RAISE EXCEPTION 'EXPECTED_RESTRICTED_RUNTIME_ROLE_MISSING'; END IF;
  FOREACH name IN ARRAY ARRAY['assessment_result_records','assessment_result_revisions']
  LOOP
    IF to_regclass(format('public.%I',name)) IS NULL THEN
      RAISE EXCEPTION 'EXPECTED_ASSESSMENT_RESULT_TABLE_MISSING: %',name;
    END IF;
    SELECT pg_get_userbyid(relowner) INTO owner_name
      FROM pg_class WHERE oid=to_regclass(format('public.%I',name));
    IF owner_name <> 'apexos_user' THEN
      RAISE EXCEPTION 'UNEXPECTED_RESULT_TABLE_OWNER: % %',name,owner_name;
    END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY',name);
    EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.%I TO apex_app_runtime',name);
    EXECUTE format('DROP POLICY IF EXISTS app_runtime_school_access ON public.%I',name);
    EXECUTE format('DROP POLICY IF EXISTS app_runtime_school_guard ON public.%I',name);
    EXECUTE format(
      'CREATE POLICY app_runtime_school_access ON public.%I AS PERMISSIVE FOR ALL TO apex_app_runtime USING (%s) WITH CHECK (%s)',
      name,predicate,predicate
    );
    EXECUTE format(
      'CREATE POLICY app_runtime_school_guard ON public.%I AS RESTRICTIVE FOR ALL TO apex_app_runtime USING (%s) WITH CHECK (%s)',
      name,predicate,predicate
    );
  END LOOP;
END $$;
GRANT USAGE,SELECT ON SEQUENCE public.assessment_result_records_id_seq TO apex_app_runtime;
GRANT USAGE,SELECT ON SEQUENCE public.assessment_result_revisions_id_seq TO apex_app_runtime;
COMMIT;
