-- CLONE-ONLY signed tenant guard for a non-BYPASSRLS dedicated DB login.
-- Supply -v PAPER_HMAC_KEY=<unique externally provisioned key> (>=32 chars).
-- Never commit a real signing key. Never run this on live databases.
\set ON_ERROR_STOP on
\if :{?PAPER_HMAC_KEY}
\else
\echo 'PAPER_HMAC_KEY psql variable is required'
\quit 1
\endif
BEGIN;
DO $guard$
BEGIN
 IF current_database() !~ '^assps_archv1_rls_' OR current_user <> 'postgres' THEN
  RAISE EXCEPTION 'Signed guard is ONLY for isolated assps_archv1_rls_ clones';
 END IF;
END $guard$;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;
CREATE SCHEMA IF NOT EXISTS paper_security AUTHORIZATION postgres;
REVOKE ALL ON SCHEMA paper_security FROM PUBLIC;
CREATE TABLE IF NOT EXISTS paper_security.signing_key (
 singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
 key_value TEXT NOT NULL CHECK (length(key_value)>=32)
);
REVOKE ALL ON paper_security.signing_key FROM PUBLIC;
INSERT INTO paper_security.signing_key(singleton,key_value)
VALUES (TRUE, :'PAPER_HMAC_KEY')
ON CONFLICT(singleton) DO UPDATE SET key_value=EXCLUDED.key_value;
CREATE OR REPLACE FUNCTION paper_security.authorized_school(p_school_id INTEGER)
RETURNS BOOLEAN LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog, paper_security
AS $function$
DECLARE
 t TEXT := current_setting('app.tenant_id',true);
 exp TEXT := current_setting('app.paper_rls_exp',true);
 nonce TEXT := current_setting('app.paper_rls_nonce',true);
 actor_id TEXT := current_setting('app.paper_actor_id',true);
 actor_role TEXT := current_setting('app.paper_actor_role',true);
 sig TEXT := current_setting('app.paper_rls_sig',true);
 secret TEXT;
 payload TEXT;
BEGIN
 IF current_setting('app.rls_enabled',true) IS DISTINCT FROM 'true'
    OR t IS NULL OR t !~ '^[0-9]{1,12}$'
    OR exp IS NULL OR exp !~ '^[0-9]{10}$'
    OR actor_id IS NULL OR actor_id !~ '^[1-9][0-9]{0,11}$'
    OR actor_role IS NULL OR actor_role NOT IN ('teacher','principal','admin','school_admin','super_admin')
    OR nonce IS NULL OR nonce !~ '^[a-f0-9]{32}$'
    OR sig IS NULL OR sig !~ '^[a-f0-9]{64}$'
    OR p_school_id::TEXT <> t THEN RETURN FALSE;
 END IF;
 IF exp::BIGINT < EXTRACT(EPOCH FROM clock_timestamp())::BIGINT
    OR exp::BIGINT > EXTRACT(EPOCH FROM clock_timestamp())::BIGINT + 120 THEN
    RETURN FALSE;
 END IF;
 SELECT key_value INTO secret FROM paper_security.signing_key WHERE singleton=TRUE;
 IF secret IS NULL THEN RETURN FALSE; END IF;
 payload := t || '|' || session_user || '|' || actor_id || '|' || actor_role || '|' || exp || '|' || nonce;
 RETURN encode(public.hmac(convert_to(payload,'UTF8'),convert_to(secret,'UTF8'),'sha256'),'hex')=sig;
END
$function$;
REVOKE ALL ON FUNCTION paper_security.authorized_school(INTEGER) FROM PUBLIC;
GRANT USAGE ON SCHEMA paper_security TO apex_paper_runtime;
GRANT EXECUTE ON FUNCTION paper_security.authorized_school(INTEGER) TO apex_paper_runtime;
DO $policies$
DECLARE tab TEXT;
BEGIN
 FOR tab IN SELECT unnest(ARRAY[
    'paper_vault','paper_vault_revision_history','paper_documents','paper_revisions',
    'question_bank','question_bank_imports','question_masters','question_revisions',
    'assessment_papers','assessment_paper_revisions','assessment_releases',
    'assessment_print_jobs','assessment_roster_snapshots','curriculum_profiles',
    'curriculum_profile_versions','curriculum_migration_plans',
    'teacher_class_assignments','question_capture_requests','question_mappings','saved_papers'
 ]) LOOP
   IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name=tab AND column_name='school_id') THEN
     RAISE EXCEPTION 'Missing school_id for protected table %',tab;
   END IF;
   EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',tab);
   EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY',tab);
   EXECUTE format('GRANT SELECT ON public.%I TO apex_paper_runtime',tab);
   EXECUTE format('DROP POLICY IF EXISTS archv1_paper_runtime_allow ON public.%I',tab);
   EXECUTE format('DROP POLICY IF EXISTS archv1_paper_runtime_guard ON public.%I',tab);
   EXECUTE format('CREATE POLICY archv1_paper_runtime_allow ON public.%I AS PERMISSIVE FOR ALL TO apex_paper_runtime USING (school_id::text = NULLIF(current_setting(''app.tenant_id'',true),'''')) WITH CHECK (school_id::text = NULLIF(current_setting(''app.tenant_id'',true),''''))',tab);
   EXECUTE format('CREATE POLICY archv1_paper_runtime_guard ON public.%I AS RESTRICTIVE FOR ALL TO apex_paper_runtime USING (paper_security.authorized_school(school_id)) WITH CHECK (paper_security.authorized_school(school_id))',tab);
 END LOOP;
