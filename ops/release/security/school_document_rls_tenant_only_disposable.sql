-- DISPOSABLE CLONE ONLY. No live database execution.
BEGIN;
DO $$
DECLARE t text; suffix text; policy_name text;
DECLARE expr text := '(current_setting(''app.rls_enabled'',true) = ''true'' AND school_id::text = NULLIF(current_setting(''app.tenant_id'',true),''''))';
BEGIN
 FOR t IN SELECT unnest(ARRAY['school_documents','school_document_events','school_document_revisions']) LOOP
  FOR suffix IN SELECT unnest(ARRAY['_app_runtime','_tenant_fallback']) LOOP
   policy_name:=t||suffix;
   IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname=policy_name) THEN
     RAISE EXCEPTION 'SOURCE_POLICY_MISSING_%',policy_name;
   END IF;
   EXECUTE format('ALTER POLICY %I ON public.%I USING (%s) WITH CHECK (%s)',policy_name,t,expr,expr);
  END LOOP;
 END LOOP;
END $$;
SET LOCAL ROLE apexos_user;
SELECT 'before_context',COUNT(*)::int FROM public.school_documents;
SELECT set_config('app.rls_enabled','true',true);
SELECT set_config('app.is_super_admin','false',true);
SELECT set_config('app.tenant_id','2',true);
SELECT 'peer_school2',COUNT(*)::int FROM public.school_documents;
SELECT set_config('app.tenant_id','1',true);
SELECT 'school1',COUNT(*)::int FROM public.school_documents;
SELECT set_config('app.rls_enabled','false',true);
SELECT 'disabled_flag',COUNT(*)::int FROM public.school_documents;
RESET ROLE;
ROLLBACK;
