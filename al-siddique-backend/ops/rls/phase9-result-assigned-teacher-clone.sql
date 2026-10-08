-- Clone-only reconciliation of ARCHV1's result-author RLS with the
-- canonical Assessment Results "teacher assigned to release class" contract.
-- This is NOT a production migration. Writes remain actor-author restricted.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$
BEGIN
 IF current_database() <> 'assps_archv1_rls_corep9_20261008'
 OR current_setting('port')::integer <> 55432
 OR current_user <> 'postgres' THEN
  RAISE EXCEPTION 'Phase9 Assessment policy may run only on dedicated isolated clone';
 END IF;
END $guard$;
DROP POLICY IF EXISTS archv1_result_author_scope ON public.assessment_result_records;
DROP POLICY IF EXISTS archv1_result_teacher_read ON public.assessment_result_records;
DROP POLICY IF EXISTS archv1_result_teacher_write ON public.assessment_result_records;
DROP POLICY IF EXISTS archv1_result_teacher_insert ON public.assessment_result_records;
DROP POLICY IF EXISTS archv1_result_teacher_delete ON public.assessment_result_records;
CREATE POLICY archv1_result_teacher_read ON public.assessment_result_records
 AS RESTRICTIVE FOR SELECT TO apex_paper_runtime
 USING (
  paper_security.authorized_school(school_id)
  AND (
   current_setting('app.paper_actor_role',true)<>'teacher'
   OR created_by_key=current_setting('app.paper_actor_id',true)
   OR EXISTS (
    SELECT 1 FROM public.assessment_releases rel
    JOIN public.teacher_class_assignments ta
     ON ta.school_id=rel.school_id
     AND ta.teacher_user_id::text=current_setting('app.paper_actor_id',true)
     AND ta.is_active IS TRUE
    WHERE rel.school_id=assessment_result_records.school_id
     AND rel.release_id=assessment_result_records.release_id
     AND lower(trim(ta.class_name))=lower(trim(rel.snapshot_json #>> '{metadata,className}'))
     AND lower(trim(ta.subject))=lower(trim(rel.snapshot_json #>> '{metadata,subject}'))
     AND (coalesce(trim(ta.section),'')='' OR lower(trim(ta.section))=lower(trim(rel.snapshot_json #>> '{metadata,section}')))
   )
  )
 );
-- Teacher writes stay bound to *their own authored record*, NOT only class assignment.
CREATE POLICY archv1_result_teacher_write ON public.assessment_result_records
 AS RESTRICTIVE FOR UPDATE TO apex_paper_runtime
 USING (paper_security.authorized_school(school_id) AND (
  current_setting('app.paper_actor_role',true)<>'teacher'
  OR created_by_key=current_setting('app.paper_actor_id',true)))
 WITH CHECK (paper_security.authorized_school(school_id) AND (
  current_setting('app.paper_actor_role',true)<>'teacher'
  OR created_by_key=current_setting('app.paper_actor_id',true)));
CREATE POLICY archv1_result_teacher_insert ON public.assessment_result_records
 AS RESTRICTIVE FOR INSERT TO apex_paper_runtime
 WITH CHECK (paper_security.authorized_school(school_id) AND (
  current_setting('app.paper_actor_role',true)<>'teacher'
  OR created_by_key=current_setting('app.paper_actor_id',true)));
CREATE POLICY archv1_result_teacher_delete ON public.assessment_result_records
 AS RESTRICTIVE FOR DELETE TO apex_paper_runtime
 USING (paper_security.authorized_school(school_id) AND (
  current_setting('app.paper_actor_role',true)<>'teacher'
  OR created_by_key=current_setting('app.paper_actor_id',true)));
-- Revision SELECT inherits the *result's* restrictive read authorization;
-- never disclose entries by joining to unscoped parent IDs.
DROP POLICY IF EXISTS archv1_result_revision_author_scope ON public.assessment_result_revisions;
DROP POLICY IF EXISTS archv1_result_revision_teacher_read ON public.assessment_result_revisions;
CREATE POLICY archv1_result_revision_teacher_read ON public.assessment_result_revisions
 AS RESTRICTIVE FOR SELECT TO apex_paper_runtime
 USING (paper_security.authorized_school(school_id)
 AND EXISTS(
   SELECT 1 FROM public.assessment_result_records r
   WHERE r.id=assessment_result_revisions.result_record_id
     AND r.school_id=assessment_result_revisions.school_id
 ));
-- All revisions writes must be author-bound, no generic role bypass.
DROP POLICY IF EXISTS archv1_result_revision_teacher_insert ON public.assessment_result_revisions;
CREATE POLICY archv1_result_revision_teacher_insert ON public.assessment_result_revisions
 AS RESTRICTIVE FOR INSERT TO apex_paper_runtime
 WITH CHECK(paper_security.authorized_school(school_id)
 AND EXISTS(
  SELECT 1 FROM public.assessment_result_records r
  WHERE r.id=assessment_result_revisions.result_record_id
  AND r.school_id=assessment_result_revisions.school_id
  AND (current_setting('app.paper_actor_role',true)<>'teacher'
    OR r.created_by_key=current_setting('app.paper_actor_id',true))
 ));
-- Revision UPDATE/DELETE must not inherit only the broad school-wide signed
-- role policy. Explicitly require an authored parent for teachers.
DROP POLICY IF EXISTS archv1_result_revision_teacher_update ON public.assessment_result_revisions;
CREATE POLICY archv1_result_revision_teacher_update ON public.assessment_result_revisions
 AS RESTRICTIVE FOR UPDATE TO apex_paper_runtime
 USING (paper_security.authorized_school(school_id)
 AND EXISTS(
  SELECT 1 FROM public.assessment_result_records r
  WHERE r.id=assessment_result_revisions.result_record_id
  AND r.school_id=assessment_result_revisions.school_id
  AND (current_setting('app.paper_actor_role',true)<>'teacher'
   OR r.created_by_key=current_setting('app.paper_actor_id',true))
 ))
 WITH CHECK (paper_security.authorized_school(school_id)
 AND EXISTS(
  SELECT 1 FROM public.assessment_result_records r
  WHERE r.id=assessment_result_revisions.result_record_id
  AND r.school_id=assessment_result_revisions.school_id
  AND (current_setting('app.paper_actor_role',true)<>'teacher'
   OR r.created_by_key=current_setting('app.paper_actor_id',true))
 ));
DROP POLICY IF EXISTS archv1_result_revision_teacher_delete ON public.assessment_result_revisions;
CREATE POLICY archv1_result_revision_teacher_delete ON public.assessment_result_revisions
 AS RESTRICTIVE FOR DELETE TO apex_paper_runtime
 USING (paper_security.authorized_school(school_id)
 AND EXISTS(
  SELECT 1 FROM public.assessment_result_records r
  WHERE r.id=assessment_result_revisions.result_record_id
  AND r.school_id=assessment_result_revisions.school_id
  AND (current_setting('app.paper_actor_role',true)<>'teacher'
   OR r.created_by_key=current_setting('app.paper_actor_id',true))
 ));
COMMIT;
SELECT 'PHASE9_RESULT_SCOPED_POLICY_READY',
 (SELECT count(*) FROM pg_policies WHERE policyname LIKE 'archv1_result_teacher_%'),
 (SELECT count(*) FROM pg_policies WHERE policyname LIKE 'archv1_result_revision_teacher_%');
