\set ON_ERROR_STOP on
-- Read-only catalog gate. Never execute against a production database.
BEGIN READ ONLY;
DO $rls$
DECLARE t record; cnt integer := 0; school_cnt integer := 0; tenant_cnt integer := 0;
BEGIN
 IF current_database() <> 'assps_core_rls_clone_20261008' THEN
   RAISE EXCEPTION 'CLONE_ONLY: refusal on %', current_database();
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='apex_app_runtime' AND NOT rolsuper AND NOT rolbypassrls AND NOT rolcanlogin) THEN
   RAISE EXCEPTION 'RUNTIME_ROLE_PRIVILEGE_FAILURE';
 END IF;
 FOR t IN
   SELECT c.oid,c.relname,c.relrowsecurity,c.relforcerowsecurity,
     EXISTS(SELECT 1 FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attname='school_id' AND NOT a.attisdropped) AS has_school
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relkind IN ('r','p') AND c.relrowsecurity
   ORDER BY c.relname
 LOOP
   cnt:=cnt+1;
   IF NOT t.relforcerowsecurity THEN RAISE EXCEPTION 'RLS_NOT_FORCED:%',t.relname; END IF;
   IF t.has_school OR t.relname='schools' THEN
     school_cnt:=school_cnt+1;
     IF (SELECT count(*) FROM pg_policies p WHERE p.schemaname='public' AND p.tablename=t.relname AND p.policyname IN ('app_runtime_school_access','app_runtime_school_guard') AND 'apex_app_runtime'=ANY(p.roles) AND ((p.policyname='app_runtime_school_access' AND p.permissive='PERMISSIVE') OR (p.policyname='app_runtime_school_guard' AND p.permissive='RESTRICTIVE'))) <> 2 THEN
       RAISE EXCEPTION 'SCHOOL_POLICY_PAIR_FAILURE:%',t.relname;
     END IF;
   ELSE
     tenant_cnt:=tenant_cnt+1;
     IF (SELECT count(*) FROM pg_policies p WHERE p.schemaname='public' AND p.tablename=t.relname AND p.policyname IN ('app_runtime_tenant_access','app_runtime_tenant_guard') AND 'apex_app_runtime'=ANY(p.roles) AND ((p.policyname='app_runtime_tenant_access' AND p.permissive='PERMISSIVE') OR (p.policyname='app_runtime_tenant_guard' AND p.permissive='RESTRICTIVE'))) <> 2 THEN
       RAISE EXCEPTION 'TENANT_POLICY_PAIR_FAILURE:%',t.relname;
     END IF;
   END IF;
 END LOOP;
 IF cnt<>77 OR school_cnt<>73 OR tenant_cnt<>4 THEN
   RAISE EXCEPTION 'RLS_COVERAGE_CHANGED protected=% school=% tenant=%',cnt,school_cnt,tenant_cnt;
 END IF;
 RAISE NOTICE 'EFFECTIVE_RLS_CLONE_POLICY_MATRIX_PASS protected=% school=% tenant=%',cnt,school_cnt,tenant_cnt;
END $rls$;
ROLLBACK;
