-- One disposable QA database ONLY, on localhost PostgreSQL 55432.
-- No live database, school rows, permanent role definitions or login access.
-- Promote an explicitly separate *candidate* from faithful recovery baseline.
BEGIN;
DO $verify$
DECLARE n integer;
BEGIN
 IF current_database() <> 'assps_core_signed_recovery_candidate_20261012'
 OR current_setting('port') <> '55432' OR current_user <> 'postgres'
 THEN RAISE EXCEPTION 'REFUSING_NON_QA_CANDIDATE'; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN ('apex_app_runtime','assps_marks_signed_runtime')
 AND (rolcanlogin OR rolbypassrls OR rolsuper))
 THEN RAISE EXCEPTION 'UNSAFE_CORE_RUNTIME_ROLE'; END IF;
 SELECT count(*) INTO n FROM pg_policies WHERE schemaname='public'
 AND policyname='core_signed_tenant_guard' AND permissive='RESTRICTIVE'
 AND 'assps_marks_signed_runtime'=ANY(roles)
 AND NOT 'apex_app_runtime'=ANY(roles)
 AND coalesce(with_check,'')=coalesce(qual,'');
 IF n <> 77 THEN RAISE EXCEPTION 'REQUIRE_ALL_77_ORIGINAL_MARKS_RESTRICTIVE_GUARDS'; END IF;
 SELECT count(*) INTO n FROM pg_class c JOIN pg_namespace ns ON c.relnamespace=ns.oid
 WHERE ns.nspname='public' AND c.relkind='r' AND c.relforcerowsecurity
 AND c.relname<>'student_class_movement_audit';
 IF n <> 77 THEN RAISE EXCEPTION 'PROTECTED_FORCE_RLS_TABLE_DRIFT'; END IF;
END $verify$;
GRANT USAGE ON SCHEMA core_security TO apex_app_runtime;
GRANT EXECUTE ON FUNCTION core_security.signed_school_allowed(integer),
 core_security.signed_tenant_key_allowed(text) TO apex_app_runtime;
DO $patch$
DECLARE x record;
BEGIN
 FOR x IN SELECT tablename FROM pg_policies WHERE schemaname='public'
 AND policyname='core_signed_tenant_guard' ORDER BY tablename LOOP
 EXECUTE format('ALTER POLICY core_signed_tenant_guard ON public.%I TO assps_marks_signed_runtime, apex_app_runtime',x.tablename);
 END LOOP;
END $patch$;
DO $postcheck$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM pg_policies WHERE schemaname='public'
 AND policyname='core_signed_tenant_guard' AND permissive='RESTRICTIVE'
 AND 'apex_app_runtime'=ANY(roles)
 AND 'assps_marks_signed_runtime'=ANY(roles)
 AND coalesce(with_check,'')=coalesce(qual,'');
 IF n <> 77 THEN RAISE EXCEPTION 'DUAL_RUNTIME_SIGNED_WITH_CHECK_INCOMPLETE'; END IF;
 SELECT count(*) INTO n FROM pg_policies WHERE schemaname='public'
 AND policyname='core_signed_tenant_guard' AND qual IN
 ('core_security.signed_school_allowed(id)','core_security.signed_school_allowed(school_id)');
 IF n <> 73 THEN RAISE EXCEPTION 'SCHOOL_SIGNED_GUARD_DRIFT'; END IF;
 SELECT count(*) INTO n FROM pg_policies WHERE schemaname='public'
 AND policyname='core_signed_tenant_guard'
 AND qual='core_security.signed_tenant_key_allowed((tenant_id)::text)';
 IF n <> 4 THEN RAISE EXCEPTION 'TENANT_KEY_SIGNED_GUARD_DRIFT'; END IF;
END $postcheck$;
COMMIT;
