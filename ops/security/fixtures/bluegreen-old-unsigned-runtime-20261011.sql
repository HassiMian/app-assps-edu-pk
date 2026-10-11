\set ON_ERROR_STOP on
BEGIN;
DO $guard$
BEGIN
 IF current_database()<>'assps_core_bluegreen_rbac_rehearsal_20261011'
 OR current_setting('port')::int<>55432 OR current_user<>'postgres'
 THEN RAISE EXCEPTION 'OLD_PATH_REHEARSAL_ONLY'; END IF;
END $guard$;
SET LOCAL SESSION AUTHORIZATION assps_core_test_login;
SET LOCAL ROLE apex_app_runtime;
SELECT set_config('app.rls_enabled','true',true),
       set_config('app.is_super_admin','false',true),
       set_config('app.tenant_id','900001',true),
       set_config('app.tenant_key','synthetic-core-a',true);
DO $assert$
DECLARE own INTEGER; foreign_count INTEGER;
BEGIN
 SELECT COUNT(*) INTO own FROM schools WHERE id=900001;
 SELECT COUNT(*) INTO foreign_count FROM schools WHERE id=900002;
 IF own<>1 OR foreign_count<>0
 THEN RAISE EXCEPTION 'OLD_RUNTIME_SCHOOL_ISOLATION_REGRESSED own % foreign %',own,foreign_count; END IF;
 RAISE NOTICE 'OLD_RUNTIME_STILL_WORKS_WITHOUT_SIGNED_GUARD own=1 foreign=0';
END $assert$;
ROLLBACK;
