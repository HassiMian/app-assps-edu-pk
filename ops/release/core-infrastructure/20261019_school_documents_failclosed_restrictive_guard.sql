-- ASSPS additive RLS P0 hotfix: NO ROW DML; reversible with companion rollback.
-- Require explicit tenant-scoped, RLS-enabled context even if prior permissive
-- PUBLIC tenant_fallback allows all under an absent app.rls_enabled setting.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='12s';
DO $guard$
DECLARE t text;
BEGIN
  IF current_database() NOT IN ('apexos','postgres')
      OR current_setting('assps.document_rls_guard_approved',true) IS DISTINCT FROM '20261019_confirmed'
  THEN
    RAISE EXCEPTION 'ASSPS_DOCUMENT_RLS_GUARD_EXPLICIT_AUTHORIZATION_REQUIRED';
  END IF;
  FOREACH t IN ARRAY ARRAY['school_documents','school_document_events','school_document_revisions'] LOOP
    IF (SELECT count(*) FROM pg_policies
         WHERE schemaname='public' AND tablename=t
           AND policyname IN (t||'_tenant_fallback',t||'_app_runtime'))<>2
       OR (SELECT count(*) FROM pg_policies
         WHERE schemaname='public' AND tablename=t
           AND policyname=t||'_failclosed_20261019')<>0
       OR NOT (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class
               WHERE oid=to_regclass('public.'||t))
    THEN
      RAISE EXCEPTION 'DOCUMENT_POLICY_PREFLIGHT_FAIL_%',t;
    END IF;
  END LOOP;
END
$guard$;
CREATE POLICY school_documents_failclosed_20261019 ON public.school_documents
 AS RESTRICTIVE FOR ALL TO PUBLIC
 USING (current_setting('app.rls_enabled',true)='true' AND
  (current_setting('app.is_super_admin',true)='true'
    OR school_id::text=NULLIF(current_setting('app.tenant_id',true),'')))
 WITH CHECK (current_setting('app.rls_enabled',true)='true' AND
  (current_setting('app.is_super_admin',true)='true'
    OR school_id::text=NULLIF(current_setting('app.tenant_id',true),'')));
CREATE POLICY school_document_events_failclosed_20261019 ON public.school_document_events
 AS RESTRICTIVE FOR ALL TO PUBLIC
 USING (current_setting('app.rls_enabled',true)='true' AND
  (current_setting('app.is_super_admin',true)='true'
    OR school_id::text=NULLIF(current_setting('app.tenant_id',true),'')))
 WITH CHECK (current_setting('app.rls_enabled',true)='true' AND
  (current_setting('app.is_super_admin',true)='true'
    OR school_id::text=NULLIF(current_setting('app.tenant_id',true),'')));
CREATE POLICY school_document_revisions_failclosed_20261019 ON public.school_document_revisions
 AS RESTRICTIVE FOR ALL TO PUBLIC
 USING (current_setting('app.rls_enabled',true)='true' AND
  (current_setting('app.is_super_admin',true)='true'
    OR school_id::text=NULLIF(current_setting('app.tenant_id',true),'')))
 WITH CHECK (current_setting('app.rls_enabled',true)='true' AND
  (current_setting('app.is_super_admin',true)='true'
    OR school_id::text=NULLIF(current_setting('app.tenant_id',true),'')));
COMMIT;