END $policies$;
-- Actor role and id are signed in authorized_school's HMAC. These extra
-- restrictive policies prevent teachers from altering governed questions and
-- reading/editing another teacher's Paper Vault drafts even if a query path errs.
DO $rbac$
DECLARE tab TEXT;
BEGIN
 FOR tab IN SELECT unnest(ARRAY[
   'question_bank','question_bank_imports','question_masters','question_revisions',
   'curriculum_profiles','curriculum_profile_versions','curriculum_migration_plans',
   'question_capture_requests','question_mappings']) LOOP
   EXECUTE format('DROP POLICY IF EXISTS archv1_paper_governance_insert ON public.%I',tab);
   EXECUTE format('DROP POLICY IF EXISTS archv1_paper_governance_update ON public.%I',tab);
   EXECUTE format('DROP POLICY IF EXISTS archv1_paper_governance_delete ON public.%I',tab);
   EXECUTE format($p$CREATE POLICY archv1_paper_governance_insert ON public.%I
       AS RESTRICTIVE FOR INSERT TO apex_paper_runtime
       WITH CHECK (paper_security.authorized_school(school_id)
           AND current_setting('app.paper_actor_role',true) IN ('admin','school_admin','principal','super_admin'))$p$,tab);
   EXECUTE format($p$CREATE POLICY archv1_paper_governance_update ON public.%I
       AS RESTRICTIVE FOR UPDATE TO apex_paper_runtime
       USING (paper_security.authorized_school(school_id)
           AND current_setting('app.paper_actor_role',true) IN ('admin','school_admin','principal','super_admin'))
       WITH CHECK (paper_security.authorized_school(school_id)
           AND current_setting('app.paper_actor_role',true) IN ('admin','school_admin','principal','super_admin'))$p$,tab);
   EXECUTE format($p$CREATE POLICY archv1_paper_governance_delete ON public.%I
       AS RESTRICTIVE FOR DELETE TO apex_paper_runtime
       USING (paper_security.authorized_school(school_id)
           AND current_setting('app.paper_actor_role',true) IN ('admin','school_admin','principal','super_admin'))$p$,tab);
 END LOOP;
END $rbac$;
DROP POLICY IF EXISTS archv1_paper_vault_actor_scope ON public.paper_vault;
CREATE POLICY archv1_paper_vault_actor_scope ON public.paper_vault
 AS RESTRICTIVE FOR ALL TO apex_paper_runtime
 USING (paper_security.authorized_school(school_id)
   AND (current_setting('app.paper_actor_role',true)<>'teacher'
     OR owner_user_id::text=current_setting('app.paper_actor_id',true)))
 WITH CHECK (paper_security.authorized_school(school_id)
   AND (current_setting('app.paper_actor_role',true)<>'teacher'
     OR owner_user_id::text=current_setting('app.paper_actor_id',true)));
DROP POLICY IF EXISTS archv1_paper_history_actor_scope ON public.paper_vault_revision_history;
CREATE POLICY archv1_paper_history_actor_scope ON public.paper_vault_revision_history
 AS RESTRICTIVE FOR ALL TO apex_paper_runtime
 USING (paper_security.authorized_school(school_id)
   AND (current_setting('app.paper_actor_role',true)<>'teacher'
     OR EXISTS (SELECT 1 FROM public.paper_vault v
       WHERE v.id=paper_id AND v.school_id=paper_vault_revision_history.school_id
         AND v.owner_user_id::text=current_setting('app.paper_actor_id',true))))
 WITH CHECK (paper_security.authorized_school(school_id)
   AND (current_setting('app.paper_actor_role',true)<>'teacher'
     OR EXISTS (SELECT 1 FROM public.paper_vault v
       WHERE v.id=paper_id AND v.school_id=paper_vault_revision_history.school_id
         AND v.owner_user_id::text=current_setting('app.paper_actor_id',true))));
