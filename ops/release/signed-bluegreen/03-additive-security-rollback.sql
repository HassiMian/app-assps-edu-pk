-- Reversible additive security artifact rollback, NOT application/source rollback.
-- Dedicated signing role is revoked and dropped only after exclusive safety guards.
-- Does NOT drop or revoke apex_app_runtime, apexos_user, Paper owners or table data.
-- Run only after reverting green backend and verifying no signed-runtime sessions.
\set ON_ERROR_STOP on
\if :{?ASSPS_TARGET_DATABASE}
\else
\echo 'ERROR: ASSPS_TARGET_DATABASE required'
\quit 3
\endif
BEGIN;
SELECT set_config('assps.cutover_target_database', :'ASSPS_TARGET_DATABASE',true);
DO $guard$
DECLARE legacy_count int; signed_count int;
BEGIN
 IF current_user<>'postgres' OR current_database()<>current_setting('assps.cutover_target_database')
 OR (current_database()='apexos' AND current_setting('port')<>'5432')
 OR (current_database()<>'apexos' AND (current_database()<>'assps_backup_restore_check_20261011' OR current_setting('port')<>'55432'))
 THEN RAISE EXCEPTION 'ASSPS security rollback target mismatch'; END IF;
 SELECT count(*) INTO legacy_count FROM pg_policies WHERE schemaname='public' AND policyname NOT IN ('core_signed_tenant_guard','core_signed_tenant_allow');
 SELECT count(*) INTO signed_count FROM pg_policies WHERE schemaname='public' AND policyname='core_signed_tenant_guard'
 AND roles=ARRAY['assps_marks_signed_runtime']::name[];
 IF legacy_count<>212 OR signed_count<>77 OR (SELECT count(*) FROM pg_policies WHERE policyname='core_signed_tenant_allow' AND roles=ARRAY['assps_marks_signed_runtime']::name[])<>77
 OR NOT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='core_security')
 OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname='assps_marks_signed_login')
 THEN RAISE EXCEPTION 'Refusing changed signed policy catalog'; END IF;
 -- Never tear down signed policy helpers while active green service is attached.
 IF EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid()
 AND usename='assps_marks_signed_login')
 THEN RAISE EXCEPTION 'Signed login still connected; stop green instance first'; END IF;
END $guard$;
DO $remove$
DECLARE r record;
BEGIN
 FOR r IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind='r' AND c.relforcerowsecurity ORDER BY c.relname LOOP
  EXECUTE format('DROP POLICY core_signed_tenant_guard ON public.%I',r.relname);
  EXECUTE format('DROP POLICY core_signed_tenant_allow ON public.%I',r.relname);
 END LOOP;
END $remove$;
DROP FUNCTION core_security.signed_school_allowed(INTEGER) RESTRICT;
DROP FUNCTION core_security.signed_tenant_key_allowed(TEXT) RESTRICT;
DROP FUNCTION core_security.valid_signed_context() RESTRICT;
DROP TABLE core_security.signing_key RESTRICT;
DROP SCHEMA core_security RESTRICT;
-- New dedicated runtime was provisioned by our additive migration; release
-- its exact grants and delete it to restore the old role catalog. Never touch
-- apex_app_runtime or any Paper-owned role. DROP ROLE is RESTRICT by default:
-- any unexpected membership/dependency will abort and roll back everything.
DO $role_guard$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='assps_marks_signed_runtime'
    AND NOT rolcanlogin AND NOT rolbypassrls AND NOT rolsuper)
 OR EXISTS (SELECT 1 FROM pg_auth_members a JOIN pg_roles r ON a.member=r.oid
            WHERE r.rolname='assps_marks_signed_runtime')
 OR EXISTS (SELECT 1 FROM pg_auth_members a JOIN pg_roles r ON a.roleid=r.oid
            WHERE r.rolname='assps_marks_signed_runtime')
 THEN RAISE EXCEPTION 'Refuse dedicated runtime cleanup: role or memberships changed'; END IF;
END $role_guard$;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM assps_marks_signed_runtime;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM assps_marks_signed_runtime;
REVOKE USAGE ON SCHEMA public FROM assps_marks_signed_runtime;
DROP ROLE assps_marks_signed_runtime;
DO $post$
BEGIN
 IF (SELECT count(*) FROM pg_policies WHERE schemaname='public')<>212
 OR (SELECT count(*) FROM pg_policies WHERE policyname IN ('core_signed_tenant_guard','core_signed_tenant_allow'))<>0
 OR (SELECT count(*) FROM pg_namespace WHERE nspname='core_security')<>0
 OR (SELECT count(*) FROM pg_roles WHERE rolname='assps_marks_signed_runtime')<>0
 THEN RAISE EXCEPTION 'Incomplete signed rollback'; END IF;
END $post$;
COMMIT;
