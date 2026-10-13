-- Paper-owner disaster-recovery rehearsal, ISOLATED PG55432 COPY ONLY.
-- No production5432 SQL. Transaction rolls back on unexpected schema/ownership.
BEGIN;
DO $verify$
DECLARE n integer;
BEGIN
 IF current_database()<>'assps_core_restore_verified_20261012'
 OR current_setting('port')<>'55432' OR current_user<>'postgres'
 THEN RAISE EXCEPTION 'RESTRICTED_RESTORE_TARGET_REQUIRED'; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='apex_paper_owner')
 THEN RAISE EXCEPTION 'ROLE_PREEXISTS_REVIEW_BEFORE_EDIT'; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='apexos_user')
 THEN RAISE EXCEPTION 'REFUSE_PRIVILEGED_LEGACY_ROLE'; END IF;
 SELECT count(*) INTO n FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace
 WHERE ns.nspname='public' AND c.relkind='r'
 AND c.relname IN ('paper_documents','paper_revisions') AND c.relowner='postgres'::regrole;
 IF n<>2 THEN RAISE EXCEPTION 'EXPECTED_TWO_POSTGRES_OWNED_PAPER_TABLES'; END IF;
 SELECT count(*) INTO n FROM pg_proc p JOIN pg_namespace ns ON ns.oid=p.pronamespace
 WHERE ns.nspname='public' AND p.proname IN (
 'paper_canonical_document_no_delete_v6f1',
 'paper_canonical_revision_immutable_v6f1',
 'paper_canonical_write_guard_v6f1') AND p.proowner='postgres'::regrole;
 IF n<>3 THEN RAISE EXCEPTION 'EXPECTED_THREE_PAPER_GUARD_FUNCTIONS'; END IF;
END $verify$;
CREATE ROLE apex_paper_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
ALTER TABLE public.paper_documents OWNER TO apex_paper_owner;
ALTER TABLE public.paper_revisions OWNER TO apex_paper_owner;
ALTER FUNCTION public.paper_canonical_document_no_delete_v6f1() OWNER TO apex_paper_owner;
ALTER FUNCTION public.paper_canonical_revision_immutable_v6f1() OWNER TO apex_paper_owner;
ALTER FUNCTION public.paper_canonical_write_guard_v6f1() OWNER TO apex_paper_owner;
DO $check$
DECLARE n integer;
BEGIN
 IF current_database()<>'assps_core_restore_verified_20261012'
 OR current_setting('port')<>'55432' THEN RAISE EXCEPTION 'CLONE_CHANGED'; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='apex_paper_owner'
 AND (rolcanlogin OR rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb))
 THEN RAISE EXCEPTION 'UNSAFE_PAPER_OWNER'; END IF;
 SELECT count(*) INTO n FROM pg_class WHERE relowner='apex_paper_owner'::regrole;
 IF n<>14 THEN RAISE EXCEPTION 'EXPECTED_EXACT_14_OWNED_PAPER_RELATIONS'; END IF;
 SELECT count(*) INTO n FROM pg_proc WHERE proowner='apex_paper_owner'::regrole;
 IF n<>3 THEN RAISE EXCEPTION 'EXPECTED_EXACT_3_PAPER_FUNCTIONS'; END IF;
 IF has_table_privilege('apex_app_runtime','public.paper_documents','SELECT')
 OR has_table_privilege('assps_marks_signed_runtime','public.paper_documents','SELECT')
 OR has_table_privilege('apex_app_runtime','public.paper_revisions','SELECT')
 OR has_table_privilege('assps_marks_signed_runtime','public.paper_revisions','SELECT')
 THEN RAISE EXCEPTION 'PROTECTED_PAPER_RUNTIME_BARRIER_BROKEN'; END IF;
END $check$;
COMMIT;
