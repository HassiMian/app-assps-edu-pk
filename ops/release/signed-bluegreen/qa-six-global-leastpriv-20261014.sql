\set ON_ERROR_STOP on
-- QA-ONLY! This implementation is deliberately hard-bound to a disposable PG
-- port, and MUST NEVER be adapted to live by removing this target guard alone.
-- The real Core release requires separately reviewed worker contracts and receipts.
BEGIN;
DO $preflight$
DECLARE n integer;
BEGIN
  IF current_user <> 'postgres'
     OR current_database() <> 'apexos'
     OR current_setting('port') <> '55477'
  THEN RAISE EXCEPTION 'QA-ONLY: refusing to change live PostgreSQL'; END IF;
  SELECT count(*) INTO n FROM pg_auth_members a
    JOIN pg_roles m ON m.oid=a.member JOIN pg_roles p ON p.oid=a.roleid
    WHERE m.rolname='assps_core_green_runtime'
      AND p.rolname='apex_app_runtime' AND a.inherit_option AND NOT a.set_option;
  IF n <> 1 THEN RAISE EXCEPTION 'Unexpected Green parent role membership'; END IF;
  SELECT count(DISTINCT tablename) INTO n FROM pg_policies
   WHERE schemaname='public' AND policyname='core_signed_tenant_guard';
  IF n <> 77 THEN RAISE EXCEPTION 'Signed tenant guard drift'; END IF;
  SELECT count(*) INTO n FROM pg_class c
    WHERE c.relnamespace='public'::regnamespace
    AND c.relname IN ('admin_block_audit_log','ai_jobs','ai_queue_events',
      'ai_queue_state','campuses','organizations')
    AND c.relkind='r' AND NOT c.relrowsecurity AND NOT c.relforcerowsecurity;
  IF n <> 6 THEN RAISE EXCEPTION 'Six global tables changed; require new contract audit'; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN
    ('assps_core_qa_ai_worker','assps_core_qa_directory_reader','assps_core_qa_audit_writer'))
  THEN RAISE EXCEPTION 'QA roles already exist: refusing non-idempotent replay'; END IF;
END $preflight$;

-- Positive permissions for RLS/FORCE-protected tables are granted DIRECTLY
-- to the green tenant runtime before its inherited parent can be removed.
DO $scoped$
DECLARE r record; privileges text; seq record;
BEGIN
 FOR r IN
   SELECT c.oid::regclass AS target, c.oid
     FROM pg_class c JOIN pg_policies p
       ON p.schemaname='public' AND p.tablename=c.relname
     WHERE c.relnamespace='public'::regnamespace
       AND p.policyname='core_signed_tenant_guard'
       AND c.relkind='r' AND c.relrowsecurity AND c.relforcerowsecurity
 LOOP
   SELECT string_agg(privilege, ',') INTO privileges FROM (
    SELECT unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE']) privilege
   ) x WHERE has_table_privilege('apex_app_runtime',r.oid,privilege);
   IF privileges IS NOT NULL THEN
      EXECUTE format('GRANT %s ON TABLE %s TO assps_core_green_runtime',privileges,r.target);
   END IF;
 END LOOP;
 -- Sequence grants for sequence objects OWNED BY signed-protected tables only;
 -- omit unprotected global queue/admin sequences.
 FOR seq IN
   SELECT DISTINCT s.oid::regclass AS target,s.oid
   FROM pg_class s JOIN pg_depend d ON d.objid=s.oid AND d.deptype IN ('a','i')
   JOIN pg_class t ON t.oid=d.refobjid
   JOIN pg_policies p ON p.schemaname='public' AND p.tablename=t.relname
   WHERE s.relkind='S' AND t.relnamespace='public'::regnamespace
      AND p.policyname='core_signed_tenant_guard'
 LOOP
   IF has_sequence_privilege('apex_app_runtime',seq.oid,'USAGE') THEN
     EXECUTE format('GRANT USAGE ON SEQUENCE %s TO assps_core_green_runtime',seq.target);
   END IF;
   IF has_sequence_privilege('apex_app_runtime',seq.oid,'SELECT') THEN
     EXECUTE format('GRANT SELECT ON SEQUENCE %s TO assps_core_green_runtime',seq.target);
   END IF;
 END LOOP;
