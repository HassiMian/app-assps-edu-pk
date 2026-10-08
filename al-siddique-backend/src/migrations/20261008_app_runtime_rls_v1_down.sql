-- Rollback for 20261008_app_runtime_rls_v1.sql.
-- Use only after DB_RUNTIME_ROLE is removed from the application environment and the backend is restarted.

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname AS table_name
    FROM pg_class c
    WHERE c.relnamespace='public'::regnamespace AND c.relkind IN ('r','p')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS app_runtime_school_access ON public.%I', r.table_name);
    EXECUTE format('DROP POLICY IF EXISTS app_runtime_school_guard ON public.%I', r.table_name);
    EXECUTE format('DROP POLICY IF EXISTS app_runtime_tenant_access ON public.%I', r.table_name);
    EXECUTE format('DROP POLICY IF EXISTS app_runtime_tenant_guard ON public.%I', r.table_name);
  END LOOP;
END $$;

-- These tables were not RLS-enabled before v1. Preserve the prior production state on rollback.
DO $$
DECLARE table_name text;
DECLARE prior_unprotected text[] := ARRAY[
  'admissions','date_sheet_records','demo_requests','employee_attendance',
  'exam_class_enrollments','exam_subjects','expenses','family_groups',
  'fee_payment_transactions','grade_settings','invoices','library_books',
  'message_drafts','notices','online_exam_attempts','online_exams',
  'paper_vault','paper_vault_revision_history','payments','portal_identity_handoffs',
  'saved_papers','schools','subscription_requests','teacher_class_assignments',
  'tenant_branding','transport_routes'
];
BEGIN
  FOREACH table_name IN ARRAY prior_unprotected LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I NO FORCE ROW LEVEL SECURITY', table_name);
      EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', table_name);
    END IF;
  END LOOP;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='apex_app_runtime') THEN
    REVOKE apex_app_runtime FROM apexos_user;
    ALTER DEFAULT PRIVILEGES FOR ROLE apexos_user IN SCHEMA public
      REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM apex_app_runtime;
    ALTER DEFAULT PRIVILEGES FOR ROLE apexos_user IN SCHEMA public
      REVOKE USAGE, SELECT, UPDATE ON SEQUENCES FROM apex_app_runtime;
    DROP OWNED BY apex_app_runtime;
    DROP ROLE apex_app_runtime;
  END IF;
END $$;
