-- Disposable clone only: role-scoped Paper/Assessment CRUD grants.
-- Production migration needs a narrower, approved endpoint-by-endpoint matrix.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$
BEGIN
 IF current_database() !~ '^assps_archv1_rls_' OR current_user<>'postgres' THEN
  RAISE EXCEPTION 'Paper grants pilot may only run as postgres on isolated RLS clones';
 END IF;
END $guard$;
GRANT USAGE ON SCHEMA public TO apex_paper_runtime;
GRANT SELECT,INSERT,UPDATE,DELETE ON
 public.paper_vault,public.paper_vault_revision_history,
 public.paper_documents,public.paper_revisions,
 public.question_bank,public.question_bank_imports,
 public.question_masters,public.question_revisions,
 public.question_capture_requests,public.question_mappings,
 public.assessment_papers,public.assessment_paper_revisions,
 public.assessment_releases,public.assessment_print_jobs,
 public.assessment_roster_snapshots,public.curriculum_profiles,
 public.curriculum_profile_versions,public.curriculum_migration_plans
TO apex_paper_runtime;
GRANT SELECT ON public.teacher_class_assignments,public.saved_papers TO apex_paper_runtime;
DO $sequences$
DECLARE r RECORD;
BEGIN
 FOR r IN SELECT sequence_schema,sequence_name
          FROM information_schema.sequences
          WHERE sequence_schema='public' AND (
             sequence_name LIKE 'paper_%' OR sequence_name LIKE 'question_%'
             OR sequence_name LIKE 'assessment_%' OR sequence_name LIKE 'curriculum_%'
          ) LOOP
  EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %I.%I TO apex_paper_runtime',r.sequence_schema,r.sequence_name);
 END LOOP;
END $sequences$;
COMMIT;
SELECT 'ARCHV1_CLONE_PAPER_GRANTS_PASS' AS result;
