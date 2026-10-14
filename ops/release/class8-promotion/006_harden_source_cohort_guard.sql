-- ASSPS Oct14 security hardening: Class Eight Blue cannot escape protected
-- cohort via section laundering, alternate classes, or school-id modification.
-- Existing examination records, timetable, attendance, payments remain unchanged.
BEGIN;
SET LOCAL lock_timeout='2500ms';
SET LOCAL statement_timeout='30000ms';
DO $guard$
DECLARE ddl text;
BEGIN
 IF current_user<>'postgres'
 OR current_database() NOT IN ('apexos','assps_timetable_9staff_qa_20261014')
 OR (SELECT count(*) FROM public.school_class_promotion_plans
     WHERE school_id=1 AND exam_id=9
       AND source_class='Eight' AND source_section='Blue'
       AND status='AWAITING_RESULTS_AND_PRINT'
       AND print_verified_at IS NULL
       AND academic_approved_at IS NULL
       AND executed_at IS NULL)<>1
 OR (SELECT count(*) FROM public.students WHERE school_id=1
     AND class='Eight' AND section='Blue' AND is_active)<>11
 OR (SELECT count(*) FROM public.students WHERE school_id=1 AND class='Pre-Nine')<>0
 OR (SELECT count(*) FROM public.exam_results WHERE school_id=1 AND exam_id=9)<1588
 OR (SELECT count(*) FROM pg_trigger
     WHERE tgname='assps_class8_print_gate_20261014' AND NOT tgisinternal)<>1
 THEN RAISE EXCEPTION 'CLASS8_HARDENING_BASELINE_OR_OPERATOR_CHANGED'; END IF;
 SELECT pg_get_triggerdef(oid) INTO ddl
 FROM pg_trigger WHERE tgname='assps_class8_print_gate_20261014' AND NOT tgisinternal;
 IF position('BEFORE UPDATE OF class ON public.students' in ddl)=0
 THEN RAISE EXCEPTION 'CLASS8_EXISTING_TRIGGER_ALREADY_MODIFIED'; END IF;
END $guard$;

CREATE OR REPLACE FUNCTION public.assps_class8_print_gate_20261014()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=pg_catalog,public
AS $gate$
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
 IF NEW.class IS DISTINCT FROM 'Pre-Nine'
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
END $gate$;
REVOKE ALL ON FUNCTION public.assps_class8_print_gate_20261014() FROM PUBLIC;
DROP TRIGGER assps_class8_print_gate_20261014 ON public.students;
CREATE TRIGGER assps_class8_print_gate_20261014
 BEFORE UPDATE OF class,section,school_id ON public.students
 FOR EACH ROW EXECUTE FUNCTION public.assps_class8_print_gate_20261014();
DO $post$
DECLARE ddl text;
BEGIN
 SELECT pg_get_triggerdef(oid) INTO ddl FROM pg_trigger
 WHERE tgname='assps_class8_print_gate_20261014' AND NOT tgisinternal;
 IF position('BEFORE UPDATE OF class, section, school_id ON public.students' in ddl)=0
 OR (SELECT count(*) FROM public.students WHERE school_id=1 AND class='Eight'
     AND section='Blue' AND is_active)<>11
 OR (SELECT count(*) FROM public.school_class_promotion_plans WHERE school_id=1
     AND status='AWAITING_RESULTS_AND_PRINT')<>1
 THEN RAISE EXCEPTION 'CLASS_EIGHT_HARDENED_TRIGGER_POSTCONDITION_FAILED'; END IF;
END $post$;
COMMIT;
