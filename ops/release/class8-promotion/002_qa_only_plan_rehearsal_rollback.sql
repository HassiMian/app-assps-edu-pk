-- QA ONLY: undo unapproved future-promotion PLAN; preserves all existing
-- students and First Term results; never run this script on production.
BEGIN;
DO $g$
BEGIN
 IF current_database()<>'assps_timetable_9staff_qa_20261014'
 OR current_setting('port')<>'55432'
 OR (SELECT count(*) FROM public.school_class_promotion_plans)<>1
 OR EXISTS(SELECT 1 FROM public.school_class_promotion_plans
  WHERE status<>'AWAITING_RESULTS_AND_PRINT' OR
    print_verified_at IS NOT NULL OR academic_approved_at IS NOT NULL
    OR executed_at IS NOT NULL)
 THEN RAISE EXCEPTION 'UNSAFE_QA_PLAN_REVERSAL'; END IF;
END $g$;
DROP TABLE public.school_class_promotion_plans;
DO $post$
BEGIN
 IF (SELECT count(*) FROM public.students WHERE school_id=1 AND class='Eight' AND section='Blue' AND is_active)<>11
 OR (SELECT count(*) FROM public.exam_results WHERE school_id=1 AND exam_id=9)<1588
 OR (SELECT count(*) FROM public.timetable WHERE school_id=1)<>58
 THEN RAISE EXCEPTION 'QA_PLAN_ROLLBACK_CHANGED_ORIGINALS'; END IF;
END $post$;
COMMIT;
