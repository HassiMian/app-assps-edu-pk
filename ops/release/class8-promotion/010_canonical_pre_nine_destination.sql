-- Idempotent only on the source baseline, fail closed for all other states.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $audit$
BEGIN
 IF current_database()<>'apexos'
 OR NOT EXISTS(SELECT 1 FROM public.school_class_promotion_plans
  WHERE id=1 AND school_id=1 AND exam_id=9 AND source_class='Eight'
   AND source_section='Blue' AND destination_class='Pre-Nine'
   AND destination_section IS NULL AND status='AWAITING_RESULTS_AND_PRINT'
   AND print_verified_at IS NULL AND academic_approved_at IS NULL)
 OR (SELECT count(*) FROM public.school_class_promotion_source_roster WHERE school_id=1 AND plan_id=1)<>11
 OR (SELECT count(*) FROM public.students WHERE school_id=1 AND class='Eight' AND section='Blue' AND is_active=true)<>11
 OR (SELECT count(*) FROM public.fee_challans f JOIN public.students s ON s.id=f.student_id WHERE f.school_id=1 AND f.month='November' AND f.year=2026 AND s.class='Eight')<>0
 THEN RAISE EXCEPTION 'CLASS8_CANONICAL_NAME_PREFLIGHT_FAILED'; END IF;
END $audit$;
ALTER TABLE public.school_class_promotion_plans
 DROP CONSTRAINT school_class_promotion_plans_check;
UPDATE public.school_class_promotion_plans
 SET destination_class='Pre Nine',destination_section='Blue'
 WHERE id=1 AND school_id=1 AND exam_id=9
   AND status='AWAITING_RESULTS_AND_PRINT';
ALTER TABLE public.school_class_promotion_plans
 ADD CONSTRAINT school_class_promotion_plans_check
 CHECK (source_class='Eight' AND destination_class='Pre Nine');
CREATE OR REPLACE FUNCTION public.assps_class8_print_gate_20261014()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE policy public.school_class_promotion_plans%ROWTYPE;
DECLARE complete_papers integer;
DECLARE official_offerings integer;
BEGIN
 IF OLD.school_id<>1 OR OLD.class<>'Eight' OR OLD.section<>'Blue' THEN
  RETURN NEW;
 END IF;
 -- This applies to ANY UPDATE involving class, section or school_id,
 -- not only explicitly updating the class field.
 IF NEW.school_id IS DISTINCT FROM OLD.school_id THEN
  RAISE EXCEPTION 'CLASS_EIGHT_SCHOOL_SCOPE_CANNOT_CHANGE'
   USING ERRCODE='23514';
 END IF;
 IF NEW.class IS NOT DISTINCT FROM OLD.class
    AND NEW.section IS NOT DISTINCT FROM OLD.section THEN
  RETURN NEW;
 END IF;
 SELECT * INTO policy FROM public.school_class_promotion_plans
  WHERE school_id=OLD.school_id AND exam_id=9
    AND source_class='Eight' AND source_section='Blue'
  FOR SHARE;
 -- A source section change alone is no longer an escape hatch.
 -- Prior to approved promotion absolutely NO class or section change.
 IF NOT FOUND OR policy.status<>'READY_FOR_APPROVED_PROMOTION'
    OR policy.print_verified_at IS NULL
    OR policy.print_verified_by_user_id IS NULL
    OR policy.result_snapshot_sha256 IS NULL
    OR policy.academic_approved_at IS NULL
    OR policy.academic_approved_by_user_id IS NULL
    OR policy.destination_section IS NULL
 THEN RAISE EXCEPTION 'CLASS_EIGHT_PROMOTION_AWAITS_PRINT_APPROVAL'
   USING ERRCODE='23514'; END IF;
 IF NEW.class IS DISTINCT FROM policy.destination_class
    OR NEW.section IS DISTINCT FROM policy.destination_section
 THEN RAISE EXCEPTION 'CLASS_EIGHT_MUST_ENTER_EXACT_APPROVED_PRE_NINE_SECTION'
   USING ERRCODE='23514'; END IF;
 -- A future accidental READY flag must not override unsigned paper maxima
 -- or incomplete/mismatched score records. 7 exact scheduled papers each.
 SELECT count(*) INTO official_offerings
 FROM public.exam_subjects es
 WHERE es.school_id=OLD.school_id AND es.exam_id=policy.exam_id
   AND es.class_name=policy.source_class AND es.section=policy.source_section
   AND es.is_active=true
   AND es.approval_status='approved'
   AND es.total_marks IS NOT NULL AND es.total_marks>0;
 IF official_offerings<>policy.expected_subject_count THEN
  RAISE EXCEPTION 'CLASS_EIGHT_PAPER_MAXIMA_NOT_FULLY_APPROVED'
   USING ERRCODE='23514'; END IF;
 SELECT count(*) INTO complete_papers
 FROM public.exam_subjects es
 JOIN public.exam_results r ON
    r.school_id=es.school_id AND r.exam_id=es.exam_id
    AND r.student_id=OLD.id
    AND lower(btrim(r.subject))=lower(btrim(es.subject))
    AND r.total_marks=es.total_marks
    AND r.marks_obtained IS NOT NULL
    AND r.marks_obtained>=0 AND r.marks_obtained<=r.total_marks
 WHERE es.school_id=OLD.school_id AND es.exam_id=policy.exam_id
   AND es.class_name=policy.source_class AND es.section=policy.source_section
   AND es.is_active=true;
 IF complete_papers<>policy.expected_subject_count THEN
  RAISE EXCEPTION 'CLASS_EIGHT_STUDENT_MARKS_NOT_COMPLETE_OR_DENOMINATOR_MISMATCH'
   USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $function$;



-- Printed result verification/approval and seven scheduled papers remain mandatory.
DO $verify$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.school_class_promotion_plans
     WHERE id=1 AND destination_class='Pre Nine' AND destination_section='Blue'
      AND status='AWAITING_RESULTS_AND_PRINT' AND print_verified_at IS NULL
      AND academic_approved_at IS NULL)
 THEN RAISE EXCEPTION 'CANONICAL_NAME_APPROVAL_INTEGRITY_FAILED'; END IF;
 IF (SELECT count(*) FROM students WHERE school_id=1 AND class='Eight' AND section='Blue' AND is_active=true)<>11
 THEN RAISE EXCEPTION 'CANONICAL_NAME_MOVED_STUDENTS_UNEXPECTEDLY'; END IF;
END $verify$;
COMMIT;
