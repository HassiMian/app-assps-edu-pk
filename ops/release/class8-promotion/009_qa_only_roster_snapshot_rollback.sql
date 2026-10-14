-- Disposable test database ONLY. Never run on production.
BEGIN;
DO $qa$
BEGIN
 IF current_database()<>'assps_timetable_9staff_qa_20261014'
 OR current_setting('port')<>'55432'
 OR current_user<>'postgres'
 OR (SELECT count(*) FROM public.school_class_promotion_source_roster)<>11
 OR (SELECT count(*) FROM public.school_class_promotion_plans WHERE school_id=1
     AND status='AWAITING_RESULTS_AND_PRINT' AND print_verified_at IS NULL)<>1
 THEN RAISE EXCEPTION 'SOURCE_ROSTER_QA_REVERSAL_DENIED'; END IF;
END $qa$;
DROP TABLE public.school_class_promotion_source_roster;
DO $post$
BEGIN
 IF (SELECT count(*) FROM public.students WHERE school_id=1
     AND class='Eight' AND section='Blue' AND is_active)<>11
 OR (SELECT count(*) FROM public.exam_results WHERE school_id=1 AND exam_id=9)<1588
 THEN RAISE EXCEPTION 'QA_ROSTER_REVERSAL_TOUCHED_SCHOOL_DATA'; END IF;
END $post$;
COMMIT;
