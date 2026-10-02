-- Phase 3U: SYNTHETIC-ONLY NEW-AUTHORING schema. Not an application migration.
-- Execute only in a newly initialized PG18 loopback 127.0.0.1:55443 cluster,
-- database assps_paper_phase3u_ci and session_user assps_p3u_admin.
\set ON_ERROR_STOP on
BEGIN;
DO $phase3u_guard$
BEGIN
 IF current_database()<>'assps_paper_phase3u_ci'
  OR current_setting('port')<>'55443'
  OR current_setting('listen_addresses')<>'127.0.0.1'
  OR session_user<>'assps_p3u_admin'
  OR to_regrole('assps_p3t_school51') IS NULL
  OR to_regrole('assps_p3t_school52') IS NULL
  OR to_regrole('assps_p3u_identity_owner') IS NULL
  OR to_regrole('assps_p3u_schema_owner') IS NULL
 THEN RAISE EXCEPTION 'PHASE3U REFUSE: wrong cluster, port or private synthetic role provisioning';
 END IF;
 IF to_regclass('public.schools') IS NOT NULL
  OR to_regclass('public.paper_documents') IS NOT NULL
  OR to_regclass('public.paper_revisions') IS NOT NULL
  OR to_regclass('public.phase3u_schools') IS NOT NULL
  OR to_regclass('public.phase3u_identity_bindings') IS NOT NULL
  OR to_regclass('public.new_authoring_drafts_staging') IS NOT NULL
  OR to_regclass('public.new_authoring_revisions_staging') IS NOT NULL
  OR to_regclass('public.new_authoring_approved_snapshots_staging') IS NOT NULL
 THEN RAISE EXCEPTION 'PHASE3U REFUSE: target is not pristine synthetic-only database';
 END IF;
END $phase3u_guard$;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
CREATE TABLE public.phase3u_schools (
 id integer PRIMARY KEY,
 tenant_id text NOT NULL UNIQUE,
 UNIQUE(id,tenant_id)
);
CREATE TABLE public.phase3u_users (
 school_id integer NOT NULL,
 tenant_id text NOT NULL,
 id integer NOT NULL,
 PRIMARY KEY(school_id,tenant_id,id),
 FOREIGN KEY(school_id,tenant_id)
 REFERENCES public.phase3u_schools(id,tenant_id)
);
INSERT INTO public.phase3u_schools VALUES (51,'tenant-51'),(52,'tenant-52');
INSERT INTO public.phase3u_users VALUES (51,'tenant-51',110),(52,'tenant-52',120);
CREATE TABLE public.phase3u_identity_bindings (
 login_role name PRIMARY KEY,
 school_id integer NOT NULL UNIQUE,
 tenant_id text NOT NULL UNIQUE,
 FOREIGN KEY(school_id,tenant_id)
 REFERENCES public.phase3u_schools(id,tenant_id)
);
INSERT INTO public.phase3u_identity_bindings VALUES
 ('assps_p3t_school51',51,'tenant-51'),
 ('assps_p3t_school52',52,'tenant-52');
REVOKE ALL ON public.phase3u_identity_bindings FROM PUBLIC;
ALTER TABLE public.phase3u_identity_bindings OWNER TO assps_p3u_identity_owner;
-- Functions use SESSION_USER, not SET ROLE, JWT, headers or mutable GUC.
CREATE FUNCTION public.phase3t_session_school_id() RETURNS integer
 LANGUAGE sql STABLE SECURITY DEFINER
 SET search_path=pg_catalog,public AS $school$
 SELECT b.school_id FROM public.phase3u_identity_bindings b
 WHERE b.login_role=session_user::name
$school$;
CREATE FUNCTION public.phase3t_session_tenant_id() RETURNS text
 LANGUAGE sql STABLE SECURITY DEFINER
 SET search_path=pg_catalog,public AS $tenant$
 SELECT b.tenant_id FROM public.phase3u_identity_bindings b
 WHERE b.login_role=session_user::name
$tenant$;
ALTER FUNCTION public.phase3t_session_school_id()
 OWNER TO assps_p3u_identity_owner;
ALTER FUNCTION public.phase3t_session_tenant_id()
 OWNER TO assps_p3u_identity_owner;
REVOKE ALL ON FUNCTION public.phase3t_session_school_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.phase3t_session_tenant_id() FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO assps_p3t_school51,assps_p3t_school52,
 assps_p3u_schema_owner,assps_p3u_identity_owner;
GRANT EXECUTE ON FUNCTION public.phase3t_session_school_id()
 TO assps_p3t_school51,assps_p3t_school52,assps_p3u_schema_owner;
