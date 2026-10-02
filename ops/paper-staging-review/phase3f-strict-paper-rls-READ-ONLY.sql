-- Phase 3F MANUAL CATALOG QUERY ONLY. Never wired to backend start, migrate or production.
-- Run only after verifying authorized NON-PRODUCTION target, database role and audit scope.
-- No school rows, student rows, paper JSON, tokens, private data or credentials are selected.
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '5s';
SET LOCAL lock_timeout = '1s';
SELECT current_database() AS database_name,current_schema() AS schema_name,
 current_user AS inspected_role,current_setting('server_version') AS postgres_version;
SELECT n.nspname AS schema_name,c.relname AS table_name,
 c.relrowsecurity AS rls_enabled,c.relforcerowsecurity AS force_rls,
 c.relkind AS relation_kind
FROM pg_catalog.pg_class AS c
JOIN pg_catalog.pg_namespace AS n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('paper_documents','paper_revisions')
ORDER BY c.relname;
SELECT table_schema,table_name,column_name,is_nullable,udt_name,data_type,
 ordinal_position
FROM information_schema.columns
WHERE table_schema='public' AND table_name IN ('paper_documents','paper_revisions')
ORDER BY table_name,ordinal_position;
SELECT con.conrelid::regclass::text AS table_name,con.contype AS constraint_type,
 con.conname AS constraint_name,pg_get_constraintdef(con.oid) AS definition
FROM pg_catalog.pg_constraint AS con
WHERE con.conrelid IN (to_regclass('public.paper_documents'),
 to_regclass('public.paper_revisions'))
ORDER BY table_name,constraint_name;
SELECT schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
FROM pg_catalog.pg_policies
WHERE schemaname='public' AND tablename IN ('paper_documents','paper_revisions')
ORDER BY tablename,policyname;
SELECT r.rolsuper,r.rolbypassrls,
 COALESCE(has_table_privilege(current_user,
  to_regclass('public.paper_revisions'),'UPDATE'),true) AS revisions_can_update,
 COALESCE(has_table_privilege(current_user,
  to_regclass('public.paper_revisions'),'DELETE'),true) AS revisions_can_delete
FROM pg_catalog.pg_roles AS r WHERE r.rolname=current_user;
SELECT schemaname,tablename,indexname,indexdef
FROM pg_catalog.pg_indexes
WHERE schemaname='public' AND tablename IN ('paper_documents','paper_revisions')
ORDER BY tablename,indexname;
ROLLBACK;
