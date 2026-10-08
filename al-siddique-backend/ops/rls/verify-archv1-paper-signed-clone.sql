-- Assert the signed tenant and actor RLS schema; clone-only.
\set ON_ERROR_STOP on
DO $verification$
DECLARE tables TEXT[]:=ARRAY[
 'paper_vault','paper_vault_revision_history','paper_documents','paper_revisions',
 'question_bank','question_bank_imports','question_masters','question_revisions',
 'assessment_papers','assessment_paper_revisions','assessment_releases',
 'assessment_print_jobs','assessment_roster_snapshots','curriculum_profiles',
 'curriculum_profile_versions','curriculum_migration_plans',
 'teacher_class_assignments','question_capture_requests','question_mappings','saved_papers',
 'assessment_result_records','assessment_result_revisions','subject_offerings','learning_scope_identities','learning_scope_versions','resource_scope_mappings'];
DECLARE tab TEXT;
DECLARE n INTEGER;
BEGIN
 IF current_database() !~ '^assps_archv1_rls_' OR current_user<>'postgres' THEN
   RAISE EXCEPTION 'Signed verification may run only on disposable clone';
 END IF;
 IF (SELECT rolbypassrls FROM pg_roles WHERE rolname='apex_paper_runtime') IS DISTINCT FROM FALSE THEN
   RAISE EXCEPTION 'Paper runtime must be NO BYPASS RLS';
 END IF;
 FOREACH tab IN ARRAY tables LOOP
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
       WHERE n.nspname='public' AND c.relname=tab AND c.relrowsecurity AND c.relforcerowsecurity) THEN
     RAISE EXCEPTION 'RLS FORCE missing on %',tab;
  END IF;
  SELECT count(*) INTO n FROM pg_policies WHERE schemaname='public' AND tablename=tab
    AND policyname IN ('archv1_paper_runtime_allow','archv1_paper_runtime_guard');
  IF n<>2 THEN RAISE EXCEPTION 'Incomplete signed RLS policies on %: %',tab,n; END IF;
 END LOOP;
 IF (SELECT count(*) FROM pg_policies WHERE policyname LIKE 'archv1_paper_governance_%')<>27 THEN
  RAISE EXCEPTION 'Governor actor policies 27 required';
 END IF;
 IF (SELECT count(*) FROM pg_policies WHERE policyname LIKE 'archv1_release_authority_%')<>3 THEN
  RAISE EXCEPTION 'Release RBAC policies 3 required';
 END IF;
 IF (SELECT count(*) FROM pg_policies WHERE policyname IN
     ('archv1_paper_vault_actor_scope','archv1_paper_history_actor_scope',
      'archv1_saved_paper_actor_scope','archv1_teacher_assignment_actor_scope',
      'archv1_assessment_draft_author_scope','archv1_assessment_revision_author_scope',
      'archv1_result_author_scope','archv1_result_revision_author_scope'))<>8 THEN
  RAISE EXCEPTION 'Actor ownership policies 8 required';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='paper_security' AND p.proname='authorized_school'
     AND p.prosecdef AND pg_get_userbyid(p.proowner)='postgres') THEN
  RAISE EXCEPTION 'Protected SECURITY DEFINER signature function missing';
 END IF;
 IF has_table_privilege('apex_paper_runtime','paper_security.signing_key','SELECT') THEN
  RAISE EXCEPTION 'Restricted role can read HMAC signing secret';
 END IF;
 RAISE NOTICE 'PASS 26 FORCE-RLS tables, 52 allow/guard, 27 governance, 8 owner policies, 3 release-authority policies';
END $verification$;
BEGIN;
SET LOCAL ROLE apex_paper_runtime;
DO $no_context$
DECLARE tab TEXT;
DECLARE count_seen BIGINT;
BEGIN
 FOR tab IN SELECT unnest(ARRAY[
 'paper_vault','paper_vault_revision_history','paper_documents','paper_revisions',
 'question_bank','question_bank_imports','question_masters','question_revisions',
 'assessment_papers','assessment_paper_revisions','assessment_releases',
 'assessment_print_jobs','assessment_roster_snapshots','curriculum_profiles',
 'curriculum_profile_versions','curriculum_migration_plans',
 'teacher_class_assignments','question_capture_requests','question_mappings','saved_papers',
 'assessment_result_records','assessment_result_revisions','subject_offerings','learning_scope_identities','learning_scope_versions','resource_scope_mappings']) LOOP
  EXECUTE format('SELECT count(*) FROM public.%I',tab) INTO count_seen;
  IF count_seen<>0 THEN RAISE EXCEPTION 'No-context leaked rows in %',tab; END IF;
 END LOOP;
 RAISE NOTICE 'PASS missing signed tenant context returns no rows across 26 tables';
END $no_context$;
ROLLBACK;
SELECT 'ARCHV1_SIGNED_CLONE_SCHEMA_PASS' AS result;
