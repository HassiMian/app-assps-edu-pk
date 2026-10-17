-- ADDITIVE; QA FIRST. No alterations to students/results/marks, existing notices or timetable.
BEGIN;
CREATE TABLE IF NOT EXISTS public.school_documents (
 id UUID PRIMARY KEY,
 school_id INTEGER NOT NULL REFERENCES public.schools(id),
 reference_no VARCHAR(64),
 document_kind VARCHAR(60) NOT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'draft',
 title VARCHAR(220) NOT NULL,
 language VARCHAR(16) NOT NULL DEFAULT 'english',
 audience_kind VARCHAR(40) NOT NULL DEFAULT 'school',
 audience_classes JSONB NOT NULL DEFAULT '[]'::jsonb,
 source_type VARCHAR(50),
 source_ref VARCHAR(120),
 source_revision VARCHAR(120),
 layout_key VARCHAR(40) NOT NULL DEFAULT 'prism',
 content JSONB NOT NULL DEFAULT '{}'::jsonb,
 revision INTEGER NOT NULL DEFAULT 1,
 created_by TEXT NOT NULL,
 approved_by TEXT,
 approved_at TIMESTAMPTZ,
 published_by TEXT,
 published_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CONSTRAINT school_documents_status CHECK (status IN ('draft','submitted','approved','published','archived')),
 CONSTRAINT school_documents_kind CHECK (document_kind IN ('notice','circular','office_order','memo','general_datesheet','academic_timetable','bell_schedule','consent','staff_acknowledgement','custom')),
 CONSTRAINT school_documents_language CHECK (language IN ('english','urdu','bilingual')),
 CONSTRAINT school_documents_revision CHECK (revision >= 1),
 CONSTRAINT school_documents_content_object CHECK (jsonb_typeof(content)='object'),
 CONSTRAINT school_documents_audience_array CHECK (jsonb_typeof(audience_classes)='array')
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_school_documents_reference ON public.school_documents(school_id,reference_no) WHERE reference_no IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_school_documents_school_status ON public.school_documents(school_id,status,created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_school_documents_school_id ON public.school_documents(school_id,id);
CREATE TABLE IF NOT EXISTS public.school_document_events (
 id BIGSERIAL PRIMARY KEY,
 school_id INTEGER NOT NULL,
 document_id UUID NOT NULL,
 revision INTEGER NOT NULL,
 action VARCHAR(24) NOT NULL,
 actor_id TEXT NOT NULL,
 event_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
 occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CONSTRAINT fk_events_school_document FOREIGN KEY (school_id,document_id) REFERENCES public.school_documents(school_id,id)
);
CREATE INDEX IF NOT EXISTS idx_school_document_events_scope ON public.school_document_events(school_id,document_id,occurred_at DESC);
CREATE TABLE IF NOT EXISTS public.school_document_revisions (
 school_id INTEGER NOT NULL,
 document_id UUID NOT NULL,
 revision INTEGER NOT NULL,
 status VARCHAR(20) NOT NULL,
 title VARCHAR(220) NOT NULL,
 content JSONB NOT NULL,
 content_sha256 CHAR(64) NOT NULL,
 actor_id TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(document_id,revision),
 CONSTRAINT fk_revisions_school_document FOREIGN KEY (school_id,document_id) REFERENCES public.school_documents(school_id,id),
 CONSTRAINT school_doc_revision_content_object CHECK (jsonb_typeof(content)='object')
);
CREATE INDEX IF NOT EXISTS idx_school_document_revisions_school ON public.school_document_revisions(school_id,document_id,revision DESC);

-- Least-privilege signed SaaS runtime authorization; no unscoped data access.
-- All schema and RLS policies commit atomically or roll back together.
DO $security_ready$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='assps_core_green_runtime') OR
    to_regprocedure('core_security.signed_school_allowed(integer)') IS NULL THEN
  RAISE EXCEPTION 'Signed Core tenant guard is unavailable; abort Notice Studio migration';
 END IF;
END $security_ready$;
REVOKE ALL ON public.school_documents, public.school_document_events, public.school_document_revisions FROM PUBLIC;
ALTER TABLE public.school_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_documents FORCE ROW LEVEL SECURITY;
ALTER TABLE public.school_document_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_document_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.school_document_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_document_revisions FORCE ROW LEVEL SECURITY;
DO $policies$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='school_documents' AND policyname='school_documents_tenant_read') THEN
  CREATE POLICY school_documents_tenant_read ON public.school_documents FOR SELECT TO assps_core_green_runtime
  USING (core_security.signed_school_allowed(school_id));
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='school_documents' AND policyname='school_documents_tenant_insert') THEN
  CREATE POLICY school_documents_tenant_insert ON public.school_documents FOR INSERT TO assps_core_green_runtime
  WITH CHECK (core_security.signed_school_allowed(school_id));
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='school_documents' AND policyname='school_documents_tenant_update') THEN
  CREATE POLICY school_documents_tenant_update ON public.school_documents FOR UPDATE TO assps_core_green_runtime
  USING (core_security.signed_school_allowed(school_id))
  WITH CHECK (core_security.signed_school_allowed(school_id));
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='school_document_events' AND policyname='school_document_events_tenant_read') THEN
  CREATE POLICY school_document_events_tenant_read ON public.school_document_events FOR SELECT TO assps_core_green_runtime
  USING (core_security.signed_school_allowed(school_id));
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='school_document_events' AND policyname='school_document_events_tenant_insert') THEN
  CREATE POLICY school_document_events_tenant_insert ON public.school_document_events FOR INSERT TO assps_core_green_runtime
  WITH CHECK (core_security.signed_school_allowed(school_id));
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='school_document_revisions' AND policyname='school_document_revisions_tenant_read') THEN
  CREATE POLICY school_document_revisions_tenant_read ON public.school_document_revisions FOR SELECT TO assps_core_green_runtime
  USING (core_security.signed_school_allowed(school_id));
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='school_document_revisions' AND policyname='school_document_revisions_tenant_insert') THEN
  CREATE POLICY school_document_revisions_tenant_insert ON public.school_document_revisions FOR INSERT TO assps_core_green_runtime
  WITH CHECK (core_security.signed_school_allowed(school_id));
 END IF;
END $policies$;
GRANT SELECT,INSERT,UPDATE ON public.school_documents TO assps_core_green_runtime;
GRANT SELECT,INSERT ON public.school_document_events TO assps_core_green_runtime;
GRANT SELECT,INSERT ON public.school_document_revisions TO assps_core_green_runtime;
GRANT USAGE ON SEQUENCE public.school_document_events_id_seq TO assps_core_green_runtime;
COMMIT;
