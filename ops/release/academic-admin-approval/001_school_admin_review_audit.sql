-- Additive and fail-closed. Apply only after independent backup/rollback rehearsal.
BEGIN;
SET LOCAL lock_timeout='2500ms';
SET LOCAL statement_timeout='30000ms';
DO $release_guard$
BEGIN
 IF current_database() NOT IN ('apexos','assps_pass40_shadow_20261014','assps_admin_migration_1588_qa_20261014')
 OR (SELECT count(*) FROM exam_results WHERE school_id=1 AND exam_id=9)<1588
 OR (SELECT count(*) FROM grade_settings WHERE school_id=1)<>6
 OR (SELECT count(*) FROM information_schema.columns
     WHERE table_name='exam_subjects' AND column_name='approval_status')<>0
 OR (SELECT count(*) FROM information_schema.tables
     WHERE table_name='school_academic_approval_events')<>0
 OR (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND c.relkind='r' AND c.relforcerowsecurity
       AND c.relname<>'student_class_movement_audit')<>77 THEN
  RAISE EXCEPTION 'SCHOOL_APPROVAL_MIGRATION_PRECONDITION_FAILED';
 END IF;
END $release_guard$;
ALTER TABLE public.exam_subjects
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approval_revision integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS approved_by_user_id integer,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;
CREATE TABLE IF NOT EXISTS public.school_academic_approval_events (
 id bigserial PRIMARY KEY,
 school_id integer NOT NULL,
 exam_id integer NOT NULL,
 actor_user_id integer NOT NULL,
 action text NOT NULL CHECK (action IN ('exam_subject_maximum', 'teacher_assignment')),
 object_id integer NOT NULL,
 evidence_sha256 char(64) NOT NULL,
 evidence_reference text NOT NULL,
 old_revision integer,
 new_revision integer,
 approved_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK (new_revision IS NULL OR new_revision > 0)
);
CREATE INDEX IF NOT EXISTS school_academic_approval_event_scope
ON public.school_academic_approval_events(school_id, exam_id, action, object_id, approved_at DESC);

-- Prevent concurrent duplicate active grants, including casing/space variants.
CREATE UNIQUE INDEX IF NOT EXISTS teacher_assignments_exact_active_unique_20261014
ON public.teacher_class_assignments
 (school_id, teacher_user_id, LOWER(BTRIM(class_name)), LOWER(BTRIM(section)), LOWER(BTRIM(subject)))
WHERE is_active=true;
-- The new audit log is not world-readable. Only signed tenant runtime may
-- access its own school, even when called outside the HTTP middleware.
ALTER TABLE public.school_academic_approval_events ENABLE ROW LEVEL SECURITY;
-- Nonowner signed application runtime remains subject to ENABLED RLS; only
-- postgres owns the table. Do not add a FORCE-flagged 78th protected table until
-- existing green/runtime exact-77 catalog validators have been upgraded.
ALTER TABLE public.school_academic_approval_events NO FORCE ROW LEVEL SECURITY;
-- Security-definer returns ONLY a boolean. It never exposes another school
-- user and requires a cryptographically signed actor/school transaction.
CREATE OR REPLACE FUNCTION public.assps_academic_reviewer_authorized(
 p_school_id integer, p_actor_id integer
) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog, core_security
AS $review$
DECLARE signed_actor text := current_setting('app.core_actor_id',true);
BEGIN
 IF p_school_id IS NULL OR p_school_id<=0
    OR p_actor_id IS NULL OR p_actor_id<=0
    OR signed_actor IS NULL OR signed_actor !~ '^[1-9][0-9]{0,11}$'
    OR signed_actor::bigint IS DISTINCT FROM p_actor_id::bigint
    OR NOT core_security.signed_school_allowed(p_school_id) THEN
   RETURN false;
 END IF;
 RETURN EXISTS (
  SELECT 1 FROM public.users u
  WHERE u.id=p_actor_id AND u.school_id=p_school_id AND u.is_active=true
    AND u.role IN ('admin','principal')
 );
END;
$review$;
REVOKE ALL ON FUNCTION public.assps_academic_reviewer_authorized(integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assps_academic_reviewer_authorized(integer,integer)
 TO assps_core_green_runtime,assps_marks_signed_runtime;
CREATE POLICY school_academic_approval_signed_allow
 ON public.school_academic_approval_events
 FOR ALL TO PUBLIC
 USING (core_security.signed_school_allowed(school_id))
 WITH CHECK (
 core_security.signed_school_allowed(school_id)
 AND public.assps_academic_reviewer_authorized(school_id, actor_user_id)
);
REVOKE ALL ON public.school_academic_approval_events FROM PUBLIC;
GRANT SELECT,INSERT ON public.school_academic_approval_events
 TO assps_core_green_runtime,assps_marks_signed_runtime;
GRANT USAGE,SELECT ON SEQUENCE public.school_academic_approval_events_id_seq
 TO assps_core_green_runtime,assps_marks_signed_runtime;
COMMIT;
