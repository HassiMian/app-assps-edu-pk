#!/usr/bin/env bash
# STRICT: isolated PG16 disposable fictional fixture; no live DB credentials, no live writes.
set -eo pipefail
if [ "$ASSPS_DISPOSABLE_PG" != "1" ]; then
  exec pg_virtualenv -v 16 -t env ASSPS_DISPOSABLE_PG=1 bash "$0"
fi
if [ "$PGPORT" = "5432" ] || [ -z "$PGPORT" ]; then
  echo "FAIL: not in a confirmed disposable PG16 instance" >&2
  exit 3
fi
psql -X -v ON_ERROR_STOP=1 -q -d postgres <<'SQL'
CREATE ROLE qa_assps_document_runtime NOLOGIN NOSUPERUSER NOBYPASSRLS;
CREATE TABLE public.qa_school_documents (id integer PRIMARY KEY, school_id integer NOT NULL);
INSERT INTO public.qa_school_documents VALUES (1,101),(2,202);
ALTER TABLE public.qa_school_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_school_documents FORCE ROW LEVEL SECURITY;
GRANT SELECT ON public.qa_school_documents TO qa_assps_document_runtime;
CREATE POLICY qa_document_legacy_tenant_fallback
ON public.qa_school_documents AS PERMISSIVE TO PUBLIC
USING (
  current_setting('app.rls_enabled',true) IS DISTINCT FROM 'true'
  OR current_setting('app.is_super_admin',true)='true'
  OR school_id = NULLIF(current_setting('app.tenant_id',true),'')::integer
);
SQL
test_case() {
  local name="$1" expected="$2" sql="$3" actual
  actual="$(psql -X -A -t -q -v ON_ERROR_STOP=1 -d postgres -c "$sql" | tr -d '[:space:]')"
  printf '%s: expected=%s actual=%s\n' "$name" "$expected" "$actual"
  [ "$actual" = "$expected" ]
}
test_case "LEGACY_PUBLIC_FALLBACK_MISSING_CONTEXT" 2 \
  "BEGIN READ ONLY; SET LOCAL ROLE qa_assps_document_runtime; SELECT count(*) FROM public.qa_school_documents; ROLLBACK;"
psql -X -v ON_ERROR_STOP=1 -q -d postgres <<'SQL'
DROP POLICY qa_document_legacy_tenant_fallback ON public.qa_school_documents;
CREATE POLICY qa_document_scoped_fallback
ON public.qa_school_documents AS PERMISSIVE TO PUBLIC
USING (
  current_setting('app.rls_enabled',true)='true'
  AND (
    current_setting('app.is_super_admin',true)='true'
    OR school_id = NULLIF(current_setting('app.tenant_id',true),'')::integer
  )
);
SQL
test_case "HARDENED_MISSING_CONTEXT_DENIED" 0 \
  "BEGIN READ ONLY; SET LOCAL ROLE qa_assps_document_runtime; SELECT count(*) FROM public.qa_school_documents; ROLLBACK;"
test_case "HARDENED_TENANT_101_ONLY" 1 \
  "BEGIN READ ONLY; SET LOCAL ROLE qa_assps_document_runtime; SET LOCAL app.rls_enabled = 'true'; SET LOCAL app.tenant_id = '101'; SELECT count(*) FROM public.qa_school_documents; ROLLBACK;"
test_case "HARDENED_TENANT_202_ONLY" 1 \
  "BEGIN READ ONLY; SET LOCAL ROLE qa_assps_document_runtime; SET LOCAL app.rls_enabled = 'true'; SET LOCAL app.tenant_id = '202'; SELECT count(*) FROM public.qa_school_documents; ROLLBACK;"
test_case "HARDENED_UNKNOWN_TENANT_DENIED" 0 \
  "BEGIN READ ONLY; SET LOCAL ROLE qa_assps_document_runtime; SET LOCAL app.rls_enabled = 'true'; SET LOCAL app.tenant_id = '303'; SELECT count(*) FROM public.qa_school_documents; ROLLBACK;"
echo 'DISPOSABLE_PG16_DOCUMENT_RLS_REHEARSAL_PASS; NEVER A LIVE SECURITY CERTIFICATE'
