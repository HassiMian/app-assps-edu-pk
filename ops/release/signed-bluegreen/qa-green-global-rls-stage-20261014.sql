-- DISPOSABLE POSTGRESQL QA ONLY. Never apply to live apexos/5432.
-- This isolates green signed runtime from six unscoped global tables while
-- retaining legacy service access in QA for side-by-side contract testing.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$
DECLARE rel text; tab text[] := ARRAY[
 'admin_block_audit_log','ai_jobs','ai_queue_events','ai_queue_state',
 'campuses','organizations'];
BEGIN
 IF current_database() <> 'apexos' OR current_setting('port') <> '55483'
    OR COALESCE(inet_server_addr()::text,'') <> '' THEN
    RAISE EXCEPTION 'DISPOSABLE SOCKET QA PORT 55483 ONLY';
 END IF;
 IF (SELECT count(*) FROM pg_roles WHERE rolname IN
     ('apexos_user','apex_app_runtime','assps_core_green_runtime')) <> 3 THEN
    RAISE EXCEPTION 'APPROVED QA ROLES MISSING';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM pg_auth_members m
   JOIN pg_roles child ON child.oid=m.member
   JOIN pg_roles parent ON parent.oid=m.roleid
   WHERE child.rolname='assps_core_green_runtime'
     AND parent.rolname='apex_app_runtime'
     AND m.inherit_option AND NOT m.set_option
 ) THEN RAISE EXCEPTION 'GREEN ROLE INHERITANCE MISMATCH';END IF;
 FOREACH rel IN ARRAY tab LOOP
   IF NOT EXISTS(
      SELECT 1 FROM pg_class c
      WHERE c.oid=to_regclass(format('public.%I',rel))
        AND c.relkind='r' AND NOT c.relrowsecurity AND NOT c.relforcerowsecurity
     ) THEN RAISE EXCEPTION 'QA % baseline RLS drift',rel;END IF;
   IF EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public'
       AND tablename=rel) THEN RAISE EXCEPTION 'QA % unexpected policies',rel;END IF;
 END LOOP;
END $guard$;
DO $create$
DECLARE rel text;
BEGIN
 FOREACH rel IN ARRAY ARRAY[
   'admin_block_audit_log','ai_jobs','ai_queue_events','ai_queue_state',
   'campuses','organizations'
 ] LOOP
   EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',rel);
   EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY',rel);
   EXECUTE format('CREATE POLICY assps_qa_legacy_global_service_v1 ON public.%I AS PERMISSIVE FOR ALL TO apex_app_runtime,apexos_user USING (true) WITH CHECK (true)',rel);
   EXECUTE format('CREATE POLICY assps_qa_green_unscoped_deny_v1 ON public.%I AS RESTRICTIVE FOR ALL TO assps_core_green_runtime USING (false) WITH CHECK (false)',rel);
 END LOOP;
END $create$;
DO $assert$
DECLARE rel text;
BEGIN
 FOREACH rel IN ARRAY ARRAY['admin_block_audit_log','ai_jobs',
  'ai_queue_events','ai_queue_state','campuses','organizations'] LOOP
  IF NOT EXISTS (SELECT 1 FROM pg_class c
      WHERE c.oid=to_regclass(format('public.%I',rel))
      AND c.relrowsecurity AND c.relforcerowsecurity)
      OR (SELECT count(*) FROM pg_policies WHERE schemaname='public'
      AND tablename=rel AND policyname IN
         ('assps_qa_legacy_global_service_v1','assps_qa_green_unscoped_deny_v1')) <> 2
  THEN RAISE EXCEPTION 'QA signed green table % not protected',rel;END IF;
 END LOOP;
END $assert$;
COMMIT;