GRANT EXECUTE ON FUNCTION public.phase3t_session_tenant_id()
 TO assps_p3t_school51,assps_p3t_school52,assps_p3u_schema_owner;
-- Synthetic publication fixture. Application tenant login has NO direct SELECT or UPDATE.
CREATE TABLE public.new_authoring_approved_snapshots_staging (
 school_id integer NOT NULL,
 tenant_id text NOT NULL,
 binding_sha256 text NOT NULL CHECK(binding_sha256~'^[0-9a-f]{64}$'),
 revision integer NOT NULL CHECK(revision>=1),
 status text NOT NULL CHECK(status IN ('PUBLISHED_APPROVED','REVOKED')),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(school_id,tenant_id,binding_sha256,revision),
 FOREIGN KEY(school_id,tenant_id)
 REFERENCES public.phase3u_schools(id,tenant_id)
);
ALTER TABLE public.new_authoring_approved_snapshots_staging
 OWNER TO assps_p3u_schema_owner;
ALTER TABLE public.new_authoring_approved_snapshots_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.new_authoring_approved_snapshots_staging FORCE ROW LEVEL SECURITY;
CREATE POLICY phase3u_publisher_scope
 ON public.new_authoring_approved_snapshots_staging
 FOR ALL TO assps_p3u_schema_owner
 USING (school_id=public.phase3t_session_school_id()
    AND tenant_id=public.phase3t_session_tenant_id())
 WITH CHECK (school_id=public.phase3t_session_school_id()
    AND tenant_id=public.phase3t_session_tenant_id());
REVOKE ALL ON public.new_authoring_approved_snapshots_staging FROM PUBLIC;
-- Purpose-only snapshot function obtains SHARE lock within caller's transaction.
-- Table owner is a private NOLOGIN role; tenant login only has EXECUTE, not SELECT.
CREATE FUNCTION public.phase3t_lock_published_snapshot(
 p_school integer,p_tenant text,p_binding text,p_revision integer
) RETURNS TABLE(revision integer)
 LANGUAGE sql VOLATILE SECURITY DEFINER
 SET search_path=pg_catalog,public AS $locked$
 SELECT s.revision FROM public.new_authoring_approved_snapshots_staging AS s
 WHERE s.school_id=p_school AND s.tenant_id=p_tenant
 AND s.binding_sha256=p_binding AND s.revision=p_revision
 AND s.status='PUBLISHED_APPROVED'
 AND s.school_id=public.phase3t_session_school_id()
 AND s.tenant_id=public.phase3t_session_tenant_id()
 FOR SHARE
$locked$;
ALTER FUNCTION public.phase3t_lock_published_snapshot(integer,text,text,integer)
 OWNER TO assps_p3u_schema_owner;
REVOKE ALL ON FUNCTION public.phase3t_lock_published_snapshot(integer,text,text,integer)
 FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.phase3t_lock_published_snapshot(integer,text,text,integer)
 TO assps_p3t_school51,assps_p3t_school52;
