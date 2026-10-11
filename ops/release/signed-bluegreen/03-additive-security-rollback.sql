-- Reversible additive security artifact rollback, NOT application/source rollback.
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
DO $post$
BEGIN
 IF (SELECT count(*) FROM pg_policies WHERE schemaname='public')<>212
 OR (SELECT count(*) FROM pg_policies WHERE policyname IN ('core_signed_tenant_guard','core_signed_tenant_allow'))<>0
 OR (SELECT count(*) FROM pg_namespace WHERE nspname='core_security')<>0
 THEN RAISE EXCEPTION 'Incomplete signed rollback'; END IF;
END $post$;
COMMIT;
