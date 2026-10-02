-- Phase 3I: manual synthetic-only role-owner hardening patch. NOT a live migration.
-- Permitted only after isolated Phase3H base recreated in a fresh, marker-owned
-- PostgreSQL18 127.0.0.1:55441 DB named assps_paper_phase3i_ci.
\set ON_ERROR_STOP on
BEGIN;
DO $phase3i_guard$
BEGIN
 IF current_database()<>'assps_paper_phase3i_ci'
 OR current_setting('port')<>'55441'
 OR current_setting('listen_addresses')<>'127.0.0.1'
 OR session_user<>'assps_p3g_admin'
 OR to_regclass('public.paper_role_school_bindings') IS NULL
 OR to_regprocedure('public.phase3h_session_school_id()') IS NULL
 OR to_regrole('assps_p3i_identity_owner') IS NULL
 OR EXISTS (
  SELECT 1 FROM pg_catalog.pg_proc
  WHERE oid='public.phase3h_session_school_id()'::regprocedure
    AND pg_get_userbyid(proowner)<>'assps_p3g_admin'
 )
 THEN RAISE EXCEPTION 'PHASE3I refuses wrong/disallowed disposable target or role ownership';
 END IF;
END
$phase3i_guard$;
-- Dedicated purpose-only NOLOGIN role, created by trusted synthetic provisioning.
-- Restrict function execution to a private lookup only, not superuser powers.
REVOKE ALL ON public.paper_role_school_bindings FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO assps_p3i_identity_owner;
GRANT SELECT(login_role,school_id) ON public.paper_role_school_bindings
 TO assps_p3i_identity_owner;
ALTER FUNCTION public.phase3h_session_school_id()
 OWNER TO assps_p3i_identity_owner;
-- Explicitly preserve authenticated school-only EXECUTE on this SECURITY DEFINER.
REVOKE ALL ON FUNCTION public.phase3h_session_school_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.phase3h_session_school_id()
 TO assps_p3h_school51,assps_p3h_school52;
-- This owner receives NO SELECT/INSERT/UPDATE/DELETE on documents or revision content.
-- It does not own the mapping TABLE, and has NO grantable admin ability.
COMMIT;