CREATE TABLE public.new_authoring_drafts_staging (
 school_id integer NOT NULL,
 tenant_id text NOT NULL,
 draft_id text NOT NULL CHECK(length(draft_id) BETWEEN 3 AND 128),
 created_by integer NOT NULL,
 updated_by integer NOT NULL,
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status='DRAFT'),
 source_protected boolean NOT NULL DEFAULT FALSE CHECK(source_protected=FALSE),
 revision integer NOT NULL CHECK(revision>=1),
 native_json_text text NOT NULL CHECK(octet_length(native_json_text) BETWEEN 2 AND 5242880),
 native_sha256 text NOT NULL CHECK(
  native_sha256~'^[0-9a-f]{64}$' AND
  native_sha256=encode(sha256(convert_to(native_json_text,'UTF8')),'hex')),
 approved_snapshot_revision integer NOT NULL CHECK(approved_snapshot_revision>=1),
 approved_binding_sha256 text NOT NULL CHECK(approved_binding_sha256~'^[0-9a-f]{64}$'),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(school_id,tenant_id,draft_id),
 FOREIGN KEY(school_id,tenant_id,created_by)
 REFERENCES public.phase3u_users(school_id,tenant_id,id),
 FOREIGN KEY(school_id,tenant_id,updated_by)
 REFERENCES public.phase3u_users(school_id,tenant_id,id),
 FOREIGN KEY(school_id,tenant_id,approved_binding_sha256,approved_snapshot_revision)
 REFERENCES public.new_authoring_approved_snapshots_staging
 (school_id,tenant_id,binding_sha256,revision),
 CONSTRAINT phase3u_new_authoring_discriminator CHECK(
  ((native_json_text::jsonb->>'format')='assps-new-authoring-paper') IS TRUE
  AND ((native_json_text::jsonb->>'documentModel')='PaperDocumentNewAuthoring') IS TRUE
  AND ((native_json_text::jsonb->>'id')=draft_id) IS TRUE
  AND ((native_json_text::jsonb->'sourceIdentity'->>'draftId')=draft_id) IS TRUE
  AND ((native_json_text::jsonb->>'canonicalV13MigrationClaim')='false') IS TRUE)
);
ALTER TABLE public.new_authoring_drafts_staging OWNER TO assps_p3u_schema_owner;
CREATE TABLE public.new_authoring_revisions_staging (
 school_id integer NOT NULL,
 tenant_id text NOT NULL,
 draft_id text NOT NULL,
 revision integer NOT NULL CHECK(revision>=1),
 native_json_text text NOT NULL CHECK(octet_length(native_json_text) BETWEEN 2 AND 5242880),
 native_sha256 text NOT NULL CHECK(
  native_sha256~'^[0-9a-f]{64}$' AND
  native_sha256=encode(sha256(convert_to(native_json_text,'UTF8')),'hex')),
 previous_native_sha256 text CHECK(
  previous_native_sha256 IS NULL OR previous_native_sha256~'^[0-9a-f]{64}$'),
 actor_id integer NOT NULL,
 change_kind text NOT NULL CHECK(change_kind IN ('INITIAL_AUTHORING','DRAFT_CAS_REVISION')),
 recorded_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(school_id,tenant_id,draft_id,revision),
 FOREIGN KEY(school_id,tenant_id,draft_id)
 REFERENCES public.new_authoring_drafts_staging(school_id,tenant_id,draft_id),
 FOREIGN KEY(school_id,tenant_id,actor_id)
 REFERENCES public.phase3u_users(school_id,tenant_id,id),
 CHECK((revision=1 AND previous_native_sha256 IS NULL AND change_kind='INITIAL_AUTHORING')
  OR (revision>1 AND previous_native_sha256 IS NOT NULL AND change_kind='DRAFT_CAS_REVISION'))
);
ALTER TABLE public.new_authoring_revisions_staging OWNER TO assps_p3u_schema_owner;
-- Native source identity and approved snapshot cannot be quietly replaced via UPDATE.
CREATE FUNCTION public.phase3u_draft_guard() RETURNS trigger LANGUAGE plpgsql
 SET search_path=pg_catalog,public AS $draft_guard$
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.revision<>1 OR NEW.created_by<>NEW.updated_by
   THEN RAISE EXCEPTION 'PHASE3U: initial draft must start at revision one by its owner'; END IF;
 ELSIF TG_OP='UPDATE' THEN
  IF NEW.revision<>OLD.revision+1
   OR NEW.school_id IS DISTINCT FROM OLD.school_id
   OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
   OR NEW.draft_id IS DISTINCT FROM OLD.draft_id
   OR NEW.created_by IS DISTINCT FROM OLD.created_by
   OR NEW.status IS DISTINCT FROM OLD.status
   OR NEW.source_protected IS DISTINCT FROM OLD.source_protected
   OR NEW.approved_binding_sha256 IS DISTINCT FROM OLD.approved_binding_sha256
   OR NEW.approved_snapshot_revision IS DISTINCT FROM OLD.approved_snapshot_revision
   OR NEW.native_json_text::jsonb->'sourceIdentity' IS DISTINCT FROM OLD.native_json_text::jsonb->'sourceIdentity'
   OR NEW.native_json_text::jsonb->'sourceLedger' IS DISTINCT FROM OLD.native_json_text::jsonb->'sourceLedger'
  THEN RAISE EXCEPTION 'PHASE3U: exact source identity/ledger and monotonic CAS revision are immutable'; END IF;
 END IF;
 PERFORM 1 FROM public.phase3t_lock_published_snapshot(
  NEW.school_id,NEW.tenant_id,NEW.approved_binding_sha256,NEW.approved_snapshot_revision);
 IF NOT FOUND THEN RAISE EXCEPTION 'PHASE3U: publication missing or revoked'; END IF;
 RETURN NEW;
END $draft_guard$;
CREATE TRIGGER phase3u_new_authoring_draft_guard
 BEFORE INSERT OR UPDATE ON public.new_authoring_drafts_staging
 FOR EACH ROW EXECUTE FUNCTION public.phase3u_draft_guard();
CREATE FUNCTION public.phase3u_revision_immutable() RETURNS trigger LANGUAGE plpgsql
 SET search_path=pg_catalog,public AS $immutable$
