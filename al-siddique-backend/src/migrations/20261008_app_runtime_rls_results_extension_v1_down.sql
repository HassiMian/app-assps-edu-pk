-- ASSPS targeted Results RLS extension rollback.
-- Use ONLY after restoring the former backend release under guarded rollback.
-- The existing tenant_isolation_policy and FORCE ROW LEVEL SECURITY remain.
-- No result records or revisions are changed.
BEGIN;
DO $$
DECLARE name text;
BEGIN
  FOREACH name IN ARRAY ARRAY['assessment_result_records','assessment_result_revisions']
  LOOP
    IF to_regclass(format('public.%I',name)) IS NULL THEN
      RAISE EXCEPTION 'RESULT_TABLE_MISSING_DURING_ROLLBACK: %',name;
    END IF;
    EXECUTE format('DROP POLICY IF EXISTS app_runtime_school_guard ON public.%I',name);
    EXECUTE format('DROP POLICY IF EXISTS app_runtime_school_access ON public.%I',name);
  END LOOP;
END $$;
COMMIT;
