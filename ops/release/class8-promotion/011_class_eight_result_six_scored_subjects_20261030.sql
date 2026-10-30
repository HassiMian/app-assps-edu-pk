-- User's explicit Class Eight First Term instruction, 30 Oct 2026:
-- Quran/Nazra was intentionally skipped from RESULTS; do not invent marks.
-- Auditably retain the historic subject row inactive, without deleting data.
-- Reconcile the other six existing 11-student result denominators.
-- Do NOT mark any paper "approved"; do NOT assert printed result-card proof.
BEGIN ISOLATION LEVEL SERIALIZABLE;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='35s';
DO $before$
DECLARE n integer;
BEGIN
 IF current_database()<>'apexos' THEN
   RAISE EXCEPTION 'Wrong database';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM school_class_promotion_plans WHERE id=1
    AND school_id=1 AND exam_id=9 AND source_class='Eight'
    AND source_section='Blue' AND destination_class='Pre Nine'
    AND destination_section='Blue' AND expected_subject_count=7
    AND status='AWAITING_RESULTS_AND_PRINT'
    AND print_verified_at IS NULL AND academic_approved_at IS NULL) THEN
    RAISE EXCEPTION 'Source promotion plan unexpected or approvals already changed';
 END IF;
 SELECT count(*) INTO n FROM school_class_promotion_source_roster
 WHERE plan_id=1 AND school_id=1;
 IF n<>11 THEN RAISE EXCEPTION 'Unexpected original roster %',n; END IF;
 SELECT count(*) INTO n FROM students WHERE school_id=1 AND class='Eight'
 AND section='Blue' AND is_active=true AND id IN
  (SELECT student_id FROM school_class_promotion_source_roster WHERE plan_id=1);
 IF n<>11 THEN RAISE EXCEPTION 'Original cohort changed %',n; END IF;
 IF NOT EXISTS (SELECT 1 FROM exam_subjects WHERE school_id=1 AND id=74
   AND exam_id=9 AND class_name='Eight' AND section='Blue'
   AND subject='Quran / Nazra' AND is_active=true
   AND approval_status='pending' AND total_marks IS NULL) THEN
   RAISE EXCEPTION 'Quran/Nazra source offering changed'; END IF;
 SELECT count(*) INTO n FROM exam_results WHERE school_id=1 AND exam_id=9
   AND lower(trim(subject)) IN ('quran / nazra','quran','nazra');
 IF n<>0 THEN RAISE EXCEPTION 'Quran marks exist; refuse unverified exclusion'; END IF;
 SELECT count(*) INTO n FROM exam_subjects WHERE school_id=1 AND exam_id=9
   AND class_name='Eight' AND section='Blue' AND is_active=true;
 IF n<>7 THEN RAISE EXCEPTION 'Unexpected source offering count %',n; END IF;
 SELECT count(*) INTO n FROM (
  SELECT es.id
  FROM exam_subjects es
  JOIN exam_results r ON r.school_id=es.school_id AND r.exam_id=es.exam_id
    AND lower(trim(r.subject))=lower(trim(es.subject))
    AND r.student_id IN (SELECT student_id FROM school_class_promotion_source_roster WHERE plan_id=1)
  WHERE es.school_id=1 AND es.exam_id=9 AND es.class_name='Eight'
    AND es.section='Blue' AND es.is_active=true AND es.subject<>'Quran / Nazra'
    AND es.total_marks IS NULL AND es.approval_status='pending'
    AND es.approved_at IS NULL AND es.approved_by_user_id IS NULL
  GROUP BY es.id
  HAVING COUNT(*)=11 AND COUNT(DISTINCT r.student_id)=11
     AND COUNT(DISTINCT r.total_marks)=1 AND MIN(r.total_marks)>0
     AND COUNT(*) FILTER (WHERE r.marks_obtained IS NULL
       OR r.marks_obtained<0 OR r.marks_obtained>r.total_marks)=0
 ) evidence;
 IF n<>6 THEN RAISE EXCEPTION 'Six independently consistent scored papers not proven (%).',n; END IF;
END $before$;
UPDATE exam_subjects SET is_active=false,updated_at=now()
 WHERE school_id=1 AND id=74 AND exam_id=9 AND subject='Quran / Nazra' AND is_active=true;
DO $audit$
BEGIN
 IF (SELECT count(*) FROM exam_subjects WHERE id=74 AND is_active=false)<>1 THEN
  RAISE EXCEPTION 'Exclusion did not apply exactly once'; END IF;
END $audit$;
WITH observed AS (
 SELECT es.id,MAX(r.total_marks)::int AS maximum
 FROM exam_subjects es
 JOIN exam_results r ON r.school_id=es.school_id AND r.exam_id=es.exam_id
  AND lower(trim(r.subject))=lower(trim(es.subject))
  AND r.student_id IN (SELECT student_id FROM school_class_promotion_source_roster WHERE plan_id=1)
 WHERE es.school_id=1 AND es.exam_id=9 AND es.class_name='Eight'
  AND es.section='Blue' AND es.is_active=true
 GROUP BY es.id
 HAVING COUNT(*)=11 AND COUNT(DISTINCT r.student_id)=11
  AND COUNT(DISTINCT r.total_marks)=1
)
UPDATE exam_subjects es
SET total_marks=o.maximum,updated_at=now()
FROM observed o
WHERE es.id=o.id AND es.school_id=1 AND es.total_marks IS NULL
 AND es.approval_status='pending' AND es.approved_at IS NULL
 AND es.approved_by_user_id IS NULL;
UPDATE school_class_promotion_plans
SET expected_subject_count=6,
policy_source=policy_source ||
 ' | Academic result scope correction, user instruction 2026-10-30: Quran / Nazra intentionally excluded; six scored subjects, 11 results each; paper approvals and print sign-off still pending.'
WHERE id=1 AND school_id=1 AND exam_id=9
 AND expected_subject_count=7 AND status='AWAITING_RESULTS_AND_PRINT';
DO $after$
DECLARE n integer;
BEGIN
 IF (SELECT expected_subject_count FROM school_class_promotion_plans WHERE id=1)<>6
 OR (SELECT status FROM school_class_promotion_plans WHERE id=1)<>'AWAITING_RESULTS_AND_PRINT'
 OR (SELECT print_verified_at FROM school_class_promotion_plans WHERE id=1) IS NOT NULL
 OR (SELECT academic_approved_at FROM school_class_promotion_plans WHERE id=1) IS NOT NULL
 THEN RAISE EXCEPTION 'Plan scope/signoff integrity after correction failed'; END IF;
 SELECT count(*) INTO n FROM exam_subjects
 WHERE school_id=1 AND exam_id=9 AND class_name='Eight' AND section='Blue'
 AND is_active=true AND total_marks>0 AND approval_status='pending'
 AND approved_at IS NULL AND approved_by_user_id IS NULL;
 IF n<>6 THEN RAISE EXCEPTION 'Expected exactly six pending scored papers, saw %',n; END IF;
 SELECT count(*) INTO n FROM exam_results WHERE school_id=1 AND exam_id=9
 AND student_id IN (SELECT student_id FROM school_class_promotion_source_roster WHERE plan_id=1);
 IF n<>66 THEN RAISE EXCEPTION 'Marks changed unexpectedly: %',n; END IF;
 SELECT count(*) INTO n FROM students WHERE school_id=1 AND class='Eight' AND section='Blue'
 AND is_active=true;
 IF n<>11 THEN RAISE EXCEPTION 'Students moved prematurely: %',n; END IF;
END $after$;
COMMIT;
