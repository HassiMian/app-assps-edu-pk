-- ASSPS canonical SaaS application runtime RLS boundary v1.
-- DBA migration. It does not revoke the legacy login role or alter paper-specific roles.
-- Authenticated requests explicitly SET ROLE apex_app_runtime; bootstrap/auth/migrations keep the login role.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='apex_app_runtime') THEN
    CREATE ROLE apex_app_runtime NOLOGIN NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
  ELSE
    ALTER ROLE apex_app_runtime NOLOGIN NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
  END IF;
END $$;

-- PostgreSQL 16 membership options: the legacy login may explicitly SET ROLE only.
GRANT apex_app_runtime TO apexos_user WITH INHERIT FALSE, SET TRUE;
GRANT USAGE ON SCHEMA public TO apex_app_runtime;

-- Preserve dedicated Paper V6 ownership/runtime boundaries by granting only objects
-- owned by the legacy application role. Canonical paper registry objects are owned
-- by apex_paper_owner and therefore are deliberately excluded here.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, c.relname, c.relkind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public'
      AND pg_get_userbyid(c.relowner)='apexos_user'
      AND c.relkind IN ('r','p','v','m','f')
  LOOP
    IF r.relkind IN ('r','p','f') THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %I.%I TO apex_app_runtime', r.nspname, r.relname);
    ELSE
      EXECUTE format('GRANT SELECT ON TABLE %I.%I TO apex_app_runtime', r.nspname, r.relname);
    END IF;
  END LOOP;

  FOR r IN
    SELECT n.nspname, c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public'
      AND pg_get_userbyid(c.relowner)='apexos_user'
      AND c.relkind='S'
  LOOP
    EXECUTE format('GRANT USAGE, SELECT, UPDATE ON SEQUENCE %I.%I TO apex_app_runtime', r.nspname, r.relname);
  END LOOP;
END $$;

ALTER DEFAULT PRIVILEGES FOR ROLE apexos_user IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO apex_app_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE apexos_user IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO apex_app_runtime;

-- Every school_id table gets both a permissive access policy and a restrictive
-- guard scoped specifically to apex_app_runtime. The restrictive policy prevents
-- a legacy PUBLIC permissive policy from becoming a fail-open bypass.
DO $$
DECLARE r record;
DECLARE predicate text := '(current_setting(''app.is_super_admin'', true) = ''true'' OR school_id::text = NULLIF(current_setting(''app.tenant_id'', true), ''''))';
BEGIN
  FOR r IN
    SELECT DISTINCT c.table_name
    FROM information_schema.columns c
    JOIN pg_class pc ON pc.relname=c.table_name
      AND pc.relnamespace='public'::regnamespace
      AND pc.relkind IN ('r','p')
    WHERE c.table_schema='public' AND c.column_name='school_id'
    ORDER BY c.table_name
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.table_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', r.table_name);
    EXECUTE format('DROP POLICY IF EXISTS app_runtime_school_access ON public.%I', r.table_name);
    EXECUTE format('DROP POLICY IF EXISTS app_runtime_school_guard ON public.%I', r.table_name);
    EXECUTE format(
      'CREATE POLICY app_runtime_school_access ON public.%I AS PERMISSIVE FOR ALL TO apex_app_runtime USING (%s) WITH CHECK (%s)',
      r.table_name, predicate, predicate
    );
    EXECUTE format(
      'CREATE POLICY app_runtime_school_guard ON public.%I AS RESTRICTIVE FOR ALL TO apex_app_runtime USING (%s) WITH CHECK (%s)',
      r.table_name, predicate, predicate
    );
  END LOOP;
END $$;

-- The schools table is school-scoped by its primary key, not by a school_id column.
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_runtime_school_access ON public.schools;
DROP POLICY IF EXISTS app_runtime_school_guard ON public.schools;
CREATE POLICY app_runtime_school_access ON public.schools AS PERMISSIVE FOR ALL TO apex_app_runtime
  USING (current_setting('app.is_super_admin', true) = 'true' OR id::text = NULLIF(current_setting('app.tenant_id', true), ''))
  WITH CHECK (current_setting('app.is_super_admin', true) = 'true' OR id::text = NULLIF(current_setting('app.tenant_id', true), ''));
CREATE POLICY app_runtime_school_guard ON public.schools AS RESTRICTIVE FOR ALL TO apex_app_runtime
  USING (current_setting('app.is_super_admin', true) = 'true' OR id::text = NULLIF(current_setting('app.tenant_id', true), ''))
  WITH CHECK (current_setting('app.is_super_admin', true) = 'true' OR id::text = NULLIF(current_setting('app.tenant_id', true), ''));

-- Remaining tenant_id-only platform tables are scoped by the authenticated tenant key.
DO $$
DECLARE r record;
DECLARE predicate text := '(current_setting(''app.is_super_admin'', true) = ''true'' OR tenant_id::text = NULLIF(current_setting(''app.tenant_key'', true), ''''))';
BEGIN
  FOR r IN
    SELECT DISTINCT c.table_name
    FROM information_schema.columns c
    JOIN pg_class pc ON pc.relname=c.table_name
      AND pc.relnamespace='public'::regnamespace
      AND pc.relkind IN ('r','p')
    WHERE c.table_schema='public'
      AND c.column_name='tenant_id'
      AND c.table_name <> 'schools'
      AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns s
        WHERE s.table_schema='public' AND s.table_name=c.table_name AND s.column_name='school_id'
      )
    ORDER BY c.table_name
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.table_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', r.table_name);
    EXECUTE format('DROP POLICY IF EXISTS app_runtime_tenant_access ON public.%I', r.table_name);
    EXECUTE format('DROP POLICY IF EXISTS app_runtime_tenant_guard ON public.%I', r.table_name);
    EXECUTE format(
      'CREATE POLICY app_runtime_tenant_access ON public.%I AS PERMISSIVE FOR ALL TO apex_app_runtime USING (%s) WITH CHECK (%s)',
      r.table_name, predicate, predicate
    );
    EXECUTE format(
      'CREATE POLICY app_runtime_tenant_guard ON public.%I AS RESTRICTIVE FOR ALL TO apex_app_runtime USING (%s) WITH CHECK (%s)',
      r.table_name, predicate, predicate
    );
  END LOOP;
END $$;

COMMENT ON ROLE apex_app_runtime IS 'ASSPS authenticated application runtime role. NOLOGIN/NOBYPASSRLS; selected per request by database.js.';