-- Canonical Assessment Studio manual drafts are author-scoped for teachers;
-- principals/admins can review all papers in the authenticated school.
DROP POLICY IF EXISTS archv1_assessment_draft_author_scope ON public.assessment_papers;
CREATE POLICY archv1_assessment_draft_author_scope ON public.assessment_papers
 AS RESTRICTIVE FOR ALL TO apex_paper_runtime
 USING (paper_security.authorized_school(school_id)
   AND (current_setting('app.paper_actor_role',true)<>'teacher'
     OR created_by_key=current_setting('app.paper_actor_id',true)))
 WITH CHECK (paper_security.authorized_school(school_id)
   AND (current_setting('app.paper_actor_role',true)<>'teacher'
     OR created_by_key=current_setting('app.paper_actor_id',true)));
DROP POLICY IF EXISTS archv1_assessment_revision_author_scope ON public.assessment_paper_revisions;
CREATE POLICY archv1_assessment_revision_author_scope ON public.assessment_paper_revisions
 AS RESTRICTIVE FOR ALL TO apex_paper_runtime
 USING (paper_security.authorized_school(school_id)
   AND (current_setting('app.paper_actor_role',true)<>'teacher'
     OR EXISTS (SELECT 1 FROM public.assessment_papers p
       WHERE p.id=paper_id AND p.school_id=assessment_paper_revisions.school_id
         AND p.created_by_key=current_setting('app.paper_actor_id',true))))
 WITH CHECK (paper_security.authorized_school(school_id)
   AND (current_setting('app.paper_actor_role',true)<>'teacher'
     OR EXISTS (SELECT 1 FROM public.assessment_papers p
       WHERE p.id=paper_id AND p.school_id=assessment_paper_revisions.school_id
         AND p.created_by_key=current_setting('app.paper_actor_id',true))));
-- A teacher can author or request printing, but cannot approve a release.
-- This guard is enforced in PostgreSQL in addition to the Express RBAC gate.
DO $releases$
DECLARE tab TEXT;
BEGIN
 FOR tab IN SELECT unnest(ARRAY['assessment_releases']) LOOP
  EXECUTE format('DROP POLICY IF EXISTS archv1_release_authority_insert ON public.%I',tab);
  EXECUTE format('DROP POLICY IF EXISTS archv1_release_authority_update ON public.%I',tab);
  EXECUTE format('DROP POLICY IF EXISTS archv1_release_authority_delete ON public.%I',tab);
  EXECUTE format($p$CREATE POLICY archv1_release_authority_insert ON public.%I
      AS RESTRICTIVE FOR INSERT TO apex_paper_runtime
      WITH CHECK (paper_security.authorized_school(school_id)
         AND current_setting('app.paper_actor_role',true) IN ('admin','school_admin','principal','super_admin'))$p$,tab);
  EXECUTE format($p$CREATE POLICY archv1_release_authority_update ON public.%I
      AS RESTRICTIVE FOR UPDATE TO apex_paper_runtime
      USING (paper_security.authorized_school(school_id)
         AND current_setting('app.paper_actor_role',true) IN ('admin','school_admin','principal','super_admin'))
      WITH CHECK (paper_security.authorized_school(school_id)
         AND current_setting('app.paper_actor_role',true) IN ('admin','school_admin','principal','super_admin'))$p$,tab);
  EXECUTE format($p$CREATE POLICY archv1_release_authority_delete ON public.%I
      AS RESTRICTIVE FOR DELETE TO apex_paper_runtime
      USING (paper_security.authorized_school(school_id)
         AND current_setting('app.paper_actor_role',true) IN ('admin','school_admin','principal','super_admin'))$p$,tab);
 END LOOP;
END $releases$;
DROP POLICY IF EXISTS archv1_saved_paper_actor_scope ON public.saved_papers;
CREATE POLICY archv1_saved_paper_actor_scope ON public.saved_papers
 AS RESTRICTIVE FOR ALL TO apex_paper_runtime
 USING (paper_security.authorized_school(school_id)
  AND (current_setting('app.paper_actor_role',true)<>'teacher'
    OR created_by::text=current_setting('app.paper_actor_id',true)))
 WITH CHECK (paper_security.authorized_school(school_id)
  AND (current_setting('app.paper_actor_role',true)<>'teacher'
    OR created_by::text=current_setting('app.paper_actor_id',true)));
DROP POLICY IF EXISTS archv1_teacher_assignment_actor_scope ON public.teacher_class_assignments;
CREATE POLICY archv1_teacher_assignment_actor_scope ON public.teacher_class_assignments
 AS RESTRICTIVE FOR SELECT TO apex_paper_runtime
 USING (paper_security.authorized_school(school_id)
  AND (current_setting('app.paper_actor_role',true)<>'teacher'
    OR teacher_user_id::text=current_setting('app.paper_actor_id',true)));
-- Only for the clone-backed validation: actual CRUD permissions remain staged.
GRANT UPDATE(question_text) ON public.question_bank TO apex_paper_runtime;
COMMIT;
SELECT 'CLONE_SIGNED_RLS_POLICIES_APPLIED' AS result, COUNT(*) AS policies
FROM pg_policies WHERE schemaname='public'
AND policyname IN ('archv1_paper_runtime_allow','archv1_paper_runtime_guard');
