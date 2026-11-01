-- Run standalone (CREATE INDEX CONCURRENTLY cannot execute inside BEGIN).
-- Preflight: verify zero duplicates on normalized (school, name, class, session).
-- Adds a technical duplicate-exam guard. Does NOT create Assessment 5.
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uq_exams_school_normalized_identity
ON public.exams (
 (COALESCE(school_id,-1)),
 LOWER(BTRIM(name)),
 (CASE WHEN LOWER(BTRIM(class))='pre-nine' THEN 'pre nine' ELSE LOWER(BTRIM(class)) END),
 COALESCE(session,'')
);
