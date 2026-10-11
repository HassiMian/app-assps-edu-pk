-- Metadata-only, scoped rollback. No movement history or student rows touched.
\set ON_ERROR_STOP on
BEGIN;
DO $audit_backout_guard$
BEGIN
 IF current_user <> 'postgres' OR NOT (
   (current_database()='apexos' AND current_setting('port')='5432') OR
   (current_database()='assps_promote_audit_rehearsal_20261011' AND current_setting('port')='55432')
 ) THEN RAISE EXCEPTION 'Refuse unexpected audit rollback target'; END IF;
 IF (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='student_class_movement_audit'
   AND policyname IN ('assps_audit_tenant_allow','assps_audit_tenant_guard'))<>2 THEN
   RAISE EXCEPTION 'Audit rollback requires exact two policies';
 END IF;
END $audit_backout_guard$;
REVOKE INSERT ON TABLE public.student_class_movement_audit FROM assps_marks_signed_runtime;
REVOKE USAGE ON SEQUENCE public.student_class_movement_audit_id_seq FROM assps_marks_signed_runtime;
DROP POLICY assps_audit_tenant_guard ON public.student_class_movement_audit;
DROP POLICY assps_audit_tenant_allow ON public.student_class_movement_audit;
ALTER TABLE public.student_class_movement_audit NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.student_class_movement_audit DISABLE ROW LEVEL SECURITY;
COMMIT;
