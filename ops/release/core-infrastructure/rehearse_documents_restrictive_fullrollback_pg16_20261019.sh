#!/usr/bin/env bash
set -eo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
if [ "$ASSPS_DOC_QA_INSTANCE" != '1' ]; then
 exec pg_virtualenv -v 16 -t env ASSPS_DOC_QA_INSTANCE=1 bash "$0"
fi
test -n "$PGPORT"
test "$PGPORT" != '5432'
test "$PGPORT" != '55432'
psql -X -q -v ON_ERROR_STOP=1 -d postgres <<'SQL'
CREATE ROLE apex_app_runtime NOLOGIN NOSUPERUSER NOBYPASSRLS;
CREATE ROLE apexos_user NOLOGIN NOSUPERUSER NOBYPASSRLS;
DO $init$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['school_documents','school_document_events','school_document_revisions'] LOOP
  EXECUTE format('CREATE TABLE public.%I(id integer PRIMARY KEY,school_id integer NOT NULL)',t);
  EXECUTE format('INSERT INTO public.%I VALUES (1,101),(2,202)',t);
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('GRANT SELECT,INSERT ON public.%I TO apex_app_runtime,apexos_user',t);
  EXECUTE format('CREATE POLICY %I ON public.%I AS PERMISSIVE FOR ALL TO PUBLIC USING (current_setting(''app.rls_enabled'',true) IS DISTINCT FROM ''true'' OR current_setting(''app.is_super_admin'',true)=''true'' OR school_id = NULLIF(current_setting(''app.tenant_id'',true),'''')::integer)',t||'_tenant_fallback',t);
  EXECUTE format('CREATE POLICY %I ON public.%I AS PERMISSIVE FOR ALL TO apex_app_runtime USING (current_setting(''app.is_super_admin'',true)=''true'' OR school_id::text = NULLIF(current_setting(''app.tenant_id'',true),'''')) WITH CHECK (current_setting(''app.is_super_admin'',true)=''true'' OR school_id::text = NULLIF(current_setting(''app.tenant_id'',true),''''))', t||'_app_runtime',t);
 END LOOP;
END
$init$;
SQL
count3() {
 local expected="$1" role="$2" context="$3" actual
 actual="$(psql -X -A -t -q -v ON_ERROR_STOP=1 -d postgres -c "BEGIN READ ONLY; SET LOCAL ROLE $role; $context SELECT (SELECT count(*) FROM public.school_documents)+(SELECT count(*) FROM public.school_document_events)+(SELECT count(*) FROM public.school_document_revisions); ROLLBACK;" | tr -d '[:space:]')"
 echo "$role expected=$expected actual=$actual context_label=$4"
 test "$expected" = "$actual"
}
count3 6 apex_app_runtime '' BEFORE_UNSAFE
count3 6 apexos_user '' BEFORE_LEGACY_UNSAFE
printf "SET assps.document_rls_guard_approved TO '20261019_confirmed';\n\\i %s\n" "$DIR/20261019_school_documents_failclosed_restrictive_guard.sql" | psql -X -q -v ON_ERROR_STOP=1 -d postgres
for role in apex_app_runtime apexos_user; do
 count3 0 "$role" '' DEFAULT_DENY
 count3 3 "$role" "SET LOCAL app.rls_enabled='true'; SET LOCAL app.is_super_admin='false'; SET LOCAL app.tenant_id='101';" SCHOOL_101
 count3 3 "$role" "SET LOCAL app.rls_enabled='true'; SET LOCAL app.is_super_admin='false'; SET LOCAL app.tenant_id='202';" SCHOOL_202
 count3 0 "$role" "SET LOCAL app.rls_enabled='true'; SET LOCAL app.is_super_admin='false'; SET LOCAL app.tenant_id='303';" SCHOOL_303
 count3 0 "$role" "SET LOCAL app.tenant_id='101';" MISSING_FLAG
 count3 6 "$role" "SET LOCAL app.rls_enabled='true'; SET LOCAL app.is_super_admin='true';" EXPLICIT_ADMIN
done
v="$(psql -X -A -t -q -d postgres -c "SELECT COUNT(*) FROM pg_policies WHERE schemaname='public' AND permissive='RESTRICTIVE' AND policyname LIKE '%_failclosed_20261019'")"
test "$v" = 3
printf "SET assps.document_rls_rollback_approved TO '20261019_confirmed';\n\\i %s\n" "$DIR/20261019_school_documents_failclosed_restrictive_rollback.sql" | psql -X -q -v ON_ERROR_STOP=1 -d postgres
count3 6 apex_app_runtime '' ROLLBACK_RESTORES_ORIGINAL
count3 6 apexos_user '' ROLLBACK_RESTORES_LEGACY
echo THREE_TABLE_TWO_ROLE_TWELVE_SCOPED_CASES_AND_ROLLBACK_PASS
