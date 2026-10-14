-- QA ONLY. To restore live, use audited incident change procedure and frozen records.
BEGIN;
DO $g$
BEGIN
 IF current_database()<>'assps_pass40_shadow_20261014'
    OR (SELECT count(*) FROM public.assps_grade_revision_audit_20261014)<>112
    OR (SELECT count(*) FROM grade_settings WHERE school_id=1)<>6 THEN
  RAISE EXCEPTION 'DO_NOT_USE_ON_PRODUCTION_OR_CHANGED_QA';
 END IF;
END $g$;
UPDATE exam_results r SET grade=a.old_grade
FROM public.assps_grade_revision_audit_20261014 a
WHERE r.id=a.result_id AND r.school_id=a.school_id AND r.exam_id=a.exam_id
 AND r.grade=a.new_grade AND r.marks_obtained=a.marks_obtained AND r.total_marks=a.total_marks;
DELETE FROM grade_settings WHERE school_id=1;
DROP TABLE public.assps_grade_revision_audit_20261014;
DO $p$
BEGIN
 IF (SELECT count(*) FROM grade_settings WHERE school_id=1)<>0
    OR (SELECT count(*) FROM exam_results WHERE school_id=1 AND exam_id=9)<>1588
    OR (SELECT count(*) FROM exam_results WHERE school_id=1 AND exam_id=9 AND grade='F' AND marks_obtained*100>=40*total_marks)<>105
 THEN RAISE EXCEPTION 'ROLLBACK_QA_FAILED'; END IF;
END $p$;
COMMIT;