END $scoped$;

-- This is the CRITICAL fix: revoke the INHERITED GRANT, not a shadow
-- REVOKE on six tables (which would remain inherited from the parent).
REVOKE apex_app_runtime FROM assps_core_green_runtime;

-- Separate NOLOGIN service principals. They cannot be activated or inherited
-- by the tenant-facing signed runtime. Production worker credentials MUST be
-- independently provisioned later, after real service integration.
CREATE ROLE assps_core_qa_ai_worker NOLOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT;
CREATE ROLE assps_core_qa_directory_reader NOLOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT;
CREATE ROLE assps_core_qa_audit_writer NOLOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT;

GRANT USAGE ON SCHEMA public TO assps_core_qa_ai_worker,
  assps_core_qa_directory_reader,assps_core_qa_audit_writer;

GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.ai_jobs TO assps_core_qa_ai_worker;
GRANT SELECT,INSERT,DELETE ON TABLE public.ai_queue_events TO assps_core_qa_ai_worker;
GRANT SELECT,INSERT,UPDATE ON TABLE public.ai_queue_state TO assps_core_qa_ai_worker;
GRANT SELECT ON TABLE public.organizations,public.campuses
  TO assps_core_qa_directory_reader;
GRANT INSERT ON TABLE public.admin_block_audit_log TO assps_core_qa_audit_writer;

DO $sequences$
DECLARE r record;
BEGIN
 FOR r IN SELECT DISTINCT s.oid::regclass AS target, t.relname AS table_name
    FROM pg_class s JOIN pg_depend d ON d.objid=s.oid AND d.deptype IN ('a','i')
      JOIN pg_class t ON t.oid=d.refobjid
    WHERE s.relkind='S' AND t.relnamespace='public'::regnamespace
     AND t.relname IN ('ai_jobs','ai_queue_events','ai_queue_state','admin_block_audit_log')
 LOOP
    IF r.table_name='admin_block_audit_log' THEN
      EXECUTE format('GRANT USAGE ON SEQUENCE %s TO assps_core_qa_audit_writer',r.target);
    ELSE
      EXECUTE format('GRANT USAGE ON SEQUENCE %s TO assps_core_qa_ai_worker',r.target);
    END IF;
 END LOOP;
END $sequences$;

DO $assertions$
DECLARE n integer; r record;
BEGIN
 FOR r IN SELECT c.oid FROM pg_class c WHERE c.relnamespace='public'::regnamespace
   AND c.relname IN ('admin_block_audit_log','ai_jobs','ai_queue_events',
        'ai_queue_state','campuses','organizations')
 LOOP
   IF has_table_privilege('assps_core_green_runtime',r.oid,'SELECT')
    OR has_table_privilege('assps_core_green_runtime',r.oid,'INSERT')
    OR has_table_privilege('assps_core_green_runtime',r.oid,'UPDATE')
    OR has_table_privilege('assps_core_green_runtime',r.oid,'DELETE')
   THEN RAISE EXCEPTION 'Green runtime retains six-global-table access'; END IF;
 END LOOP;
 SELECT count(*) INTO n FROM pg_auth_members a
 JOIN pg_roles m ON a.member=m.oid JOIN pg_roles p ON a.roleid=p.oid
 WHERE m.rolname IN ('assps_core_green_runtime','assps_core_green_login')
   AND p.rolname LIKE 'assps_core_qa_%';
 IF n > 0 THEN RAISE EXCEPTION 'Tenant signed runtime inherited QA global worker'; END IF;
END $assertions$;
COMMIT;
