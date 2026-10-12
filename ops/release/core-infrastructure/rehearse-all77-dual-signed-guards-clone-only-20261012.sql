-- ASSPS Core integration rehearsal ONLY on private PG55432 database.
-- Production database, original restore clone and active green role remain unchanged.
BEGIN;
DO $check$
DECLARE n integer;
BEGIN
 IF current_database()<>'assps_core_rls_guard_qa_20261012' OR current_setting('port')<>'55432'
 OR current_user<>'postgres' THEN RAISE EXCEPTION 'NON_CLONE_TARGET_REFUSED'; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN ('apex_app_runtime','assps_marks_signed_runtime')
 AND (rolsuper OR rolbypassrls OR rolcanlogin)) THEN RAISE EXCEPTION 'UNSAFE_RUNTIME_ROLE'; END IF;
 SELECT count(*) INTO n FROM pg_policies p WHERE schemaname='public' AND policyname='core_signed_tenant_guard'
 AND permissive='RESTRICTIVE' AND 'assps_marks_signed_runtime'=ANY(roles)
 AND qual IN ('core_security.signed_school_allowed(id)',
  'core_security.signed_school_allowed(school_id)',
  'core_security.signed_tenant_key_allowed((tenant_id)::text)');
 IF n<>73+4 THEN RAISE EXCEPTION 'ORIGINAL_77_MARKS_GUARDS_NOT_EXACT'; END IF;
 SELECT count(*) INTO n FROM pg_policies WHERE schemaname='public'
  AND policyname='core_signed_tenant_guard' AND 'apex_app_runtime'=ANY(roles);
 IF n<>4 THEN RAISE EXCEPTION 'EXPECTED_4_PREVIOUS_CLONE_APP_GUARDS_MISSING'; END IF;
 SELECT count(*) INTO n FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace
 WHERE ns.nspname='public' AND c.relkind='r' AND c.relforcerowsecurity
 AND c.relname<>'student_class_movement_audit';
 IF n<>77 THEN RAISE EXCEPTION 'FORCE_RLS_PROTECTED_TABLE_COUNT_DRIFT'; END IF;
END $check$;
GRANT USAGE ON SCHEMA core_security TO apex_app_runtime;
GRANT EXECUTE ON FUNCTION core_security.signed_school_allowed(integer) TO apex_app_runtime;
GRANT EXECUTE ON FUNCTION core_security.signed_tenant_key_allowed(text) TO apex_app_runtime;
DO $patch$
DECLARE rel record;
BEGIN
 FOR rel IN SELECT p.tablename FROM pg_policies p
 WHERE p.schemaname='public' AND p.policyname='core_signed_tenant_guard'
 ORDER BY p.tablename LOOP
   EXECUTE format('ALTER POLICY core_signed_tenant_guard ON public.%I TO assps_marks_signed_runtime, apex_app_runtime',rel.tablename);
   IF rel.tablename NOT IN ('paper_documents','paper_revisions') THEN
      EXECUTE format('GRANT SELECT ON TABLE public.%I TO apex_app_runtime',rel.tablename);
   END IF;
 END LOOP;
END $patch$;
DO $verify$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM pg_policies p WHERE p.schemaname='public'
 AND p.policyname='core_signed_tenant_guard' AND p.permissive='RESTRICTIVE'
 AND 'assps_marks_signed_runtime'=ANY(roles) AND 'apex_app_runtime'=ANY(roles);
 IF n<>77 THEN RAISE EXCEPTION 'DUAL_GUARD_INCOMPLETE'; END IF;
 SELECT count(*) INTO n FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace
 WHERE ns.nspname='public' AND c.relkind='r' AND c.relforcerowsecurity
 AND c.relname<>'student_class_movement_audit' AND has_table_privilege('apex_app_runtime',c.oid,'SELECT');
 IF n<>75 THEN RAISE EXCEPTION 'APP_SELECT_GRANTS_NOT_EXACT_75'; END IF;
END $verify$;
COMMIT;
