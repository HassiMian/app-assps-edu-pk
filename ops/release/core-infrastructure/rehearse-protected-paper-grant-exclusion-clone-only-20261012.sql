-- Only dedicated test PostgreSQL clone; NO live DB, no row modifications.
-- Preserve the 77-table signed RLS policies but deny protected Paper tables
-- to both SaaS Core runtime roles, matching live intended least privilege.
BEGIN;
DO $gate$
DECLARE n integer;
BEGIN
 IF current_database()<>'assps_core_rls_guard_qa_20261012'
   OR current_setting('port')<>'55432' OR current_user<>'postgres'
 THEN RAISE EXCEPTION 'QA_CLONE_IDENTITY_REQUIRED'; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN ('apex_app_runtime','assps_marks_signed_runtime')
   AND (rolcanlogin OR rolbypassrls OR rolsuper))
 THEN RAISE EXCEPTION 'UNSAFE_APP_OR_MARKS_ROLE'; END IF;
 SELECT count(*) INTO n FROM pg_policies
 WHERE schemaname='public' AND policyname='core_signed_tenant_guard'
   AND permissive='RESTRICTIVE'
   AND 'apex_app_runtime'=ANY(roles)
   AND 'assps_marks_signed_runtime'=ANY(roles);
 IF n<>77 THEN RAISE EXCEPTION 'DUAL_POLICY_COUNT_MISMATCH'; END IF;
 SELECT count(*) INTO n FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace
 WHERE ns.nspname='public' AND c.relname IN ('paper_documents','paper_revisions')
 AND c.relkind='r' AND c.relrowsecurity AND c.relforcerowsecurity;
 IF n<>2 THEN RAISE EXCEPTION 'PAPER_DOCUMENT_SCOPE_DRIFT'; END IF;
END $gate$;
REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public.paper_documents,public.paper_revisions
  FROM assps_marks_signed_runtime;
DO $verify$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace
 WHERE ns.nspname='public' AND c.relkind='r' AND c.relforcerowsecurity
 AND c.relname<>'student_class_movement_audit' AND c.relname NOT IN ('paper_documents','paper_revisions')
 AND has_table_privilege('assps_marks_signed_runtime',c.oid,'SELECT')
 AND has_table_privilege('assps_marks_signed_runtime',c.oid,'INSERT')
 AND has_table_privilege('assps_marks_signed_runtime',c.oid,'UPDATE')
 AND has_table_privilege('assps_marks_signed_runtime',c.oid,'DELETE');
 IF n<>75 THEN RAISE EXCEPTION 'EXPECTED_MARKS_75_CRUD_TABLES'; END IF;
 IF has_table_privilege('assps_marks_signed_runtime','public.paper_documents','SELECT')
 OR has_table_privilege('assps_marks_signed_runtime','public.paper_documents','INSERT')
 OR has_table_privilege('assps_marks_signed_runtime','public.paper_documents','UPDATE')
 OR has_table_privilege('assps_marks_signed_runtime','public.paper_documents','DELETE')
 OR has_table_privilege('assps_marks_signed_runtime','public.paper_revisions','SELECT')
 OR has_table_privilege('assps_marks_signed_runtime','public.paper_revisions','INSERT')
 OR has_table_privilege('assps_marks_signed_runtime','public.paper_revisions','UPDATE')
 OR has_table_privilege('assps_marks_signed_runtime','public.paper_revisions','DELETE')
 THEN RAISE EXCEPTION 'PAPER_RESOURCE_GRANT_LEAK'; END IF;
END $verify$;
COMMIT;
