-- DBA-only prerequisite. Must be applied before any Paper Vault RLS rollout.
-- Both runtime roles must remain NOLOGIN, NOBYPASSRLS and non-superuser.
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='apex_paper_runtime')
    OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='apex_app_runtime') THEN
   RAISE EXCEPTION 'Required restricted runtime role missing';
 END IF;
 IF EXISTS (SELECT 1 FROM pg_roles
            WHERE rolname IN ('apex_paper_runtime','apex_app_runtime')
              AND (rolsuper OR rolbypassrls OR rolcanlogin)) THEN
   RAISE EXCEPTION 'Unsafe runtime role privileges';
 END IF;
END $$;
GRANT apex_paper_runtime TO apex_app_runtime WITH INHERIT FALSE, SET TRUE;
