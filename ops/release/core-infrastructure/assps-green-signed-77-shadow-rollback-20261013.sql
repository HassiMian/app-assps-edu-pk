-- Roll back shadow stage only while no green login is active; legacy backend and Marks intact.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '1200ms';
SET LOCAL statement_timeout = '50000ms';
DO $pre$
DECLARE n integer;
BEGIN
 IF current_user<>'postgres' OR NOT (
 (current_database()='assps_core_green77_qa_20261013' AND current_setting('port')='55432') OR
 (current_database()='apexos' AND current_setting('port')='5432'))
 THEN RAISE EXCEPTION 'UNAUTHORIZED_SHADOW_ROLLBACK_TARGET'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='assps_core_green_runtime' AND NOT rolcanlogin AND NOT rolbypassrls)
 THEN RAISE EXCEPTION 'EXPECTED_GREEN_ROLE_MISSING'; END IF;
 IF EXISTS (SELECT 1 FROM pg_auth_members WHERE roleid='assps_core_green_runtime'::regrole)
 THEN RAISE EXCEPTION 'GREEN_HAS_ACTIVE_LOGIN_MEMBERS_UNSAFE_TO_ROLLBACK'; END IF;
 SELECT count(*) INTO n FROM pg_policies WHERE schemaname='public' AND policyname='core_signed_tenant_guard'
 AND 'assps_core_green_runtime'=ANY(roles) AND 'assps_marks_signed_runtime'=ANY(roles);
 IF n<>77 THEN RAISE EXCEPTION 'GREEN_ROLLBACK_POLICY_BASE_CHANGED'; END IF;
END $pre$;
DO $revert$
DECLARE r record;
BEGIN
 FOR r IN SELECT tablename FROM pg_policies WHERE schemaname='public' AND policyname='core_signed_tenant_guard' ORDER BY tablename LOOP
 EXECUTE format('ALTER POLICY core_signed_tenant_guard ON public.%I TO assps_marks_signed_runtime',r.tablename);
 END LOOP;
END $revert$;
REVOKE EXECUTE ON FUNCTION core_security.signed_school_allowed(integer),
 core_security.signed_tenant_key_allowed(text) FROM assps_core_green_runtime;
REVOKE USAGE ON SCHEMA core_security FROM assps_core_green_runtime;
REVOKE apex_app_runtime FROM assps_core_green_runtime;
DROP ROLE assps_core_green_runtime;
DO $post$
BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='assps_core_green_runtime') OR
 (SELECT count(*) FROM pg_policies WHERE policyname='core_signed_tenant_guard'
 AND 'assps_marks_signed_runtime'=ANY(roles))<>77 OR
 (SELECT count(*) FROM pg_policies WHERE policyname='core_signed_tenant_guard'
 AND 'apex_app_runtime'=ANY(roles))<>0
 THEN RAISE EXCEPTION 'SHADOW_ROLLBACK_INCOMPLETE'; END IF;
END $post$;
COMMIT;