BEGIN
 RAISE EXCEPTION 'PHASE3U: source-preserving new-authoring audit is append-only';
END $immutable$;
CREATE TRIGGER phase3u_new_authoring_revision_immutable
 BEFORE UPDATE OR DELETE ON public.new_authoring_revisions_staging
 FOR EACH ROW EXECUTE FUNCTION public.phase3u_revision_immutable();
CREATE FUNCTION public.phase3u_revision_append_guard() RETURNS trigger LANGUAGE plpgsql
 SET search_path=pg_catalog,public AS $rev_guard$
DECLARE d record;prior text;
BEGIN
 SELECT revision,native_json_text,native_sha256,status,source_protected,created_by
 INTO d FROM public.new_authoring_drafts_staging
 WHERE school_id=NEW.school_id AND tenant_id=NEW.tenant_id AND draft_id=NEW.draft_id FOR UPDATE;
 IF NOT FOUND OR d.revision<>NEW.revision
  OR d.native_json_text<>NEW.native_json_text OR d.native_sha256<>NEW.native_sha256
 THEN RAISE EXCEPTION 'PHASE3U: audit must match current exact draft native bytes'; END IF;
 IF NEW.revision=1 THEN
  IF NEW.change_kind<>'INITIAL_AUTHORING' OR NEW.previous_native_sha256 IS NOT NULL
   OR NEW.actor_id<>d.created_by
  THEN RAISE EXCEPTION 'PHASE3U: initial revision belongs to its creator'; END IF;
 ELSE
  IF NEW.change_kind<>'DRAFT_CAS_REVISION' OR d.status<>'DRAFT' OR d.source_protected<>FALSE
  THEN RAISE EXCEPTION 'PHASE3U: only independent DRAFT revisions may be appended'; END IF;
  SELECT native_sha256 INTO prior FROM public.new_authoring_revisions_staging
   WHERE school_id=NEW.school_id AND tenant_id=NEW.tenant_id
   AND draft_id=NEW.draft_id AND revision=NEW.revision-1;
  IF NOT FOUND OR prior<>NEW.previous_native_sha256
  THEN RAISE EXCEPTION 'PHASE3U: immutable predecessor SHA chain invalid'; END IF;
 END IF;
 RETURN NEW;
END $rev_guard$;
CREATE TRIGGER phase3u_new_authoring_revision_append_guard
 BEFORE INSERT ON public.new_authoring_revisions_staging
 FOR EACH ROW EXECUTE FUNCTION public.phase3u_revision_append_guard();
-- FORCE RLS applies even to ordinary relation owners. No header/GUC/OR fallback.
ALTER TABLE public.new_authoring_drafts_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.new_authoring_drafts_staging FORCE ROW LEVEL SECURITY;
ALTER TABLE public.new_authoring_revisions_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.new_authoring_revisions_staging FORCE ROW LEVEL SECURITY;
CREATE POLICY phase3u_school_tenant_scope ON public.new_authoring_drafts_staging
 AS PERMISSIVE FOR ALL TO assps_p3t_school51,assps_p3t_school52
 USING (school_id=public.phase3t_session_school_id()
    AND tenant_id=public.phase3t_session_tenant_id())
 WITH CHECK (school_id=public.phase3t_session_school_id()
    AND tenant_id=public.phase3t_session_tenant_id());
CREATE POLICY phase3u_school_tenant_scope ON public.new_authoring_revisions_staging
 AS PERMISSIVE FOR ALL TO assps_p3t_school51,assps_p3t_school52
 USING (school_id=public.phase3t_session_school_id()
    AND tenant_id=public.phase3t_session_tenant_id())
 WITH CHECK (school_id=public.phase3t_session_school_id()
    AND tenant_id=public.phase3t_session_tenant_id());
REVOKE ALL ON public.new_authoring_drafts_staging FROM PUBLIC;
REVOKE ALL ON public.new_authoring_revisions_staging FROM PUBLIC;
REVOKE ALL ON public.phase3u_schools FROM PUBLIC;
REVOKE ALL ON public.phase3u_users FROM PUBLIC;
GRANT SELECT,INSERT ON public.new_authoring_drafts_staging
 TO assps_p3t_school51,assps_p3t_school52;
GRANT UPDATE(native_json_text,native_sha256,revision,updated_by,updated_at)
 ON public.new_authoring_drafts_staging
 TO assps_p3t_school51,assps_p3t_school52;
GRANT SELECT,INSERT ON public.new_authoring_revisions_staging
 TO assps_p3t_school51,assps_p3t_school52;
-- No UPDATE/DELETE on revisions; no direct snapshot reads or publication mutation.
COMMIT;
