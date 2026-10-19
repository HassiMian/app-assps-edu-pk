-- QA ONLY. Additive, no UPDATE/DELETE against historical public.timetable.
-- Do not execute in production until signed runtime, grants, tenant and
-- authenticated teacher/peer-school release gates pass.
BEGIN;
CREATE TABLE IF NOT EXISTS public.school_timetable_drafts (
 id UUID PRIMARY KEY,
 school_id INTEGER NOT NULL REFERENCES public.schools(id),
 academic_session VARCHAR(32) NOT NULL,
 class_name VARCHAR(80) NOT NULL,
 section VARCHAR(80) NOT NULL,
 status VARCHAR(16) NOT NULL DEFAULT 'draft' CHECK(status='draft'),
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>=1),
 content JSONB NOT NULL,
 created_by TEXT NOT NULL,
 updated_by TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CONSTRAINT uq_school_timetable_draft_identity UNIQUE(school_id,academic_session,class_name,section),
 CONSTRAINT uq_school_timetable_draft_school_uuid UNIQUE(school_id,id),
 CONSTRAINT school_timetable_draft_json CHECK(jsonb_typeof(content)='object')
);
CREATE TABLE IF NOT EXISTS public.school_timetable_draft_revisions (
 school_id INTEGER NOT NULL,
 draft_id UUID NOT NULL,
 revision INTEGER NOT NULL CHECK(revision>=1),
 content JSONB NOT NULL CHECK(jsonb_typeof(content)='object'),
 actor_id TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY (draft_id,revision),
 CONSTRAINT fk_draft_revision_school FOREIGN KEY (school_id,draft_id)
  REFERENCES public.school_timetable_drafts(school_id,id)
);
CREATE INDEX IF NOT EXISTS idx_school_timetable_draft_scope
 ON public.school_timetable_drafts(school_id,academic_session,class_name,section);
DO $signed_guard$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='assps_core_green_runtime') OR
    to_regprocedure('core_security.signed_school_allowed(integer)') IS NULL THEN
  RAISE EXCEPTION 'Strict signed Core guard missing: stop timetable-draft migration';
 END IF;
END $signed_guard$;
REVOKE ALL ON public.school_timetable_drafts,public.school_timetable_draft_revisions FROM PUBLIC;
ALTER TABLE public.school_timetable_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_timetable_drafts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.school_timetable_draft_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_timetable_draft_revisions FORCE ROW LEVEL SECURITY;
DO $policies$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='school_timetable_drafts' AND policyname='school_timetable_draft_read') THEN
  CREATE POLICY school_timetable_draft_read ON public.school_timetable_drafts FOR SELECT TO assps_core_green_runtime
   USING (core_security.signed_school_allowed(school_id));
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='school_timetable_drafts' AND policyname='school_timetable_draft_create') THEN
  CREATE POLICY school_timetable_draft_create ON public.school_timetable_drafts FOR INSERT TO assps_core_green_runtime
   WITH CHECK (core_security.signed_school_allowed(school_id));
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='school_timetable_drafts' AND policyname='school_timetable_draft_update') THEN
  CREATE POLICY school_timetable_draft_update ON public.school_timetable_drafts FOR UPDATE TO assps_core_green_runtime
   USING (core_security.signed_school_allowed(school_id))
   WITH CHECK (core_security.signed_school_allowed(school_id));
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='school_timetable_draft_revisions' AND policyname='school_timetable_revision_read') THEN
  CREATE POLICY school_timetable_revision_read ON public.school_timetable_draft_revisions FOR SELECT TO assps_core_green_runtime
   USING (core_security.signed_school_allowed(school_id));
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='school_timetable_draft_revisions' AND policyname='school_timetable_revision_create') THEN
  CREATE POLICY school_timetable_revision_create ON public.school_timetable_draft_revisions FOR INSERT TO assps_core_green_runtime
   WITH CHECK (core_security.signed_school_allowed(school_id));
 END IF;
END $policies$;
GRANT SELECT,INSERT,UPDATE ON public.school_timetable_drafts TO assps_core_green_runtime;
GRANT SELECT,INSERT ON public.school_timetable_draft_revisions TO assps_core_green_runtime;
COMMIT;
