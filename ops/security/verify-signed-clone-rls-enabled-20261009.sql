\set ON_ERROR_STOP on
BEGIN READ ONLY;
DO $gate$
DECLARE enabled int; forced int; signed int;
BEGIN
 IF current_database()<>'assps_core_signed_p7_20261008' OR current_setting('port')<>'55432' THEN RAISE EXCEPTION 'SIGNED_CLONE_ONLY'; END IF;
 SELECT count(*) FILTER (WHERE relrowsecurity),count(*) FILTER (WHERE relforcerowsecurity) INTO enabled,forced
 FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='r' AND relforcerowsecurity;
 SELECT count(*) INTO signed FROM pg_policies WHERE schemaname='public' AND policyname='core_signed_tenant_guard' AND permissive='RESTRICTIVE' AND 'apex_app_runtime'=ANY(roles);
 IF enabled<>77 OR forced<>77 OR signed<>77 THEN RAISE EXCEPTION 'SIGNED_RLS_INCOMPLETE enabled=% forced=% signed=%',enabled,forced,signed; END IF;
 RAISE NOTICE 'SIGNED_CLONE_77_TABLE_RLS_PASS enabled=% forced=% signed=%',enabled,forced,signed;
END $gate$;
ROLLBACK;
BEGIN READ ONLY;
SET LOCAL SESSION AUTHORIZATION assps_core_test_login;
SET LOCAL ROLE apex_app_runtime;
DO $gate$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM public.students WHERE gr_number LIKE 'CORE-RLS-SYN-%';
 IF n<>0 THEN RAISE EXCEPTION 'UNSIGNED_CROSS_TENANT_EXPOSURE:%',n; END IF;
 RAISE NOTICE 'UNSIGNED_SYNTHETIC_STUDENT_DENIAL_PASS count=%',n;
END $gate$;
ROLLBACK;
