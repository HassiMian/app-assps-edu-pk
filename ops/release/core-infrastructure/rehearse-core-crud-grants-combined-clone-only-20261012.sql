-- Assps Core private PG55432 disposable QA ONLY.
-- Schema privilege preparation, NO school row writes, never production.
BEGIN;
DO $precheck$
DECLARE t record; n int;
BEGIN
 IF current_database()<>'assps_core_rls_guard_qa_20261012' OR current_setting('port')<>'55432'
    OR current_user<>'postgres' THEN RAISE EXCEPTION 'PRIVATE_CLONE_IDENTITY_REQUIRED'; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN ('apex_app_runtime','assps_marks_signed_runtime')
    AND (rolcanlogin OR rolbypassrls OR rolsuper)) THEN RAISE EXCEPTION 'UNSAFE_RUNTIME_ROLE'; END IF;
 SELECT count(*) INTO n FROM pg_policies WHERE schemaname='public'
    AND policyname='core_signed_tenant_guard' AND permissive='RESTRICTIVE'
    AND 'apex_app_runtime'=ANY(roles) AND 'assps_marks_signed_runtime'=ANY(roles)
    AND coalesce(qual,'')=coalesce(with_check,'');
 IF n<>77 THEN RAISE EXCEPTION 'EXACT_DUAL_SIGNED_WITH_CHECK_REQUIRED'; END IF;
 SELECT count(*) INTO n FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace
    WHERE ns.nspname='public' AND c.relkind='r' AND c.relforcerowsecurity
      AND c.relname<>'student_class_movement_audit'
      AND c.relname NOT IN ('paper_documents','paper_revisions')
      AND has_table_privilege('apex_app_runtime',c.oid,'SELECT');
 IF n<>75 THEN RAISE EXCEPTION 'APP_BASELINE_SELECT_GRANTS_NOT_EXACT_75'; END IF;
 IF has_table_privilege('apex_app_runtime','public.paper_documents','SELECT')
    OR has_table_privilege('apex_app_runtime','public.paper_revisions','SELECT')
 THEN RAISE EXCEPTION 'PAPER_DOCUMENT_BARRIER_BROKEN'; END IF;
END $precheck$;
DO $safegrant$
DECLARE t record;
BEGIN
 FOR t IN
   SELECT c.relname FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace
   WHERE ns.nspname='public' AND c.relkind='r' AND c.relforcerowsecurity
     AND c.relname<>'student_class_movement_audit'
     AND c.relname NOT IN ('paper_documents','paper_revisions') ORDER BY c.relname
 LOOP
   EXECUTE format('GRANT INSERT, UPDATE, DELETE ON TABLE public.%I TO apex_app_runtime',t.relname);
 END LOOP;
END $safegrant$;
DO $postcheck$
DECLARE n int;
BEGIN
 SELECT count(*) INTO n FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace
    WHERE ns.nspname='public' AND c.relkind='r' AND c.relforcerowsecurity
      AND c.relname<>'student_class_movement_audit'
      AND c.relname NOT IN ('paper_documents','paper_revisions')
      AND has_table_privilege('apex_app_runtime',c.oid,'SELECT')
      AND has_table_privilege('apex_app_runtime',c.oid,'INSERT')
      AND has_table_privilege('apex_app_runtime',c.oid,'UPDATE')
      AND has_table_privilege('apex_app_runtime',c.oid,'DELETE');
 IF n<>75 THEN RAISE EXCEPTION 'APP_CRUD_GRANTS_NOT_COMPLETE'; END IF;
 IF has_table_privilege('apex_app_runtime','public.paper_documents','SELECT')
   OR has_table_privilege('apex_app_runtime','public.paper_revisions','SELECT')
 THEN RAISE EXCEPTION 'PAPER_DOCUMENT_SCOPE_VIOLATION'; END IF;
END $postcheck$;
COMMIT;
