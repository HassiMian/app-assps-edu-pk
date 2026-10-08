\set ON_ERROR_STOP on
DO $$
BEGIN
 IF current_database() != 'assps_core_rls_clone_20261008' THEN
  RAISE EXCEPTION 'Refusing RLS acceptance outside the explicitly disposable clone';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='apex_app_runtime' AND NOT rolsuper AND NOT rolbypassrls) THEN
  RAISE EXCEPTION 'apex_app_runtime must not be superuser or BYPASSRLS';
 END IF;
 IF (SELECT COUNT(*) FROM public.schools WHERE id IN (900001,900002)) != 2 THEN
  RAISE EXCEPTION 'Synthetic fixtures missing';
 END IF;
END $$;
-- The privileged control is a reminder that the login remains unsafe without
-- an authenticated, non-bypass boundary: this is NEVER considered a pass.
SELECT 'CONTROL_SUPERUSER_VISIBLE',COUNT(*) FROM students WHERE gr_number LIKE 'CORE-RLS-SYN-%';
BEGIN;
SET LOCAL ROLE apex_app_runtime;
DO $$
BEGIN
 IF (SELECT COUNT(*) FROM public.students WHERE gr_number LIKE 'CORE-RLS-SYN-%') != 0 THEN
   RAISE EXCEPTION 'Unscoped student access is not fail-closed';
 END IF;
END $$;
ROLLBACK;
BEGIN;
SET LOCAL ROLE apex_app_runtime;
SELECT set_config('app.rls_enabled','true',true);
SELECT set_config('app.is_super_admin','false',true);
SELECT set_config('app.tenant_id','900001',true);
DO $$
DECLARE n INTEGER;
BEGIN
 IF current_user != 'apex_app_runtime' THEN RAISE EXCEPTION 'Wrong active role'; END IF;
 SELECT COUNT(*) INTO n FROM public.students WHERE gr_number LIKE 'CORE-RLS-SYN-%';
 IF n != 1 THEN RAISE EXCEPTION 'A student count %, expected 1',n; END IF;
 SELECT COUNT(*) INTO n FROM public.users WHERE email LIKE 'core-security-%@example.invalid';
 IF n != 1 THEN RAISE EXCEPTION 'A teacher count %, expected 1',n; END IF;
 SELECT COUNT(*) INTO n FROM public.schools WHERE id IN (900001,900002);
 IF n != 1 THEN RAISE EXCEPTION 'A school count %, expected 1',n; END IF;
 SELECT COUNT(*) INTO n FROM public.students WHERE school_id=900002;
 IF n != 0 THEN RAISE EXCEPTION 'Cross-tenant SELECT exposure'; END IF;
 UPDATE public.students SET name='FAIL_IF_CROSS_TENANT_UPDATE'
   WHERE school_id=900002 AND gr_number='CORE-RLS-SYN-B';
 GET DIAGNOSTICS n = ROW_COUNT;
 IF n != 0 THEN RAISE EXCEPTION 'Cross-tenant update modified % rows',n; END IF;
 BEGIN
   INSERT INTO public.students(school_id,gr_number,name,class)
    VALUES(900002,'CORE-RLS-FORBIDDEN','Forbidden cross-school insert','9');
   RAISE EXCEPTION 'Cross-tenant INSERT unexpectedly succeeded';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $$;
SELECT 'TENANT_A_READ_WRITE_DENIAL_PASS';
ROLLBACK;
BEGIN;
SET LOCAL ROLE apex_app_runtime;
SELECT set_config('app.rls_enabled','true',true);
SELECT set_config('app.is_super_admin','false',true);
SELECT set_config('app.tenant_id','900002',true);
DO $$
BEGIN
 IF (SELECT COUNT(*) FROM public.students WHERE gr_number LIKE 'CORE-RLS-SYN-%') != 1
 OR (SELECT COUNT(*) FROM public.users WHERE email LIKE 'core-security-%@example.invalid') != 1
 OR (SELECT COUNT(*) FROM public.schools WHERE id IN (900001,900002)) != 1
 OR (SELECT COUNT(*) FROM public.students WHERE school_id=900001) != 0 THEN
  RAISE EXCEPTION 'Tenant B isolation failure';
 END IF;
END $$;
SELECT 'TENANT_B_ISOLATION_PASS';
ROLLBACK;
SELECT 'CORE_RLS_DISPOSABLE_CLONE_PASS';
