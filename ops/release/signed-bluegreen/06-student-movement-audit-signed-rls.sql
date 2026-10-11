-- Additive, separately reviewed security gate for the existing class-movement
-- audit table. Never invoke from an HTTP request. Preserves all audit rows.
\set ON_ERROR_STOP on
BEGIN;
DO $audit_preflight$
DECLARE
  table_id oid;
BEGIN
  IF current_user <> 'postgres' OR NOT (
    (current_database()='apexos' AND current_setting('port')='5432') OR
    (current_database()='assps_promote_audit_rehearsal_20261011' AND current_setting('port')='55432')
  ) THEN RAISE EXCEPTION 'Refuse unexpected audit security target/privilege'; END IF;
  table_id := to_regclass('public.student_class_movement_audit');
  IF table_id IS NULL OR to_regclass('public.student_class_movement_audit_id_seq') IS NULL OR
    to_regnamespace('core_security') IS NULL OR
    NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='assps_marks_signed_runtime' AND
      NOT rolcanlogin AND NOT rolbypassrls AND NOT rolsuper) THEN
    RAISE EXCEPTION 'Audit table, sequence, signed schema or restricted role missing';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_class WHERE oid=table_id AND (relrowsecurity OR relforcerowsecurity)) OR
     EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='student_class_movement_audit') OR
     has_table_privilege('assps_marks_signed_runtime',table_id,'INSERT') THEN
    RAISE EXCEPTION 'Audit preexisting RLS/policy/grant drift: manual reconciliation required';
  END IF;
END $audit_preflight$;
REVOKE ALL ON TABLE public.student_class_movement_audit FROM PUBLIC;
REVOKE ALL ON SEQUENCE public.student_class_movement_audit_id_seq FROM PUBLIC;
ALTER TABLE public.student_class_movement_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_class_movement_audit FORCE ROW LEVEL SECURITY;
CREATE POLICY assps_audit_tenant_allow ON public.student_class_movement_audit
  AS PERMISSIVE FOR INSERT TO assps_marks_signed_runtime
  WITH CHECK (core_security.signed_school_allowed(school_id));
CREATE POLICY assps_audit_tenant_guard ON public.student_class_movement_audit
  AS RESTRICTIVE FOR INSERT TO assps_marks_signed_runtime
  WITH CHECK (core_security.signed_school_allowed(school_id));
GRANT INSERT ON TABLE public.student_class_movement_audit TO assps_marks_signed_runtime;
GRANT USAGE ON SEQUENCE public.student_class_movement_audit_id_seq TO assps_marks_signed_runtime;
DO $audit_postflight$
BEGIN
 IF (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='student_class_movement_audit'
    AND policyname IN ('assps_audit_tenant_allow','assps_audit_tenant_guard'))<>2 OR
    NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='public.student_class_movement_audit'::regclass AND relrowsecurity AND relforcerowsecurity) OR
    has_table_privilege('assps_marks_signed_runtime','public.student_class_movement_audit','SELECT') OR
    has_table_privilege('assps_marks_signed_runtime','public.student_class_movement_audit','DELETE') OR
    has_table_privilege('assps_marks_signed_runtime','public.student_class_movement_audit','UPDATE') OR
    NOT has_table_privilege('assps_marks_signed_runtime','public.student_class_movement_audit','INSERT') THEN
   RAISE EXCEPTION 'Signed student movement audit postflight NO-GO';
 END IF;
END $audit_postflight$;
COMMIT;
