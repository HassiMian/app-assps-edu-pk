-- Phase 3H: MANUAL synthetic-only hardening patch, never a production migration.
-- Apply solely AFTER generated Phase3G base schema INSIDE independently new
-- ephemeral 127.0.0.1:55440 database assps_paper_phase3h_ci.
\set ON_ERROR_STOP on
BEGIN;
DO $phase3h_guard$
BEGIN
 IF current_database()<>'assps_paper_phase3h_ci'
  OR current_setting('port')<>'55440'
  OR current_setting('listen_addresses')<>'127.0.0.1'
  OR session_user<>'assps_p3g_admin'
 THEN RAISE EXCEPTION 'PHASE3H refuses non-disposable/incorrect session target';
 END IF;
 IF to_regclass('public.schools') IS NULL
  OR to_regclass('public.paper_documents') IS NULL
  OR to_regclass('public.paper_revisions') IS NULL
  OR to_regclass('public.paper_role_school_bindings') IS NOT NULL
  OR to_regrole('assps_p3h_school51') IS NULL
  OR to_regrole('assps_p3h_school52') IS NULL
 THEN RAISE EXCEPTION 'PHASE3H requires pristine synthetic Phase3G fixture and distinct test login roles';
 END IF;
END
$phase3h_guard$;
-- Old GUC-only app login is disabled completely; no fallback or membership in tenant roles.
DROP POLICY paper_school_strict ON public.paper_documents;
DROP POLICY paper_school_strict ON public.paper_revisions;
REVOKE ALL ON public.paper_documents FROM assps_p3g_app;
REVOKE ALL ON public.paper_revisions FROM assps_p3g_app;
-- This identity map is admin-owned, invisible and unwritable to both tenant login roles.
INSERT INTO public.schools(id) VALUES (51),(52);
-- Even a school-scoped SQL-capable login cannot attribute another school's actor ID.
ALTER TABLE public.users ADD CONSTRAINT users_school_actor_unique UNIQUE(school_id,id);
ALTER TABLE public.paper_documents ADD CONSTRAINT paper_documents_owner_same_school
 FOREIGN KEY(school_id,created_by) REFERENCES public.users(school_id,id);
ALTER TABLE public.paper_documents ADD CONSTRAINT paper_documents_updater_same_school
 FOREIGN KEY(school_id,updated_by) REFERENCES public.users(school_id,id);
ALTER TABLE public.paper_revisions ADD CONSTRAINT paper_revisions_actor_same_school
 FOREIGN KEY(school_id,actor_id) REFERENCES public.users(school_id,id);
CREATE TABLE public.paper_role_school_bindings(
 login_role NAME PRIMARY KEY,
 school_id INTEGER NOT NULL UNIQUE REFERENCES public.schools(id)
);
REVOKE ALL ON public.paper_role_school_bindings FROM PUBLIC;
INSERT INTO public.paper_role_school_bindings(login_role,school_id) VALUES
 ('assps_p3h_school51',51),('assps_p3h_school52',52);
-- SECURITY DEFINER reads private map as administrator, but uses SESSION_USER which
-- remains the original authenticated LOGIN principal, not CURRENT_USER and not a GUC.
-- Explicit search_path and qualified table; never accept a school ID argument.
CREATE FUNCTION public.phase3h_session_school_id()
RETURNS INTEGER LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public AS $trusted_session$
 SELECT b.school_id FROM public.paper_role_school_bindings AS b
 WHERE b.login_role=session_user::name
$trusted_session$;
REVOKE ALL ON FUNCTION public.phase3h_session_school_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.phase3h_session_school_id()
 TO assps_p3h_school51,assps_p3h_school52;
CREATE POLICY paper_school_role_bound ON public.paper_documents
 AS PERMISSIVE FOR ALL TO assps_p3h_school51,assps_p3h_school52
 USING (school_id=public.phase3h_session_school_id())
 WITH CHECK (school_id=public.phase3h_session_school_id());
CREATE POLICY paper_school_role_bound ON public.paper_revisions
 AS PERMISSIVE FOR ALL TO assps_p3h_school51,assps_p3h_school52
 USING (school_id=public.phase3h_session_school_id())
 WITH CHECK (school_id=public.phase3h_session_school_id());
GRANT USAGE ON SCHEMA public TO assps_p3h_school51,assps_p3h_school52;
GRANT SELECT ON public.paper_documents TO assps_p3h_school51,assps_p3h_school52;
GRANT UPDATE(native_json_text,native_sha256,revision,updated_by,updated_at)
 ON public.paper_documents TO assps_p3h_school51,assps_p3h_school52;
GRANT SELECT,INSERT ON public.paper_revisions TO assps_p3h_school51,assps_p3h_school52;
-- No CRUD grants on the login-school mapping; no superuser/BYPASSRLS/other role membership.
COMMIT;
