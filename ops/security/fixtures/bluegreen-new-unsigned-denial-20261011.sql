\set ON_ERROR_STOP on
BEGIN;
DO $guard$
BEGIN
 IF current_database()<>'assps_core_bluegreen_rbac_rehearsal_20261011'
 OR current_setting('port')::int<>55432 OR current_user<>'postgres'
 THEN RAISE EXCEPTION 'SIGNED_BLUEGREEN_DENIAL_REHEARSAL_ONLY'; END IF;
END $guard$;
SET LOCAL SESSION AUTHORIZATION assps_core_test_login;
SET LOCAL ROLE assps_signed_shadow_runtime;
SELECT set_config('app.rls_enabled','true',true),
       set_config('app.is_super_admin','false',true),
       set_config('app.tenant_id','900001',true),
       set_config('app.tenant_key','synthetic-core-a',true);
DO $assert$
DECLARE a integer; b integer;
BEGIN
 SELECT COUNT(*) INTO a FROM schools WHERE id=900001;
 SELECT COUNT(*) INTO b FROM schools WHERE id=900002;
 IF a<>0 OR b<>0 THEN RAISE EXCEPTION 'UNSIGNED_NEW_ROLE_EXPOSED:%/%',a,b; END IF;
 RAISE NOTICE 'UNSIGNED_NEW_ROLE_FULLY_DENIED_PASS a=0 b=0';
END $assert$;
SELECT set_config('app.tenant_id','900002',true);
SELECT set_config('app.is_super_admin','true',true);
DO $assert$
DECLARE a integer; b integer;
BEGIN
 SELECT COUNT(*) INTO a FROM schools WHERE id=900001;
 SELECT COUNT(*) INTO b FROM schools WHERE id=900002;
 IF a<>0 OR b<>0 THEN RAISE EXCEPTION 'GUC_FORGED_NEW_ROLE_EXPOSED:%/%',a,b; END IF;
 RAISE NOTICE 'UNSIGNED_NEW_ROLE_FORGED_GUC_DENIED_PASS';
END $assert$;
ROLLBACK;
