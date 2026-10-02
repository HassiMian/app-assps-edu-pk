-- Phase 3G. DANGEROUS IF MISDIRECTED: permitted ONLY in newly created disposable,
-- synthetic-only 127.0.0.1:55439 database named assps_paper_phase3f_ci.
-- NEVER import into config/migrate.js, application startup or production.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$
BEGIN
 IF current_database()<>'assps_paper_phase3f_ci'
  OR current_setting('port')<>'55439'
  OR current_setting('listen_addresses')<>'127.0.0.1'
 THEN
  RAISE EXCEPTION 'PHASE3G REFUSE: non-disposable target';
 END IF;
 IF to_regclass('public.paper_documents') IS NOT NULL
  OR to_regclass('public.paper_revisions') IS NOT NULL
  OR to_regclass('public.schools') IS NOT NULL
  OR to_regclass('public.users') IS NOT NULL
 THEN RAISE EXCEPTION 'PHASE3G REFUSE: target is not a pristine synthetic database';
 END IF;
END
$guard$;
CREATE TABLE public.schools (id INTEGER PRIMARY KEY);
CREATE TABLE public.users (
 id INTEGER PRIMARY KEY,
 school_id INTEGER NOT NULL REFERENCES public.schools(id)
);
CREATE TABLE public.paper_documents (
 school_id INTEGER NOT NULL REFERENCES public.schools(id),
 id TEXT NOT NULL CHECK (length(id) BETWEEN 1 AND 160),
 created_by INTEGER NOT NULL REFERENCES public.users(id),
 status TEXT NOT NULL CHECK (status IN ('DRAFT','APPROVED','LOCKED','SOURCE_REFERENCE')),
 source_protected BOOLEAN NOT NULL DEFAULT TRUE,
 revision INTEGER NOT NULL CHECK (revision>=1),
 native_json_text TEXT NOT NULL CHECK (octet_length(native_json_text) BETWEEN 2 AND 5242880),
 native_sha256 TEXT NOT NULL CHECK (
  native_sha256 ~ '^[0-9a-f]{64}$' AND
  native_sha256=encode(sha256(convert_to(native_json_text,'UTF8')),'hex')
 ),
 updated_by INTEGER NOT NULL REFERENCES public.users(id),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CONSTRAINT paper_documents_pkey PRIMARY KEY (school_id,id)
);
CREATE TABLE public.paper_revisions (
 school_id INTEGER NOT NULL,
 document_id TEXT NOT NULL,
 revision INTEGER NOT NULL CHECK (revision>=1),
 native_json_text TEXT NOT NULL CHECK (octet_length(native_json_text) BETWEEN 2 AND 5242880),
 native_sha256 TEXT NOT NULL CHECK (
  native_sha256 ~ '^[0-9a-f]{64}$' AND
  native_sha256=encode(sha256(convert_to(native_json_text,'UTF8')),'hex')
 ),
 previous_native_sha256 TEXT NULL CHECK (
  previous_native_sha256 IS NULL OR previous_native_sha256 ~ '^[0-9a-f]{64}$'
 ),
 actor_id INTEGER NOT NULL REFERENCES public.users(id),
 change_kind TEXT NOT NULL CHECK (change_kind IN ('INITIAL_SEED','DRAFT_CAS_REVISION')),
 recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CONSTRAINT paper_revisions_pkey PRIMARY KEY (school_id,document_id,revision),
 CONSTRAINT paper_revisions_document_fk
 FOREIGN KEY (school_id,document_id) REFERENCES public.paper_documents(school_id,id),
 CONSTRAINT paper_revisions_previous_check CHECK (
  (revision=1 AND previous_native_sha256 IS NULL) OR
  (revision>1 AND previous_native_sha256 IS NOT NULL)
 )
);
CREATE FUNCTION public.phase3g_revision_immutable() RETURNS TRIGGER
LANGUAGE plpgsql AS $function$
BEGIN
 RAISE EXCEPTION 'ASSPS synthetic staging paper revisions are append-only'
  USING ERRCODE='55000';
END
$function$;
CREATE TRIGGER paper_revisions_immutable
BEFORE UPDATE OR DELETE ON public.paper_revisions
FOR EACH ROW EXECUTE FUNCTION public.phase3g_revision_immutable();
CREATE FUNCTION public.phase3g_revision_insert_guard() RETURNS TRIGGER
LANGUAGE plpgsql AS $function$
DECLARE d RECORD; prev TEXT;
BEGIN
 SELECT revision,native_json_text,native_sha256,status,source_protected
 INTO d FROM public.paper_documents
 WHERE school_id=NEW.school_id AND id=NEW.document_id FOR UPDATE;
 IF NOT FOUND OR d.revision<>NEW.revision OR
   d.native_json_text<>NEW.native_json_text OR d.native_sha256<>NEW.native_sha256
 THEN RAISE EXCEPTION 'revision must match exact current school-scoped document';
 END IF;
 IF NEW.revision=1 THEN
  IF NEW.change_kind<>'INITIAL_SEED' OR current_user<>'assps_p3g_admin' THEN
   RAISE EXCEPTION 'first immutable revision must be created only by trusted bootstrap';
  END IF;
 ELSE
  IF NEW.change_kind<>'DRAFT_CAS_REVISION' OR
   d.status<>'DRAFT' OR d.source_protected<>FALSE THEN
   RAISE EXCEPTION 'only unlocked DRAFT copies can append revisions';
  END IF;
  SELECT native_sha256 INTO prev FROM public.paper_revisions
  WHERE school_id=NEW.school_id AND document_id=NEW.document_id AND revision=NEW.revision-1;
  IF NOT FOUND OR prev<>NEW.previous_native_sha256 THEN
   RAISE EXCEPTION 'immutable previous revision SHA chain mismatch';
  END IF;
 END IF;
 RETURN NEW;
END
$function$;
CREATE TRIGGER paper_revisions_valid_append
BEFORE INSERT ON public.paper_revisions
FOR EACH ROW EXECUTE FUNCTION public.phase3g_revision_insert_guard();
ALTER TABLE public.paper_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_documents FORCE ROW LEVEL SECURITY;
ALTER TABLE public.paper_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_revisions FORCE ROW LEVEL SECURITY;
CREATE POLICY paper_school_strict ON public.paper_documents
AS PERMISSIVE FOR ALL TO assps_p3g_app
USING (school_id=NULLIF(current_setting('app.paper_school_id',true),'')::integer)
WITH CHECK (school_id=NULLIF(current_setting('app.paper_school_id',true),'')::integer);
CREATE POLICY paper_school_strict ON public.paper_revisions
AS PERMISSIVE FOR ALL TO assps_p3g_app
USING (school_id=NULLIF(current_setting('app.paper_school_id',true),'')::integer)
WITH CHECK (school_id=NULLIF(current_setting('app.paper_school_id',true),'')::integer);
REVOKE ALL ON public.paper_documents FROM PUBLIC;
REVOKE ALL ON public.paper_revisions FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO assps_p3g_app;
GRANT SELECT ON public.paper_documents TO assps_p3g_app;
GRANT UPDATE(native_json_text,native_sha256,revision,updated_by,updated_at)
 ON public.paper_documents TO assps_p3g_app;
GRANT SELECT,INSERT ON public.paper_revisions TO assps_p3g_app;
COMMIT;
