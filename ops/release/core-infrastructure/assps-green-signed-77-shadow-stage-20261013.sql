-- SAFE shadow stage: extend signed Mark policies to NEW green runtime only.
-- Legacy apex_app_runtime remains excluded and unchanged. No active backend service points at green.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '1200ms';
SET LOCAL statement_timeout = '50000ms';
DO $pre$
DECLARE n integer;
BEGIN
 IF current_user <> 'postgres' OR NOT (
 (current_database()='assps_core_green77_qa_20261013' AND current_setting('port')='55432')
 OR (current_database()='apexos' AND current_setting('port')='5432'))
 THEN RAISE EXCEPTION 'UNAUTHORIZED_SIGNED_SHADOW_TARGET'; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='assps_core_green_runtime')
 THEN RAISE EXCEPTION 'GREEN_ROLE_ALREADY_EXISTS'; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN ('apex_app_runtime','assps_marks_signed_runtime')
 AND (rolcanlogin OR rolbypassrls OR rolsuper)) THEN RAISE EXCEPTION 'LEGACY_RUNTIME_UNSAFE'; END IF;
 SELECT count(*) INTO n FROM pg_policies WHERE schemaname='public' AND policyname='core_signed_tenant_guard'
 AND permissive='RESTRICTIVE' AND 'assps_marks_signed_runtime'=ANY(roles)
 AND NOT 'apex_app_runtime'=ANY(roles) AND coalesce(qual,'')=coalesce(with_check,'')
 AND qual IN ('core_security.signed_school_allowed(id)', 'core_security.signed_school_allowed(school_id)',
 'core_security.signed_tenant_key_allowed((tenant_id)::text)');
 IF n<>77 THEN RAISE EXCEPTION 'MARKS_SIGNED_77_PRECONDITION_FAILED: %',n; END IF;
 SELECT count(*) INTO n FROM pg_policies WHERE schemaname='public' AND policyname='core_signed_tenant_guard'
 AND qual IN ('core_security.signed_school_allowed(id)','core_security.signed_school_allowed(school_id)');
 IF n<>73 THEN RAISE EXCEPTION 'SIGNED_SCHOOL_COUNT_CHANGED'; END IF;
 SELECT count(*) INTO n FROM pg_policies WHERE schemaname='public' AND policyname='core_signed_tenant_guard'
 AND qual='core_security.signed_tenant_key_allowed((tenant_id)::text)';
 IF n<>4 THEN RAISE EXCEPTION 'SIGNED_TENANT_COUNT_CHANGED'; END IF;
 IF has_table_privilege('apex_app_runtime','public.paper_documents','SELECT') OR
    has_table_privilege('apex_app_runtime','public.paper_revisions','SELECT')
 THEN RAISE EXCEPTION 'EXISTING_PAPER_BOUNDARY_UNSAFE'; END IF;
END $pre$;
CREATE ROLE assps_core_green_runtime NOLOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT apex_app_runtime TO assps_core_green_runtime WITH INHERIT TRUE, SET FALSE;
GRANT USAGE ON SCHEMA core_security TO assps_core_green_runtime;
GRANT EXECUTE ON FUNCTION core_security.signed_school_allowed(integer),
 core_security.signed_tenant_key_allowed(text) TO assps_core_green_runtime;
DO $apply$
DECLARE r record;
BEGIN
 FOR r IN SELECT tablename FROM pg_policies WHERE schemaname='public'
 AND policyname='core_signed_tenant_guard' ORDER BY tablename LOOP
 EXECUTE format('ALTER POLICY core_signed_tenant_guard ON public.%I TO assps_marks_signed_runtime, assps_core_green_runtime',r.tablename);
 END LOOP;
END $apply$;
DO $verify$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM pg_policies WHERE schemaname='public' AND policyname='core_signed_tenant_guard'
 AND permissive='RESTRICTIVE' AND 'assps_marks_signed_runtime'=ANY(roles)
 AND 'assps_core_green_runtime'=ANY(roles) AND coalesce(qual,'')=coalesce(with_check,'');
 IF n<>77 THEN RAISE EXCEPTION 'GREEN_SIGNED_77_NOT_PRESENT'; END IF;
 SELECT count(*) INTO n FROM pg_policies WHERE schemaname='public' AND policyname='core_signed_tenant_guard'
 AND 'apex_app_runtime'=ANY(roles);
 IF n<>0 THEN RAISE EXCEPTION 'ACTIVE_LEGACY_APP_GUARDS_CHANGED'; END IF;
 IF NOT pg_has_role('assps_core_green_runtime','apex_app_runtime','MEMBER') OR
 NOT has_schema_privilege('assps_core_green_runtime','core_security','USAGE') OR
 NOT has_function_privilege('assps_core_green_runtime','core_security.signed_school_allowed(integer)','EXECUTE')
 THEN RAISE EXCEPTION 'GREEN_LEAST_PRIVILEGE_CHAIN_MISSING'; END IF;
 IF has_table_privilege('assps_core_green_runtime','public.paper_documents','SELECT') OR
 has_table_privilege('assps_core_green_runtime','public.paper_revisions','SELECT')
 THEN RAISE EXCEPTION 'PAPER_ROLE_LEAKAGE'; END IF;
END $verify$;
COMMIT;
