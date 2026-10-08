-- ASSPS clone-only, asserted PostgreSQL RLS isolation/read/write gates.
\set ON_ERROR_STOP on
DO $guard$
BEGIN
  IF current_database() !~ '^assps_archv1_rls_' THEN
    RAISE EXCEPTION 'Refusing RLS test against non-pilot database %', current_database();
  END IF;
  IF current_user <> 'postgres' THEN
    RAISE EXCEPTION 'Run only as postgres in a disposable clone';
  END IF;
  IF (SELECT COUNT(*) FROM pg_policies WHERE schemaname='public'
       AND policyname IN ('archv1_paper_runtime_allow','archv1_paper_runtime_guard'))<>28 THEN
    RAISE EXCEPTION 'Pilot policy coverage 28/28 required';
  END IF;
  IF (SELECT rolbypassrls OR rolcanlogin FROM pg_roles WHERE rolname='apex_paper_runtime') THEN
    RAISE EXCEPTION 'Restricted role must be NOLOGIN and NOBYPASSRLS';
  END IF;
  IF pg_has_role('apex_paper_runtime','apexos_user','MEMBER') THEN
    RAISE EXCEPTION 'Restricted role must not inherit privileged application login';
  END IF;
  IF (SELECT COUNT(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname=ANY(ARRAY[
      'paper_vault','paper_vault_revision_history','paper_documents','paper_revisions',
      'question_bank','question_bank_imports','question_masters','question_revisions',
      'assessment_papers','assessment_paper_revisions','assessment_releases',
      'assessment_print_jobs','assessment_roster_snapshots','curriculum_profiles'])
      AND c.relrowsecurity AND c.relforcerowsecurity)<>14 THEN
    RAISE EXCEPTION 'RLS ENABLE+FORCE coverage 14/14 required';
  END IF;
  RAISE NOTICE 'PASS clone guard, restricted identity, 28 policies, 14 FORCE RLS tables';
END $guard$;
BEGIN;
SET LOCAL ROLE apex_paper_runtime;
SET LOCAL app.rls_enabled='true';
DO $test$
DECLARE tab text; rows_seen bigint;
BEGIN
 IF NOT row_security_active('public.question_bank'::regclass) THEN
   RAISE EXCEPTION 'Database RLS is not actually active';
 END IF;
 FOR tab IN SELECT unnest(ARRAY[
    'paper_vault','paper_vault_revision_history','paper_documents','paper_revisions',
    'question_bank','question_bank_imports','question_masters','question_revisions',
    'assessment_papers','assessment_paper_revisions','assessment_releases',
    'assessment_print_jobs','assessment_roster_snapshots','curriculum_profiles']) LOOP
   EXECUTE format('SELECT count(*) FROM public.%I',tab) INTO rows_seen;
   IF rows_seen<>0 THEN RAISE EXCEPTION 'No tenant leaked rows from %',tab; END IF;
 END LOOP;
 RAISE NOTICE 'PASS no tenant -> all 14 tables yield zero records';
END $test$;
SET LOCAL app.tenant_id='1';
DO $test$
DECLARE tab text; foreign_rows bigint;
BEGIN
 IF (SELECT COUNT(*) FROM question_bank)=0 OR (SELECT COUNT(*) FROM paper_vault)=0 THEN
   RAISE EXCEPTION 'Tenant 1 needs representative data in this clone';
 END IF;
 FOR tab IN SELECT unnest(ARRAY[
    'paper_vault','paper_vault_revision_history','paper_documents','paper_revisions',
    'question_bank','question_bank_imports','question_masters','question_revisions',
    'assessment_papers','assessment_paper_revisions','assessment_releases',
    'assessment_print_jobs','assessment_roster_snapshots','curriculum_profiles']) LOOP
   EXECUTE format('SELECT count(*) FROM public.%I WHERE school_id<>1',tab) INTO foreign_rows;
   IF foreign_rows<>0 THEN RAISE EXCEPTION 'Foreign tenant row leaked from %',tab; END IF;
 END LOOP;
 RAISE NOTICE 'PASS tenant 1 -> positive own data, no foreign rows across 14 tables';
END $test$;
SET LOCAL app.is_super_admin='true';
DO $$ BEGIN IF (SELECT COUNT(*) FROM question_bank WHERE school_id<>1)<>0 THEN
  RAISE EXCEPTION 'Spoofed superadmin flag bypassed restricted RLS';
END IF; RAISE NOTICE 'PASS app.is_super_admin cannot override bound tenant'; END $$;
SET LOCAL app.is_super_admin='false';
DO $test$
DECLARE n bigint;
BEGIN
 UPDATE question_bank SET question_text=question_text WHERE school_id=5;
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>0 THEN RAISE EXCEPTION 'Cross-tenant UPDATE affected % rows',n; END IF;
 UPDATE question_bank SET question_text=question_text
  WHERE id=(SELECT id FROM question_bank WHERE school_id=1 LIMIT 1);
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>1 THEN RAISE EXCEPTION 'Own-tenant UPDATE affected % rows (expected 1)',n; END IF;
 RAISE NOTICE 'PASS cross-tenant write blocked and own-tenant write works (uncommitted)';
END $test$;
SET LOCAL app.rls_enabled='false';
DO $$ BEGIN IF (SELECT COUNT(*) FROM question_bank)<>0 THEN
  RAISE EXCEPTION 'Disabled app.rls_enabled exposed rows';
END IF; RAISE NOTICE 'PASS disabled RLS context -> zero rows'; END $$;
SET LOCAL app.rls_enabled='true';
SET LOCAL app.tenant_id='5';
DO $test$
DECLARE tab text; foreign_rows bigint;
BEGIN
 IF (SELECT COUNT(*) FROM question_bank)=0 OR (SELECT COUNT(*) FROM paper_vault)<>0 THEN
   RAISE EXCEPTION 'Tenant 5 QB/foreign vault visibility incorrect';
 END IF;
 FOR tab IN SELECT unnest(ARRAY[
    'paper_vault','paper_vault_revision_history','paper_documents','paper_revisions',
    'question_bank','question_bank_imports','question_masters','question_revisions',
    'assessment_papers','assessment_paper_revisions','assessment_releases',
    'assessment_print_jobs','assessment_roster_snapshots','curriculum_profiles']) LOOP
   EXECUTE format('SELECT count(*) FROM public.%I WHERE school_id<>5',tab) INTO foreign_rows;
   IF foreign_rows<>0 THEN RAISE EXCEPTION 'Tenant 5 foreign row exposed from %',tab; END IF;
 END LOOP;
 RAISE NOTICE 'PASS tenant 5 -> positive own QB, no foreign rows across 14 tables';
END $test$;
ROLLBACK;
BEGIN;
SET LOCAL ROLE apex_paper_runtime;
SET LOCAL app.rls_enabled='true';
DO $$ BEGIN IF (SELECT COUNT(*) FROM question_bank)<>0 THEN
  RAISE EXCEPTION 'Session tenant context leaked across transactions';
END IF; RAISE NOTICE 'PASS transaction-local context reset, zero rows'; END $$;
ROLLBACK;
SELECT 'ARCHV1_PAPER_RUNTIME_CLONE_RLS_PASS' AS result;
