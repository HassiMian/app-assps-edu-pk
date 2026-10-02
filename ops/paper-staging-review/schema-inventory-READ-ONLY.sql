-- Phase 3E. MANUAL REVIEW ONLY, NOT a migration and NEVER invoked by app startup.
-- Requires separately authorized target; verify host/database are NOT production first.
-- This script fetches STRUCTURE only. It does not read paper content or school/student rows.
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '5s';
SET LOCAL lock_timeout = '1s';

SELECT current_database() AS database_name, current_schema() AS current_schema_name,
 current_user AS connected_role, current_setting('server_version') AS postgres_version;

SELECT to_regclass('public.schools') AS schools_table,
 to_regclass('public.users') AS users_table,
 to_regclass('public.paper_documents') AS existing_paper_documents,
 to_regclass('public.paper_revisions') AS existing_paper_revisions,
 to_regclass('public.paper_source_references') AS existing_paper_reference_table;

SELECT table_schema,table_name,column_name,ordinal_position,data_type,udt_name,
 is_nullable,column_default,character_maximum_length
FROM information_schema.columns
WHERE table_schema='public' AND table_name IN
 ('schools','users','paper_documents','paper_revisions','paper_source_references')
ORDER BY table_name,ordinal_position;

SELECT n.nspname AS schema_name,c.relname AS table_name,c.relrowsecurity AS rls_enabled,
 c.relforcerowsecurity AS force_rls,c.relpersistence AS persistence,
 c.relkind AS relation_kind
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN
 ('schools','users','paper_documents','paper_revisions','paper_source_references')
ORDER BY c.relname;

SELECT con.conrelid::regclass::text AS table_name,con.conname AS constraint_name,
 con.contype AS constraint_type,pg_get_constraintdef(con.oid) AS definition
FROM pg_catalog.pg_constraint con
WHERE con.conrelid IN
 (SELECT to_regclass('public.schools') UNION SELECT to_regclass('public.users')
  UNION SELECT to_regclass('public.paper_documents')
  UNION SELECT to_regclass('public.paper_revisions')
  UNION SELECT to_regclass('public.paper_source_references'))
ORDER BY table_name,constraint_name;

SELECT schemaname,tablename,indexname,indexdef
FROM pg_catalog.pg_indexes
WHERE schemaname='public' AND tablename IN
 ('schools','users','paper_documents','paper_revisions','paper_source_references')
ORDER BY tablename,indexname;

SELECT schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
FROM pg_catalog.pg_policies
WHERE schemaname='public' AND tablename IN
 ('schools','users','paper_documents','paper_revisions','paper_source_references')
ORDER BY tablename,policyname;

SELECT extension_name,extension_version FROM
 (SELECT extname AS extension_name,extversion AS extension_version
  FROM pg_catalog.pg_extension WHERE extname IN ('pgcrypto','uuid-ossp')) e
ORDER BY extension_name;

-- Explicitly end the read-only transaction without modifying any database objects.
ROLLBACK;
