-- Unified global-owner/ACL + signed RLS staging test, PG55432 ONLY.
-- The database contains a restored test snapshot; no DML on school records.
-- Production PostgreSQL 5432, live Nginx and Paper worktrees untouched.
BEGIN;
DO $precheck$
DECLARE count_actual integer;
BEGIN
 IF current_database()<>'assps_core_unified_security_recovery_20261013'
 OR current_setting('port')<>'55432' OR current_user<>'postgres'
 THEN RAISE EXCEPTION 'PRIVATE_UNIFIED_QA_DATABASE_ONLY'; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN
 ('apexos_user','apex_paper_owner','apex_app_runtime','assps_marks_signed_runtime')
 AND (rolcanlogin OR rolsuper OR rolbypassrls))
 THEN RAISE EXCEPTION 'NO_PRIVILEGED_OR_LOGIN_QA_ROLES'; END IF;
 SELECT count(*) INTO count_actual FROM pg_class
 WHERE relowner='apex_paper_owner'::regrole;
 IF count_actual<>14 THEN RAISE EXCEPTION 'PAPER_OWNER_RELATIONS_NOT_RESTORED'; END IF;
 SELECT count(*) INTO count_actual FROM pg_proc
 WHERE proowner='apex_paper_owner'::regrole;
 IF count_actual<>3 THEN RAISE EXCEPTION 'PAPER_OWNER_FUNCTIONS_NOT_RESTORED'; END IF;
 SELECT count(*) INTO count_actual FROM pg_policies
 WHERE schemaname='public' AND policyname='core_signed_tenant_guard'
 AND permissive='RESTRICTIVE' AND 'assps_marks_signed_runtime'=ANY(roles)
 AND NOT 'apex_app_runtime'=ANY(roles)
 AND coalesce(qual,'')=coalesce(with_check,'');
 IF count_actual<>77 THEN RAISE EXCEPTION 'REQUIRE_77_ORIGINAL_SIGNED_MARKS_GUARDS'; END IF;
 SELECT count(*) INTO count_actual FROM pg_class c JOIN pg_namespace ns
 ON ns.oid=c.relnamespace WHERE ns.nspname='public' AND c.relkind='r'
 AND c.relforcerowsecurity AND c.relname<>'student_class_movement_audit';
 IF count_actual<>77 THEN RAISE EXCEPTION 'REQUIRE_77_FORCE_RLS_TABLES'; END IF;
END $precheck$;
GRANT USAGE ON SCHEMA core_security TO apex_app_runtime;
GRANT EXECUTE ON FUNCTION core_security.signed_school_allowed(integer),
 core_security.signed_tenant_key_allowed(text) TO apex_app_runtime;
DO $reconcile$
DECLARE entry record;
BEGIN
 FOR entry IN SELECT tablename FROM pg_policies WHERE schemaname='public'
 AND policyname='core_signed_tenant_guard' ORDER BY tablename LOOP
 EXECUTE format('ALTER POLICY core_signed_tenant_guard ON public.%I TO assps_marks_signed_runtime, apex_app_runtime',entry.tablename);
 END LOOP;
END $reconcile$;
ALTER DATABASE assps_core_unified_security_recovery_20261013 OWNER TO apexos_user;
REVOKE CONNECT,TEMPORARY ON DATABASE assps_core_unified_security_recovery_20261013 FROM PUBLIC;
DO $verify$
DECLARE count_actual integer;
BEGIN
 SELECT count(*) INTO count_actual FROM pg_policies
 WHERE schemaname='public' AND policyname='core_signed_tenant_guard'
 AND permissive='RESTRICTIVE' AND 'assps_marks_signed_runtime'=ANY(roles)
 AND 'apex_app_runtime'=ANY(roles) AND coalesce(qual,'')=coalesce(with_check,'');
 IF count_actual<>77 THEN RAISE EXCEPTION 'EXACT_DUAL_USING_WITH_CHECK_MISSING'; END IF;
 SELECT count(*) INTO count_actual FROM pg_policies
 WHERE schemaname='public' AND policyname='core_signed_tenant_guard'
 AND qual IN ('core_security.signed_school_allowed(id)',
 'core_security.signed_school_allowed(school_id)');
 IF count_actual<>73 THEN RAISE EXCEPTION 'SIGNED_SCHOOL_POLICY_DRIFT'; END IF;
 SELECT count(*) INTO count_actual FROM pg_policies
 WHERE schemaname='public' AND policyname='core_signed_tenant_guard'
 AND qual='core_security.signed_tenant_key_allowed((tenant_id)::text)';
 IF count_actual<>4 THEN RAISE EXCEPTION 'SIGNED_TENANT_POLICY_DRIFT'; END IF;
 IF has_table_privilege('apex_app_runtime','public.paper_documents','SELECT')
 OR has_table_privilege('assps_marks_signed_runtime','public.paper_documents','SELECT')
 OR has_table_privilege('apex_app_runtime','public.paper_revisions','SELECT')
 OR has_table_privilege('assps_marks_signed_runtime','public.paper_revisions','SELECT')
 THEN RAISE EXCEPTION 'PAPER_DOCUMENT_LEAST_PRIVILEGE_VIOLATION'; END IF;
 IF (SELECT rolcanlogin OR rolsuper OR rolbypassrls FROM pg_roles
 WHERE rolname='apexos_user') THEN RAISE EXCEPTION 'UNSAFE_LEGACY_QA_OWNER'; END IF;
END $verify$;
COMMIT;
