-- Phase B rollback. Stop green service and drain sessions first.
\set ON_ERROR_STOP on
\if :{?ASSPS_TARGET_DATABASE}
\else
\quit 3
\endif
BEGIN;
SELECT set_config('assps.cutover_target_database', :'ASSPS_TARGET_DATABASE', true);
DO $guard$
BEGIN
 IF current_user<>'postgres' OR current_database()<>current_setting('assps.cutover_target_database')
 OR (current_database()='apexos' AND current_setting('port')<>'5432')
 OR (current_database()<>'apexos' AND (current_database()<>'assps_backup_restore_check_20261011' OR current_setting('port')<>'55432'))
 OR NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='assps_marks_signed_login' AND rolcanlogin AND NOT rolbypassrls)
 OR EXISTS(SELECT 1 FROM pg_stat_activity WHERE usename='assps_marks_signed_login')
 THEN RAISE EXCEPTION 'Refuse signed login rollback with changed state or active connections'; END IF;
END $guard$;
REVOKE assps_marks_signed_runtime FROM assps_marks_signed_login;
DROP ROLE assps_marks_signed_login;
COMMIT;
