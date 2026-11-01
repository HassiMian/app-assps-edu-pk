-- Rollback candidate (only with verified DBA approval and a matching release).
DROP INDEX CONCURRENTLY IF EXISTS public.uq_exams_school_normalized_identity;
