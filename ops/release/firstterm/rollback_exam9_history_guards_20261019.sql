-- Rollback of guard schema only; does not touch any historic exam data.
-- Apply ONLY if a verified, reviewed replacement makes this protection unnecessary.
BEGIN;
SET LOCAL lock_timeout = '6s';
DROP TRIGGER IF EXISTS assps_firstterm_exam9_results_guard ON public.exam_results;
DROP TRIGGER IF EXISTS assps_firstterm_exam9_exam_guard ON public.exams;
DROP TRIGGER IF EXISTS assps_firstterm_exam9_results_truncate_guard ON public.exam_results;
DROP TRIGGER IF EXISTS assps_firstterm_exam9_exams_truncate_guard ON public.exams;
DROP FUNCTION IF EXISTS public.assps_firstterm_exam9_immutability_20261019();
COMMIT;
