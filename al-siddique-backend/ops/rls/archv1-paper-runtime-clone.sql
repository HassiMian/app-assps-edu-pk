-- ASSPS Architecture V1: disposable-clone RLS enforcement proof.
-- NEVER deploy this pilot SQL directly to production. No global role alterations.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$
BEGIN
  IF current_database() !~ '^assps_archv1_rls_' THEN
    RAISE EXCEPTION 'Refusing to modify non-pilot database %', current_database();
  END IF;
  IF current_user <> 'postgres' THEN
    RAISE EXCEPTION 'Run this clone-only pilot as postgres administrator';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='apex_paper_runtime' AND NOT rolbypassrls AND NOT rolcanlogin) THEN
    RAISE EXCEPTION 'Restricted NOLOGIN/NOBYPASSRLS role apex_paper_runtime unavailable';
  END IF;
END $guard$;
GRANT USAGE ON SCHEMA public TO apex_paper_runtime;
DO $policies$
DECLARE tab text;
BEGIN
  FOR tab IN SELECT unnest(ARRAY[
    'paper_vault','paper_vault_revision_history','paper_documents','paper_revisions',
    'question_bank','question_bank_imports','question_masters','question_revisions',
    'assessment_papers','assessment_paper_revisions','assessment_releases',
    'assessment_print_jobs','assessment_roster_snapshots','curriculum_profiles'
  ]) LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema='public' AND table_name=tab AND column_name='school_id') THEN
      RAISE EXCEPTION 'Missing school_id in public.%',tab;
    END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',tab);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY',tab);
    EXECUTE format('GRANT SELECT ON public.%I TO apex_paper_runtime',tab);
    EXECUTE format('DROP POLICY IF EXISTS archv1_paper_runtime_allow ON public.%I',tab);
    EXECUTE format('DROP POLICY IF EXISTS archv1_paper_runtime_guard ON public.%I',tab);
    EXECUTE format($q$CREATE POLICY archv1_paper_runtime_allow ON public.%I
      AS PERMISSIVE FOR ALL TO apex_paper_runtime
      USING (school_id::text = NULLIF(current_setting('app.tenant_id',true),''))
      WITH CHECK (school_id::text = NULLIF(current_setting('app.tenant_id',true),''))$q$,tab);
    -- Restrictive AND guard defeats permissive legacy PUBLIC policy and
    -- accidental app.is_super_admin=true or app.rls_enabled=false flags.
    EXECUTE format($q$CREATE POLICY archv1_paper_runtime_guard ON public.%I
      AS RESTRICTIVE FOR ALL TO apex_paper_runtime
      USING (current_setting('app.rls_enabled',true)='true'
             AND school_id::text=NULLIF(current_setting('app.tenant_id',true),''))
      WITH CHECK (current_setting('app.rls_enabled',true)='true'
                  AND school_id::text=NULLIF(current_setting('app.tenant_id',true),''))$q$,tab);
  END LOOP;
END $policies$;
-- Clone-only column-level write permission used for rollback-only UPDATE tests.
-- Full application CRUD grants and route-scoped permissions are NOT certified.
GRANT UPDATE (question_text) ON public.question_bank TO apex_paper_runtime;
DO $assert$
BEGIN
  IF (SELECT COUNT(*) FROM pg_policies WHERE schemaname='public'
      AND policyname IN ('archv1_paper_runtime_allow','archv1_paper_runtime_guard'))<>28 THEN
    RAISE EXCEPTION 'Expected exactly 28 clone policies';
  END IF;
END $assert$;
COMMIT;
SELECT current_database() AS clone_db, COUNT(*) AS pilot_policies
FROM pg_policies WHERE schemaname='public'
AND policyname IN ('archv1_paper_runtime_allow','archv1_paper_runtime_guard')
GROUP BY current_database();
