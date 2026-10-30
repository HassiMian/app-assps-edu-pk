BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='25s';
DO $repair$
DECLARE
  item text;
  present boolean;
  has_school boolean;
BEGIN
  FOREACH item IN ARRAY ARRAY[
    'grade910_human_signoff_evidence',
    'grade910_personal_signature_assets',
    'grade910_supporting_evidence_objects',
    'grade910_verified_paper_publications',
    'school_academic_approval_events',
    'school_document_events',
    'school_document_revisions',
    'school_documents'
  ] LOOP
    SELECT c.relforcerowsecurity AND c.relrowsecurity
    INTO present
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname=item AND c.relkind='r';
    IF present IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'Cannot repair %: not an enabled, FORCE-RLS public table',item;
    END IF;
    SELECT EXISTS(SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=item AND column_name='school_id')
    INTO has_school;
    IF NOT has_school THEN RAISE EXCEPTION 'Cannot repair %: school_id is missing',item; END IF;
    IF EXISTS(SELECT 1 FROM pg_policies
        WHERE schemaname='public' AND tablename=item AND policyname='core_signed_tenant_guard') THEN
      RAISE EXCEPTION 'Refuse to overwrite existing policy on %', item;
    END IF;
    EXECUTE format(
      'CREATE POLICY core_signed_tenant_guard ON public.%I AS RESTRICTIVE FOR ALL
        TO assps_core_green_runtime, assps_marks_signed_runtime
        USING (core_security.signed_school_allowed(school_id))
        WITH CHECK (core_security.signed_school_allowed(school_id))',item);
  END LOOP;
END
$repair$;
DO $assert$
DECLARE cnt record;
BEGIN
 SELECT count(*)::int AS forced,
        count(*) FILTER (WHERE c.relrowsecurity)::int AS enabled,
        count(*) FILTER (WHERE p.policyname IS NOT NULL)::int AS signed
 INTO cnt
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 LEFT JOIN pg_policies p ON p.schemaname=n.nspname AND p.tablename=c.relname
  AND p.policyname='core_signed_tenant_guard' AND p.permissive='RESTRICTIVE'
  AND 'assps_marks_signed_runtime'::name=ANY(p.roles)
 WHERE n.nspname='public' AND c.relkind='r' AND c.relforcerowsecurity
   AND c.relname <> 'student_class_movement_audit';
 IF cnt.forced < 77 OR cnt.enabled <> cnt.forced OR cnt.signed <> cnt.forced THEN
   RAISE EXCEPTION 'Signed RLS still incomplete: forced %, enabled %, signed %',
      cnt.forced,cnt.enabled,cnt.signed;
 END IF;
 RAISE NOTICE 'Signed RLS policies complete: forced %, enabled %, signed %',cnt.forced,cnt.enabled,cnt.signed;
END
$assert$;
COMMIT;
