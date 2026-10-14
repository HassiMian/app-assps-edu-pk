-- Class8/Blue protected future promotion: forbid premature movement to Pre-Nine
-- and forbid Grade Eight -> Nine direct bypass. Applies only to School1 cohort.
BEGIN;
SET LOCAL lock_timeout='2500ms';
SET LOCAL statement_timeout='30000ms';
DO $guard$
BEGIN
 IF current_database() NOT IN ('apexos','assps_timetable_9staff_qa_20261014')
 OR current_user<>'postgres'
 OR (SELECT count(*) FROM school_class_promotion_plans
     WHERE school_id=1 AND exam_id=9
       AND source_class='Eight' AND source_section='Blue'
       AND status='AWAITING_RESULTS_AND_PRINT'
       AND print_verified_at IS NULL)<>1
 OR (SELECT count(*) FROM pg_trigger WHERE tgname='assps_class8_print_gate_20261014')<>0
 THEN RAISE EXCEPTION 'PREMATURE_PROMOTION_GUARD_PRECONDITION_FAILED'; END IF;
END $guard$;
CREATE FUNCTION public.assps_class8_print_gate_20261014()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=pg_catalog,public
AS $guard$
DECLARE policy public.school_class_promotion_plans%ROWTYPE;
DECLARE normalized_target text;
BEGIN
 IF OLD.school_id<>1 OR OLD.class<>'Eight' OR OLD.section<>'Blue' THEN
  RETURN NEW;
 END IF;
 IF NEW.school_id IS DISTINCT FROM OLD.school_id THEN
  RAISE EXCEPTION 'CLASS_EIGHT_SCHOOL_SCOPE_CANNOT_CHANGE' USING ERRCODE='23514';
 END IF;
 IF NEW.class IS NOT DISTINCT FROM OLD.class THEN RETURN NEW; END IF;
 normalized_target:=regexp_replace(lower(coalesce(NEW.class,'')),'[^a-z0-9]','','g');
 IF normalized_target='nine' OR normalized_target='9' THEN
  RAISE EXCEPTION 'CLASS_EIGHT_DIRECT_TO_NINE_NOT_ALLOWED_USE_PRE_NINE'
   USING ERRCODE='23514';
 END IF;
 IF normalized_target NOT IN ('prenine','pre9','preix') THEN
  RETURN NEW;
 END IF;
 SELECT * INTO policy FROM public.school_class_promotion_plans
  WHERE school_id=OLD.school_id AND exam_id=9
    AND source_class='Eight' AND source_section='Blue'
  FOR SHARE;
 IF NOT FOUND OR policy.status<>'READY_FOR_APPROVED_PROMOTION'
    OR policy.print_verified_at IS NULL
    OR policy.print_verified_by_user_id IS NULL
    OR policy.result_snapshot_sha256 IS NULL
    OR policy.academic_approved_at IS NULL
    OR policy.academic_approved_by_user_id IS NULL
    OR policy.destination_section IS NULL
    OR NEW.section IS DISTINCT FROM policy.destination_section
 THEN
  RAISE EXCEPTION 'CLASS_EIGHT_PRE_NINE_WAIT_FOR_PRINT_AND_ACADEMIC_REVIEW'
   USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $guard$;
REVOKE ALL ON FUNCTION public.assps_class8_print_gate_20261014() FROM PUBLIC;
CREATE TRIGGER assps_class8_print_gate_20261014
 BEFORE UPDATE OF class ON public.students
 FOR EACH ROW EXECUTE FUNCTION public.assps_class8_print_gate_20261014();
DO $post$
BEGIN
 IF (SELECT count(*) FROM pg_trigger WHERE tgname='assps_class8_print_gate_20261014'
    AND NOT tgisinternal)<>1
 OR (SELECT count(*) FROM students WHERE school_id=1 AND class='Eight'
    AND section='Blue' AND is_active)<>11 THEN
  RAISE EXCEPTION 'PREMATURE_PROMOTION_PROTECTION_NOT_INSTALLED'; END IF;
END $post$;
COMMIT;
