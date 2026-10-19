-- One-way non-destructive data protection for CLOSED School1 First Term 2026-27.
-- School2 Exam8 is a separate DEMO monthly test and is deliberately NOT locked.
-- Requires reviewed snapshots and verified rollback; never delete/reset data.
BEGIN;
SET LOCAL lock_timeout = '6s';
SET LOCAL statement_timeout = '25s';
SELECT pg_advisory_xact_lock(20261019,9);
DO $safety$
DECLARE
  exam_name text;
  exam_school integer;
  exam_session text;
  row_count bigint;
  zeros bigint;
  null_marks bigint;
  wrong_school bigint;
  existing_guards bigint;
BEGIN
  SELECT school_id,name,session INTO exam_school,exam_name,exam_session
  FROM public.exams WHERE id=9;
  IF exam_school IS DISTINCT FROM 1 OR exam_name IS DISTINCT FROM 'First Term Exam'
     OR exam_session IS DISTINCT FROM '2026-2027' THEN
    RAISE EXCEPTION 'FIRST_TERM_HOLD: unexpected exam9 metadata';
  END IF;
  SELECT count(*),count(*) FILTER (WHERE marks_obtained=0),
         count(*) FILTER (WHERE marks_obtained IS NULL),
         count(*) FILTER (WHERE school_id IS DISTINCT FROM 1)
  INTO row_count,zeros,null_marks,wrong_school
  FROM public.exam_results WHERE exam_id=9;
  IF row_count<>1853 OR zeros<>224 OR null_marks<>0 OR wrong_school<>0 THEN
    RAISE EXCEPTION 'FIRST_TERM_HOLD: unexpected historical result baseline';
  END IF;
  SELECT count(*) INTO existing_guards
  FROM pg_trigger WHERE tgname LIKE 'assps_firstterm_exam9_%'
    AND tgrelid IN ('public.exams'::regclass,'public.exam_results'::regclass)
    AND NOT tgisinternal;
  IF existing_guards<>0 THEN
    RAISE EXCEPTION 'FIRST_TERM_HOLD: historical guard already present';
  END IF;
END $safety$;
CREATE FUNCTION public.assps_firstterm_exam9_immutability_20261019()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $guard$
BEGIN
  IF TG_OP = 'TRUNCATE' THEN
    RAISE EXCEPTION 'FIRST_TERM_IMMUTABLE: bulk truncate refused'
      USING ERRCODE = 'check_violation';
  END IF;
  IF TG_TABLE_NAME='exam_results' THEN
    IF (TG_OP IN ('UPDATE','DELETE') AND OLD.exam_id=9)
       OR (TG_OP IN ('UPDATE','INSERT') AND NEW.exam_id=9) THEN
      RAISE EXCEPTION 'FIRST_TERM_IMMUTABLE: Exam 9 historical results are closed'
        USING ERRCODE = 'check_violation';
    END IF;
  ELSIF TG_TABLE_NAME='exams' THEN
    IF (TG_OP IN ('UPDATE','DELETE') AND OLD.id=9)
       OR (TG_OP IN ('UPDATE','INSERT') AND NEW.id=9) THEN
      RAISE EXCEPTION 'FIRST_TERM_IMMUTABLE: Exam 9 historical metadata are closed'
        USING ERRCODE = 'check_violation';
    END IF;
  ELSE
    RAISE EXCEPTION 'FIRST_TERM_HOLD: guard attached to unexpected table';
  END IF;
  RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $guard$;
REVOKE ALL ON FUNCTION public.assps_firstterm_exam9_immutability_20261019() FROM PUBLIC;
CREATE TRIGGER assps_firstterm_exam9_results_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.exam_results
  FOR EACH ROW
  EXECUTE FUNCTION public.assps_firstterm_exam9_immutability_20261019();
CREATE TRIGGER assps_firstterm_exam9_exam_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.exams
  FOR EACH ROW
  EXECUTE FUNCTION public.assps_firstterm_exam9_immutability_20261019();
CREATE TRIGGER assps_firstterm_exam9_results_truncate_guard
  BEFORE TRUNCATE ON public.exam_results
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.assps_firstterm_exam9_immutability_20261019();
CREATE TRIGGER assps_firstterm_exam9_exams_truncate_guard
  BEFORE TRUNCATE ON public.exams
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.assps_firstterm_exam9_immutability_20261019();
DO $attest$
BEGIN
 IF (SELECT count(*) FROM pg_trigger
     WHERE tgname LIKE 'assps_firstterm_exam9_%'
       AND tgrelid IN ('public.exams'::regclass,'public.exam_results'::regclass)
       AND tgenabled='O' AND NOT tgisinternal)<>4 THEN
   RAISE EXCEPTION 'FIRST_TERM_HOLD: guard trigger catalog incomplete';
 END IF;
END $attest$;
COMMIT;
