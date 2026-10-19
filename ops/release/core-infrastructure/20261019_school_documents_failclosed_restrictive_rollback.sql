-- Surgical rollback ONLY for 20261019 restrictive RLS guard.
-- Does not alter old PUBLIC/app_runtime policies or school data.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='12s';
DO $guard$
BEGIN
 IF current_database() NOT IN ('apexos','postgres')
 OR current_setting('assps.document_rls_rollback_approved',true)
 IS DISTINCT FROM '20261019_confirmed'
 THEN RAISE EXCEPTION 'ASSPS_DOCUMENT_RLS_ROLLBACK_EXPLICIT_AUTHORIZATION_REQUIRED'; END IF;
 IF (SELECT count(*) FROM pg_policies
      WHERE schemaname='public'
      AND policyname=tablename||'_failclosed_20261019'
      AND tablename IN ('school_documents','school_document_events','school_document_revisions'))<>3
 THEN RAISE EXCEPTION 'DOCUMENT_RLS_ROLLBACK_EXPECTED_3_GUARDS'; END IF;
END
$guard$;
DROP POLICY school_documents_failclosed_20261019 ON public.school_documents;
DROP POLICY school_document_events_failclosed_20261019 ON public.school_document_events;
DROP POLICY school_document_revisions_failclosed_20261019 ON public.school_document_revisions;
COMMIT;
