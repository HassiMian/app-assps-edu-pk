-- ASSPS candidate additive migration. QA first, DO NOT execute on live as-is.
-- Real subject authorizations stay in existing teacher_class_assignments.
BEGIN;
DO $ready$
BEGIN
 IF to_regprocedure('core_security.signed_school_allowed(integer)') IS NULL
 OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='assps_core_green_runtime') THEN
   RAISE EXCEPTION 'SIGNED_TENANT_POLICY_PREREQUISITES_UNMET';
 END IF;
END $ready$;
CREATE TABLE IF NOT EXISTS public.school_subject_catalog (
 id BIGSERIAL PRIMARY KEY,
 school_id INTEGER NOT NULL REFERENCES public.schools(id),
 subject_key VARCHAR(80) NOT NULL,
 name_en VARCHAR(140) NOT NULL,
 name_ur VARCHAR(140),
 category VARCHAR(60),
 is_active BOOLEAN NOT NULL DEFAULT true,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CONSTRAINT subject_key_format CHECK(subject_key ~ '^[a-z][a-z0-9_]{1,79}$'),
 UNIQUE(school_id,subject_key), UNIQUE(school_id,id)
);
CREATE TABLE IF NOT EXISTS public.teacher_subject_profiles (
 id BIGSERIAL PRIMARY KEY,
 school_id INTEGER NOT NULL REFERENCES public.schools(id),
 employee_id INTEGER NOT NULL,
 teacher_user_id INTEGER NOT NULL,
 subject_id BIGINT NOT NULL,
 academic_session VARCHAR(24) NOT NULL,
 status VARCHAR(16) NOT NULL DEFAULT 'proposed',
 evidence_reference TEXT NOT NULL,
 approved_by INTEGER,
 approved_at TIMESTAMPTZ,
 created_by INTEGER NOT NULL,
 version INTEGER NOT NULL DEFAULT 1,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CONSTRAINT teacher_profile_status CHECK(status IN ('proposed','approved','retired')),
 CONSTRAINT teacher_profile_version CHECK(version > 0),
 CONSTRAINT teacher_profile_subject_school FOREIGN KEY(school_id,subject_id)
   REFERENCES public.school_subject_catalog(school_id,id),
 UNIQUE(school_id,employee_id,subject_id,academic_session),
 UNIQUE(school_id,id)
);
CREATE TABLE IF NOT EXISTS public.school_class_incharges (
 id BIGSERIAL PRIMARY KEY,
 school_id INTEGER NOT NULL REFERENCES public.schools(id),
 academic_session VARCHAR(24) NOT NULL,
 class_name VARCHAR(80) NOT NULL,
 section VARCHAR(80) NOT NULL DEFAULT '',
 employee_id INTEGER NOT NULL,
 teacher_user_id INTEGER NOT NULL,
 assignment_role VARCHAR(16) NOT NULL DEFAULT 'primary',
 status VARCHAR(16) NOT NULL DEFAULT 'proposed',
 source_reference TEXT NOT NULL,
 approved_by INTEGER,
 approved_at TIMESTAMPTZ,
 effective_from DATE,
 effective_to DATE,
 version INTEGER NOT NULL DEFAULT 1,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CONSTRAINT school_incharge_role CHECK(assignment_role IN ('primary','assistant')),
 CONSTRAINT school_incharge_status CHECK(status IN ('proposed','approved','retired')),
 CONSTRAINT school_incharge_dates CHECK(effective_to IS NULL OR effective_from IS NULL OR effective_to >= effective_from),
 CONSTRAINT school_incharge_version CHECK(version > 0),
 UNIQUE(school_id,id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_school_class_approved_primary_incharge
 ON public.school_class_incharges(school_id,academic_session,LOWER(BTRIM(class_name)),LOWER(BTRIM(section)))
 WHERE status='approved' AND assignment_role='primary' AND effective_to IS NULL;
CREATE TABLE IF NOT EXISTS public.school_teacher_profile_events (
 id BIGSERIAL PRIMARY KEY,
 school_id INTEGER NOT NULL REFERENCES public.schools(id),
 profile_kind VARCHAR(32) NOT NULL,
 record_id BIGINT NOT NULL,
 event_kind VARCHAR(24) NOT NULL,
 actor_id INTEGER NOT NULL,
 details JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
REVOKE ALL ON public.school_subject_catalog, public.teacher_subject_profiles,
 public.school_class_incharges, public.school_teacher_profile_events FROM PUBLIC;
ALTER TABLE public.school_subject_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_subject_catalog FORCE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_subject_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_subject_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.school_class_incharges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_class_incharges FORCE ROW LEVEL SECURITY;
ALTER TABLE public.school_teacher_profile_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_teacher_profile_events FORCE ROW LEVEL SECURITY;
DO $policy$
DECLARE t TEXT;
BEGIN
 FOREACH t IN ARRAY ARRAY['school_subject_catalog','teacher_subject_profiles','school_class_incharges','school_teacher_profile_events']
 LOOP
  EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO assps_core_green_runtime USING (core_security.signed_school_allowed(school_id))', t||'_signed_read', t);
  EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO assps_core_green_runtime WITH CHECK (core_security.signed_school_allowed(school_id))',t||'_signed_insert',t);
 END LOOP;
 CREATE POLICY subject_profiles_signed_update ON public.teacher_subject_profiles FOR UPDATE
 TO assps_core_green_runtime USING (core_security.signed_school_allowed(school_id))
 WITH CHECK (core_security.signed_school_allowed(school_id));
 CREATE POLICY school_incharge_signed_update ON public.school_class_incharges FOR UPDATE
 TO assps_core_green_runtime USING (core_security.signed_school_allowed(school_id))
 WITH CHECK (core_security.signed_school_allowed(school_id));
END $policy$;
GRANT SELECT,INSERT ON public.school_subject_catalog TO assps_core_green_runtime;
GRANT SELECT,INSERT,UPDATE ON public.teacher_subject_profiles TO assps_core_green_runtime;
GRANT SELECT,INSERT,UPDATE ON public.school_class_incharges TO assps_core_green_runtime;
GRANT SELECT,INSERT ON public.school_teacher_profile_events TO assps_core_green_runtime;
GRANT USAGE ON SEQUENCE public.school_subject_catalog_id_seq,public.teacher_subject_profiles_id_seq,
 public.school_class_incharges_id_seq,public.school_teacher_profile_events_id_seq TO assps_core_green_runtime;
COMMIT;
