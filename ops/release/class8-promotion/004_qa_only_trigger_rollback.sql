-- QA-only revert of the staged class8 trigger for re-entrant negative tests.
BEGIN;
DO $guard$
BEGIN
 IF current_database()<>'assps_timetable_9staff_qa_20261014'
 OR current_setting('port')<>'55432'
 OR (SELECT count(*) FROM public.students WHERE school_id=1
      AND class='Eight' AND section='Blue' AND is_active)<>11
 OR (SELECT count(*) FROM public.school_class_promotion_plans WHERE school_id=1
      AND status='AWAITING_RESULTS_AND_PRINT')<>1
 THEN RAISE EXCEPTION 'REJECT_QA_TRIGGER_REVERSAL'; END IF;
END $guard$;
DROP TRIGGER assps_class8_print_gate_20261014 ON public.students;
DROP FUNCTION public.assps_class8_print_gate_20261014();
COMMIT;
