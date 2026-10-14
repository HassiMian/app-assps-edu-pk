-- ASSPS First Term, school 1: user-directed 40% passing policy.
-- Requires exact 1588 snapshot, full root-only backup, isolated QA rehearsal.
-- Never revises obtained/total marks, attendance, fees, enrollment or permissions.
BEGIN;
SET LOCAL lock_timeout='2500ms';
SET LOCAL statement_timeout='30000ms';
DO $pre$
DECLARE n integer; m integer; bad integer;
BEGIN
 IF current_user <> 'postgres' OR current_database() NOT IN ('apexos','assps_pass40_shadow_20261014') THEN
  RAISE EXCEPTION 'UNAUTHORIZED_TARGET_OR_OPERATOR';
 END IF;
 SELECT count(*) INTO n FROM exam_results WHERE school_id=1 AND exam_id=9;
 SELECT count(*) INTO m FROM grade_settings WHERE school_id=1;
 SELECT count(*) INTO bad FROM exam_results WHERE school_id=1 AND exam_id=9
   AND (marks_obtained IS NULL OR total_marks <= 0 OR marks_obtained < 0 OR marks_obtained > total_marks);
 IF n<>1588 OR m<>0 OR bad<>0 THEN
  RAISE EXCEPTION 'BASELINE_CHANGED: records %, grade bands %, invalid %',n,m,bad;
 END IF;
END $pre$;
CREATE TABLE IF NOT EXISTS public.assps_grade_revision_audit_20261014 (
 result_id integer PRIMARY KEY,
 school_id integer NOT NULL,
 exam_id integer NOT NULL,
 old_grade text,
 new_grade text NOT NULL,
 marks_obtained numeric NOT NULL,
 total_marks integer NOT NULL,
 policy_source text NOT NULL DEFAULT 'institutional-user-directive-20261014-pass40',
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
REVOKE ALL ON public.assps_grade_revision_audit_20261014 FROM PUBLIC;
ALTER TABLE public.assps_grade_revision_audit_20261014 ENABLE ROW LEVEL SECURITY;
-- DBA-only historical correction journal: RLS stays ENABLED but the table is
-- deliberately NOT FORCE so the pre-existing exact-77 signed catalog contract
-- remains intact. Its owner is postgres and no app role gets any privileges.
ALTER TABLE public.assps_grade_revision_audit_20261014 NO FORCE ROW LEVEL SECURITY;
INSERT INTO public.assps_grade_revision_audit_20261014
  (result_id,school_id,exam_id,old_grade,new_grade,marks_obtained,total_marks)
SELECT id,school_id,exam_id,grade,
 CASE
 WHEN marks_obtained*100>=total_marks*90 THEN 'A+'
 WHEN marks_obtained*100>=total_marks*80 THEN 'A'
 WHEN marks_obtained*100>=total_marks*70 THEN 'B'
 WHEN marks_obtained*100>=total_marks*60 THEN 'C'
 WHEN marks_obtained*100>=total_marks*40 THEN 'D'
 ELSE 'F' END,
 marks_obtained,total_marks
FROM exam_results
WHERE school_id=1 AND exam_id=9
 AND COALESCE(NULLIF(btrim(grade),''),'(blank)') IS DISTINCT FROM
 (CASE
 WHEN marks_obtained*100>=total_marks*90 THEN 'A+'
 WHEN marks_obtained*100>=total_marks*80 THEN 'A'
 WHEN marks_obtained*100>=total_marks*70 THEN 'B'
 WHEN marks_obtained*100>=total_marks*60 THEN 'C'
 WHEN marks_obtained*100>=total_marks*40 THEN 'D'
 ELSE 'F' END);
DO $counts$
BEGIN
 IF (SELECT count(*) FROM public.assps_grade_revision_audit_20261014)<>112 OR
    (SELECT count(*) FROM public.assps_grade_revision_audit_20261014
       WHERE old_grade='F' AND new_grade='D')<>105 THEN
   RAISE EXCEPTION 'REVIEW_SET_CHANGED';
 END IF;
END $counts$;
INSERT INTO grade_settings(school_id,label,min_percentage,max_percentage,sort_order)
VALUES (1,'A+',90,100,1),(1,'A',80,89,2),(1,'B',70,79,3),
       (1,'C',60,69,4),(1,'D',40,59,5),(1,'F',0,39,6);
UPDATE exam_results r SET grade=a.new_grade
FROM public.assps_grade_revision_audit_20261014 a
WHERE r.id=a.result_id AND r.school_id=a.school_id AND r.exam_id=a.exam_id
 AND r.marks_obtained=a.marks_obtained AND r.total_marks=a.total_marks
 AND r.grade IS NOT DISTINCT FROM a.old_grade;
DO $post$
DECLARE n integer; invalid integer; mismatches integer;
BEGIN
 SELECT count(*) INTO n FROM public.assps_grade_revision_audit_20261014;
 SELECT count(*) INTO mismatches
 FROM public.assps_grade_revision_audit_20261014 a
 JOIN exam_results r ON r.id=a.result_id
 WHERE r.grade IS DISTINCT FROM a.new_grade
    OR r.marks_obtained IS DISTINCT FROM a.marks_obtained
    OR r.total_marks IS DISTINCT FROM a.total_marks;
 SELECT count(*) INTO invalid FROM exam_results r
 WHERE r.school_id=1 AND r.exam_id=9 AND r.grade='F' AND r.marks_obtained*100>=40*r.total_marks;
 IF n<>112 OR mismatches<>0 OR invalid<>0 OR
    (SELECT count(*) FROM grade_settings WHERE school_id=1)<>6 THEN
  RAISE EXCEPTION 'POSTCONDITION_FAILED edits%, mismatch%, falsefail%',n,mismatches,invalid;
 END IF;
END $post$;
COMMIT;
