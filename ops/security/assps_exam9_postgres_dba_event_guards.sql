-- App login must NEVER be owner/member/CREATE-grantee of this namespace.
CREATE SCHEMA IF NOT EXISTS assps_immutable_guardian AUTHORIZATION postgres;
REVOKE ALL ON SCHEMA assps_immutable_guardian FROM PUBLIC;
-- Candidate only. Apply under trusted DBA after strict preflight, always transactionally.
-- Does not rewrite any student score or create an academic revision ledger.
CREATE OR REPLACE FUNCTION assps_immutable_guardian.assps_exam9_protected_ddl_end_20261023()
RETURNS event_trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, assps_immutable_guardian AS $guard$
DECLARE
  protected_results oid;
  protected_exams oid;
  affected record;
  intact_count integer;
BEGIN
  protected_results := to_regclass('public.exam_results')::oid;
  protected_exams := to_regclass('public.exams')::oid;
  IF protected_results IS NULL OR protected_exams IS NULL THEN
    RAISE EXCEPTION 'EXAM9_PROTECTED_DDL_GUARD: protected tables must exist'
      USING ERRCODE = 'check_violation';
  END IF;
  FOR affected IN SELECT object_type, objid, command_tag, object_identity
                  FROM pg_event_trigger_ddl_commands()
  LOOP
    IF affected.objid IN (protected_results, protected_exams)
       OR (affected.object_identity LIKE '%public.exam_results%'
           AND affected.command_tag NOT IN ('COMMENT'))
       OR (affected.object_identity LIKE '%public.exams%'
           AND affected.command_tag NOT IN ('COMMENT'))
    THEN
      RAISE EXCEPTION 'EXAM9_PROTECTED_DDL_GUARD: protected table/schema definition is DBA-only'
        USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;
  SELECT count(*) INTO intact_count
  FROM pg_trigger
  WHERE (tgrelid=protected_results AND tgname IN
          ('assps_firstterm_exam9_results_guard','assps_firstterm_exam9_results_truncate_guard'))
     OR (tgrelid=protected_exams AND tgname IN
          ('assps_firstterm_exam9_exam_guard','assps_firstterm_exam9_exams_truncate_guard'));
  IF intact_count != 4 OR EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE ((tgrelid=protected_results AND tgname IN
          ('assps_firstterm_exam9_results_guard','assps_firstterm_exam9_results_truncate_guard'))
       OR (tgrelid=protected_exams AND tgname IN
          ('assps_firstterm_exam9_exam_guard','assps_firstterm_exam9_exams_truncate_guard')))
       AND tgenabled NOT IN ('O','A')
  ) THEN
    RAISE EXCEPTION 'EXAM9_PROTECTED_DDL_GUARD: original immutable triggers invalid'
      USING ERRCODE = 'check_violation';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE oid=protected_results AND relforcerowsecurity) OR
     NOT EXISTS (SELECT 1 FROM pg_class WHERE oid=protected_exams AND relforcerowsecurity)
  THEN
    RAISE EXCEPTION 'EXAM9_PROTECTED_DDL_GUARD: FORCE RLS required'
      USING ERRCODE = 'check_violation';
  END IF;
END
$guard$;
CREATE EVENT TRIGGER assps_exam9_protected_ddl_end_20261023
  ON ddl_command_end EXECUTE FUNCTION assps_immutable_guardian.assps_exam9_protected_ddl_end_20261023();

CREATE OR REPLACE FUNCTION assps_immutable_guardian.assps_exam9_protected_drop_20261023()
RETURNS event_trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, assps_immutable_guardian AS $guard$
DECLARE dropped record;
BEGIN
  FOR dropped IN SELECT object_type, object_identity FROM pg_event_trigger_dropped_objects()
  LOOP
    IF (dropped.object_type='schema' AND dropped.object_identity='public')
       OR dropped.object_identity LIKE '%public.exam_results%'
       OR dropped.object_identity LIKE '%public.exams%'
       OR (dropped.object_type='table' AND dropped.object_identity IN
         ('public.exam_results','public.exams'))
    THEN
      RAISE EXCEPTION 'EXAM9_PROTECTED_DDL_GUARD: protected object drop denied'
        USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;
END
$guard$;
CREATE EVENT TRIGGER assps_exam9_protected_drop_20261023
  ON sql_drop EXECUTE FUNCTION assps_immutable_guardian.assps_exam9_protected_drop_20261023();
