-- ASSPS First Term retention guard — CANDIDATE ONLY. Never run on production without exact reviewed migration gate.
-- Protects completed historical examination IDs 8 and 9, and forbids exam_results TRUNCATE.
-- Distinct future exam IDs remain writable. Deliberately fail closed if already installed.
BEGIN;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.exam_results'::regclass AND tgname='assps_completed_exam_write_fence_20261019' AND NOT tgisinternal)
  OR EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.exams'::regclass AND tgname='assps_completed_exam_meta_fence_20261019' AND NOT tgisinternal)
  OR EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.exam_results'::regclass AND tgname='assps_exam_results_no_truncate_20261019' AND NOT tgisinternal)
  THEN
    RAISE EXCEPTION 'HOLD: HISTORICAL_FENCE_ALREADY_PRESENT';
  END IF;
END
$$;
CREATE FUNCTION public.assps_completed_exam_rows_guard_20261019() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public
AS $$
DECLARE old_id integer;
DECLARE new_id integer;
BEGIN
  IF TG_TABLE_NAME = 'exam_results' THEN
    IF TG_OP IN ('UPDATE','DELETE') THEN old_id := OLD.exam_id; END IF;
    IF TG_OP IN ('UPDATE','INSERT') THEN new_id := NEW.exam_id; END IF;
  ELSIF TG_TABLE_NAME = 'exams' THEN
    IF TG_OP IN ('UPDATE','DELETE') THEN old_id := OLD.id; END IF;
    IF TG_OP IN ('UPDATE','INSERT') THEN new_id := NEW.id; END IF;
  ELSE
    RAISE EXCEPTION 'HOLD: UNKNOWN_HISTORICAL_TABLE';
  END IF;
  IF old_id IN (8,9) OR new_id IN (8,9) THEN
    RAISE EXCEPTION 'ASSPS_IMMUTABLE_COMPLETED_EXAM: blocked operation on completed historical exam ID'
      USING ERRCODE='P0001';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER assps_completed_exam_write_fence_20261019
BEFORE INSERT OR UPDATE OR DELETE ON public.exam_results
FOR EACH ROW EXECUTE FUNCTION public.assps_completed_exam_rows_guard_20261019();

CREATE TRIGGER assps_completed_exam_meta_fence_20261019
BEFORE INSERT OR UPDATE OR DELETE ON public.exams
FOR EACH ROW EXECUTE FUNCTION public.assps_completed_exam_rows_guard_20261019();

CREATE FUNCTION public.assps_exam_results_truncate_deny_20261019() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public
AS $$
BEGIN
  RAISE EXCEPTION 'ASSPS_IMMUTABLE_EXAM_RESULTS: TRUNCATE is forbidden'
    USING ERRCODE='P0001';
END
$$;

CREATE TRIGGER assps_exam_results_no_truncate_20261019
BEFORE TRUNCATE ON public.exam_results
FOR EACH STATEMENT EXECUTE FUNCTION public.assps_exam_results_truncate_deny_20261019();
COMMIT;
