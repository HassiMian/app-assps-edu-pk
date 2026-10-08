\set ON_ERROR_STOP on
-- EXPLICITLY DISPOSABLE-SCHEMA CLONE. NEVER RUN ON PRODUCTION.
DO $$
BEGIN
  IF current_database() != 'assps_core_rls_clone_20261008' THEN
    RAISE EXCEPTION 'Refusing fixture in non-disposable database';
  END IF;
END $$;
INSERT INTO public.schools(id,name,code) VALUES
  (900001,'Synthetic Security Campus A','SECURITY-CLONE-A'),
  (900002,'Synthetic Security Campus B','SECURITY-CLONE-B')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO public.students(school_id,gr_number,name,class) VALUES
  (900001,'CORE-RLS-SYN-A','Synthetic A Student','9'),
  (900002,'CORE-RLS-SYN-B','Synthetic B Student','9')
  ON CONFLICT (gr_number) DO NOTHING;
INSERT INTO public.users(school_id,name,email,password,role) VALUES
  (900001,'Synthetic A Teacher','core-security-a@example.invalid','test-only-not-a-login','teacher'),
  (900002,'Synthetic B Teacher','core-security-b@example.invalid','test-only-not-a-login','teacher')
  ON CONFLICT (email) DO NOTHING;
-- ACLs are intentionally missing from the schema-only/no-acl dump.
-- Apply these test grants in the isolated clone ONLY.
GRANT USAGE ON SCHEMA public TO apex_app_runtime;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.schools,public.students,public.users TO apex_app_runtime;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO apex_app_runtime;
