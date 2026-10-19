#!/usr/bin/env bash
# QA-ONLY: automatic isolated PostgreSQL16 environment; never target production.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
if [[ "${ASSPS_SIGNED85_QA:-}" != 1 ]]; then
  exec pg_virtualenv -v 16 -t env ASSPS_SIGNED85_QA=1 bash "$0"
fi
test -n "${PGPORT:-}"
test "$PGPORT" != 5432
test "$PGPORT" != 55432
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
node -e "process.stdout.write(require('$ROOT/al-siddique-backend/src/config/signedRlsCatalogGuard').documentPolicySql+';\\n')" > "$tmp/check.sql"

psql -X -q -v ON_ERROR_STOP=1 -d postgres <<'SQL'
CREATE ROLE apex_app_runtime NOLOGIN NOSUPERUSER NOBYPASSRLS;
CREATE TABLE public.school_documents (id integer PRIMARY KEY, school_id integer NOT NULL);
CREATE TABLE public.school_document_events (id integer PRIMARY KEY, school_id integer NOT NULL);
CREATE TABLE public.school_document_revisions (id integer PRIMARY KEY, school_id integer NOT NULL);
ALTER TABLE public.school_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_documents FORCE ROW LEVEL SECURITY;
ALTER TABLE public.school_document_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_document_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.school_document_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_document_revisions FORCE ROW LEVEL SECURITY;
CREATE POLICY school_documents_tenant_isolation ON public.school_documents
AS PERMISSIVE FOR ALL TO public
USING (current_setting('app.is_super_admin',true)='true'
 OR school_id::text=NULLIF(current_setting('app.tenant_id',true),''))
WITH CHECK (current_setting('app.is_super_admin',true)='true'
 OR school_id::text=NULLIF(current_setting('app.tenant_id',true),''));
CREATE POLICY school_documents_app_runtime_guard ON public.school_documents
AS RESTRICTIVE FOR ALL TO apex_app_runtime
USING (current_setting('app.is_super_admin',true)='true'
 OR school_id::text=NULLIF(current_setting('app.tenant_id',true),''))
WITH CHECK (current_setting('app.is_super_admin',true)='true'
 OR school_id::text=NULLIF(current_setting('app.tenant_id',true),''));
DO $rehearsal$
DECLARE rel text;
BEGIN
  FOREACH rel IN ARRAY ARRAY['school_document_events','school_document_revisions'] LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I AS PERMISSIVE FOR ALL TO apex_app_runtime USING (true) WITH CHECK (true)',rel||'_app_runtime',rel);
    EXECUTE format('CREATE POLICY %I ON public.%I AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true)',rel||'_tenant_fallback',rel);
    EXECUTE format($pol$
       CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO public
       USING (current_setting('app.rls_enabled',true)='true' AND
         (current_setting('app.is_super_admin',true)='true'
         OR school_id::text=NULLIF(current_setting('app.tenant_id',true),'')))
       WITH CHECK (current_setting('app.rls_enabled',true)='true' AND
         (current_setting('app.is_super_admin',true)='true'
         OR school_id::text=NULLIF(current_setting('app.tenant_id',true),'')))
    $pol$,rel||'_failclosed_20261019',rel);
  END LOOP;
END $rehearsal$;
SQL
check="$(psql -X -A -t -q -v ON_ERROR_STOP=1 -d postgres -f "$tmp/check.sql" | tr -d '[:space:]')"
echo "untampered_document_policy_attestation=$check"
test "$check" = 3
psql -X -q -v ON_ERROR_STOP=1 -d postgres <<'SQL'
ALTER POLICY school_document_events_failclosed_20261019 ON public.school_document_events
USING (current_setting('app.rls_enabled',true)='true' AND
 (current_setting('app.is_super_admin',true)='true' OR school_id::text=NULLIF(current_setting('app.tenant_id',true),''))
 OR true)
WITH CHECK (current_setting('app.rls_enabled',true)='true' AND
 (current_setting('app.is_super_admin',true)='true' OR school_id::text=NULLIF(current_setting('app.tenant_id',true),''))
 OR true);
SQL
check="$(psql -X -A -t -q -v ON_ERROR_STOP=1 -d postgres -f "$tmp/check.sql" | tr -d '[:space:]')"
echo "tampered_document_policy_attestation=$check"
test "$check" = 2
echo SIGNED85_EXACT_DOCUMENT_POLICY_TAMPER_REJECTED_PASS
