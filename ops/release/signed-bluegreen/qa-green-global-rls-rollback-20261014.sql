-- QA-ONLY exact reverse of qa-green-global-rls-stage-20261014.sql
\set ON_ERROR_STOP on
BEGIN;
DO $guard$
DECLARE rel text;
BEGIN
 IF current_database()<>'apexos' OR current_setting('port')<>'55483'
    OR COALESCE(inet_server_addr()::text,'')<>'' THEN
    RAISE EXCEPTION 'DISPOSABLE SOCKET QA PORT 55483 ONLY';
 END IF;
 FOREACH rel IN ARRAY ARRAY['admin_block_audit_log','ai_jobs',
   'ai_queue_events','ai_queue_state','campuses','organizations'] LOOP
   IF (SELECT count(*) FROM pg_policies WHERE schemaname='public'
      AND tablename=rel AND policyname IN
        ('assps_qa_legacy_global_service_v1',
         'assps_qa_green_unscoped_deny_v1'))<>2
   THEN RAISE EXCEPTION 'QA % missing expected policies',rel;END IF;
   IF (SELECT count(*) FROM pg_policies WHERE schemaname='public'
      AND tablename=rel)<>
      (CASE WHEN rel IN ('ai_jobs','ai_queue_events','ai_queue_state')
            THEN 3 ELSE 2 END)
   THEN RAISE EXCEPTION 'QA % unexpected additional policies',rel;END IF;
 END LOOP;
END $guard$;
-- Remove QA worker scope and identity before reverting global RLS changes.
DROP POLICY assps_qa_global_worker_service_v1 ON public.ai_jobs;
DROP POLICY assps_qa_global_worker_service_v1 ON public.ai_queue_events;
DROP POLICY assps_qa_global_worker_service_v1 ON public.ai_queue_state;
REVOKE USAGE,SELECT ON SEQUENCE public.ai_queue_events_id_seq FROM assps_qa_global_job_worker;
REVOKE SELECT,INSERT,UPDATE,DELETE ON public.ai_jobs FROM assps_qa_global_job_worker;
REVOKE SELECT,INSERT,DELETE ON public.ai_queue_events FROM assps_qa_global_job_worker;
REVOKE SELECT,INSERT,UPDATE ON public.ai_queue_state FROM assps_qa_global_job_worker;
REVOKE USAGE ON SCHEMA public FROM assps_qa_global_job_worker;
DROP ROLE assps_qa_global_job_worker;
DO $rollback$
DECLARE rel text;
BEGIN
 FOREACH rel IN ARRAY ARRAY['admin_block_audit_log','ai_jobs',
  'ai_queue_events','ai_queue_state','campuses','organizations'] LOOP
   EXECUTE format('DROP POLICY assps_qa_green_unscoped_deny_v1 ON public.%I',rel);
   EXECUTE format('DROP POLICY assps_qa_legacy_global_service_v1 ON public.%I',rel);
   EXECUTE format('ALTER TABLE public.%I NO FORCE ROW LEVEL SECURITY',rel);
   EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY',rel);
 END LOOP;
END $rollback$;
COMMIT;
