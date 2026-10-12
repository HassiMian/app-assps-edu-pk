-- ASSPS: Disposable QA clone only. NOT A PRODUCTION MIGRATION.
-- Refuse any database other than the private 55432 clone created by SaaS Core.
-- Rehearse a signature-dependent restrictive RLS guard on four critical tables.
BEGIN;
DO $safe$
DECLARE
    rel text;
BEGIN
    IF current_database() <> 'assps_core_rls_guard_qa_20261012'
       OR current_setting('port') <> '55432'
       OR current_user <> 'postgres' THEN
        RAISE EXCEPTION 'Refusing non-clone or non-privileged execution';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='apex_app_runtime'
         AND NOT rolcanlogin AND NOT rolbypassrls AND NOT rolsuper)
       OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='assps_marks_signed_runtime'
         AND NOT rolcanlogin AND NOT rolbypassrls AND NOT rolsuper) THEN
        RAISE EXCEPTION 'Restricted runtime roles are unsafe or absent';
    END IF;
    FOREACH rel IN ARRAY ARRAY['students','attendance','fee_challans','employees'] LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
            WHERE n.nspname='public' AND c.relname=rel AND c.relkind='r'
              AND c.relrowsecurity AND c.relforcerowsecurity
        ) OR NOT EXISTS (
            SELECT 1 FROM pg_policies p
            WHERE p.schemaname='public' AND p.tablename=rel
              AND p.policyname='core_signed_tenant_guard'
              AND p.permissive='RESTRICTIVE' AND p.cmd='ALL'
              AND p.qual LIKE '%core_security.signed_school_allowed%'
              AND 'assps_marks_signed_runtime'=ANY(p.roles)
        ) THEN
            RAISE EXCEPTION 'Signed FORCE RLS source gate missing for %',rel;
        END IF;
    END LOOP;
END $safe$;
-- All grants are limited to this database; no user can login as the runtime.
GRANT USAGE ON SCHEMA core_security TO apex_app_runtime;
GRANT EXECUTE ON FUNCTION core_security.signed_school_allowed(integer) TO apex_app_runtime;
GRANT SELECT ON TABLE public.students, public.attendance, public.fee_challans,
   public.employees TO apex_app_runtime;
-- Preserve existing signed-marks role while hardening app-runtime membership.
ALTER POLICY core_signed_tenant_guard ON public.students
  TO assps_marks_signed_runtime, apex_app_runtime;
ALTER POLICY core_signed_tenant_guard ON public.attendance
  TO assps_marks_signed_runtime, apex_app_runtime;
ALTER POLICY core_signed_tenant_guard ON public.fee_challans
  TO assps_marks_signed_runtime, apex_app_runtime;
ALTER POLICY core_signed_tenant_guard ON public.employees
  TO assps_marks_signed_runtime, apex_app_runtime;
DO $check$
DECLARE n int;
BEGIN
 SELECT count(*) INTO n FROM pg_policies
 WHERE schemaname='public' AND tablename=ANY(ARRAY['students','attendance','fee_challans','employees'])
 AND policyname='core_signed_tenant_guard' AND permissive='RESTRICTIVE'
 AND 'assps_marks_signed_runtime'=ANY(roles) AND 'apex_app_runtime'=ANY(roles);
 IF n<>4 THEN RAISE EXCEPTION 'Clone restrictive policy membership incomplete'; END IF;
END $check$;
COMMIT;
