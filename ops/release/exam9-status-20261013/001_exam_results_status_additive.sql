-- REVIEW CANDIDATE ONLY. SaaS Core owns authorization, migration and rollback.
-- Do NOT run on production without isolated restore, data audit and signed release.
-- No existing marks, grades or metadata are rewritten.
BEGIN;
ALTER TABLE public.exam_results
  ADD COLUMN IF NOT EXISTS result_status varchar(16) DEFAULT 'SCORED';
-- Existing scored records retain their original numeric marks and grade.
ALTER TABLE public.exam_results ALTER COLUMN result_status SET NOT NULL;
ALTER TABLE public.exam_results ALTER COLUMN marks_obtained DROP DEFAULT;
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='exam_results_result_status_valid') THEN
   ALTER TABLE public.exam_results ADD CONSTRAINT exam_results_result_status_valid
     CHECK (result_status IN ('SCORED','ABSENT','PENDING','EXCUSED')) NOT VALID;
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='exam_results_score_state_valid') THEN
   ALTER TABLE public.exam_results ADD CONSTRAINT exam_results_score_state_valid
     CHECK ((result_status='SCORED' AND marks_obtained IS NOT NULL
              AND marks_obtained >= 0 AND marks_obtained <= total_marks)
        OR (result_status IN ('ABSENT','PENDING','EXCUSED') AND marks_obtained IS NULL))
     NOT VALID;
 END IF;
END $$;
-- Existing records must be reviewed before a separate VALIDATE CONSTRAINT.
COMMIT;
