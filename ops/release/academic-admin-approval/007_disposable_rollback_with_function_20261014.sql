-- DESTRUCTIVE ONLY IN THROWAWAY QA CLONE; NEVER RUN AGAINST LIVE APEXOS.
BEGIN;
DO $guard$
BEGIN
 IF current_database() <> 'assps_core_rollback_fn_cert_20261014' THEN
   RAISE EXCEPTION 'QA-only rollback refused on %', current_database();
 END IF;
 IF (SELECT count(*) FROM public.school_academic_approval_events) <> 0 THEN
   RAISE EXCEPTION 'Approval events exist; preserve genuine history';
 END IF;
END
$guard$;
DROP INDEX public.teacher_assignments_exact_active_unique_20261014;
DROP TABLE public.school_academic_approval_events;
DROP FUNCTION public.assps_academic_reviewer_authorized(integer,integer);
ALTER TABLE public.exam_subjects
 DROP COLUMN approved_at,
 DROP COLUMN approved_by_user_id,
 DROP COLUMN approval_revision,
 DROP COLUMN approval_status;
COMMIT;
