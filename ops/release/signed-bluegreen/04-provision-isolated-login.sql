-- Phase B: execute ONLY after Phase A catalog verified and source green acceptance.
-- Supply ASSPS_SIGNED_LOGIN_PASSWORD through protected psql stdin, never Git/argv logs.
\set ON_ERROR_STOP on
\if :{?ASSPS_TARGET_DATABASE}
\else
\quit 3
\endif
\if :{?ASSPS_SIGNED_LOGIN_PASSWORD}
\else
\quit 3
\endif
BEGIN;
SELECT set_config('assps.cutover_target_database', :'ASSPS_TARGET_DATABASE', true);
DO $preflight$
BEGIN
 IF current_user<>'postgres' OR current_database()<>current_setting('assps.cutover_target_database')
 OR (current_database()='apexos' AND current_setting('port')<>'5432')
 OR (current_database()<>'apexos' AND (current_database()<>'assps_backup_restore_check_20261011' OR current_setting('port')<>'55432'))
 OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname='assps_marks_signed_login')
 OR NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='assps_marks_signed_runtime' AND NOT rolcanlogin AND NOT rolbypassrls AND NOT rolsuper)
 OR EXISTS(SELECT 1 FROM pg_auth_members a JOIN pg_roles r ON r.oid=a.member WHERE r.rolname='assps_marks_signed_runtime')
 OR (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND policyname='core_signed_tenant_guard' AND roles=ARRAY['assps_marks_signed_runtime']::name[])<>77
 OR (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND policyname='core_signed_tenant_allow' AND roles=ARRAY['assps_marks_signed_runtime']::name[])<>77
 THEN RAISE EXCEPTION 'Signed login provisioning trust prerequisite failed'; END IF;
END $preflight$;
CREATE ROLE assps_marks_signed_login LOGIN NOINHERIT NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD :'ASSPS_SIGNED_LOGIN_PASSWORD';
GRANT assps_marks_signed_runtime TO assps_marks_signed_login WITH INHERIT FALSE, SET TRUE;
DO $postflight$
DECLARE unexpected_count int;
BEGIN
 SELECT count(*) INTO unexpected_count FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind IN ('r','p') AND
 (has_table_privilege('assps_marks_signed_login',c.oid,'SELECT')
 OR has_table_privilege('assps_marks_signed_login',c.oid,'INSERT')
 OR has_table_privilege('assps_marks_signed_login',c.oid,'UPDATE')
 OR has_table_privilege('assps_marks_signed_login',c.oid,'DELETE'));
 IF unexpected_count<>0 OR NOT pg_has_role('assps_marks_signed_login','assps_marks_signed_runtime','SET')
 OR pg_has_role('assps_marks_signed_login','assps_marks_signed_runtime','USAGE')
 THEN RAISE EXCEPTION 'Bootstrap login has direct data privileges or incorrect role membership'; END IF;
END $postflight$;
COMMIT;
