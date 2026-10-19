-- QA ONLY; blocked on production port and without explicit isolated QA setting.
-- Do not run in production. All relevant authorized HTTP services require regression.
BEGIN;
SET LOCAL lock_timeout='2s';
DO $guard$
DECLARE t text;
BEGIN
 IF current_setting('port')::int IN (5432,55432) OR current_setting('assps.qa_only',true) IS DISTINCT FROM '1' THEN
  RAISE EXCEPTION 'DISPOSABLE_PG_ONLY';
 END IF;
 FOREACH t IN ARRAY ARRAY['school_documents','school_document_events','school_document_revisions'] LOOP
  IF (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname IN (t||'_app_runtime', t||'_tenant_fallback')) <> 2 THEN
   RAISE EXCEPTION 'EXPECTED_POLICY_MISSING_%',t;
  END IF;
  IF NOT (SELECT c.relrowsecurity AND c.relforcerowsecurity FROM pg_class c WHERE c.oid=to_regclass('public.'||t)) THEN
   RAISE EXCEPTION 'FORCED_RLS_MISSING_%',t;
  END IF;
 END LOOP;
END
$guard$;
DO $apply$
DECLARE t text; p text;
DECLARE predicate text := $$current_setting('app.rls_enabled',true)='true'
    AND (current_setting('app.is_super_admin',true)='true'
      OR school_id::text=NULLIF(current_setting('app.tenant_id',true),''))$$;
BEGIN
 FOREACH t IN ARRAY ARRAY['school_documents','school_document_events','school_document_revisions'] LOOP
  FOREACH p IN ARRAY ARRAY[t||'_app_runtime',t||'_tenant_fallback'] LOOP
   EXECUTE format('ALTER POLICY %I ON public.%I USING (%s) WITH CHECK (%s)',p,t,predicate,predicate);
  END LOOP;
 END LOOP;
END
$apply$;
COMMIT;
