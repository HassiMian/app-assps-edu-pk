#!/usr/bin/env bash
set -eo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
if [ "$ASSPS_QA_INSTANCE" != "1" ]; then
  exec pg_virtualenv -v 16 -t env ASSPS_QA_INSTANCE=1 bash "$0"
fi
test -n "$PGPORT"
test "$PGPORT" != "5432"
psql -X -q -v ON_ERROR_STOP=1 -d postgres <<'SQL'
CREATE ROLE apex_app_runtime NOLOGIN NOSUPERUSER NOBYPASSRLS;
DO $init$
DECLARE t text;
BEGIN
 FOR t IN SELECT unnest(ARRAY['school_documents','school_document_events','school_document_revisions']) LOOP
  EXECUTE format('CREATE TABLE public.%I (id integer PRIMARY KEY, school_id integer NOT NULL)', t);
  EXECUTE format('INSERT INTO public.%I VALUES (1,101),(2,202)',t);
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('GRANT SELECT,INSERT ON public.%I TO apex_app_runtime',t);
  EXECUTE format('CREATE POLICY %I ON public.%I AS PERMISSIVE FOR ALL TO PUBLIC USING (current_setting(''app.rls_enabled'',true) IS DISTINCT FROM ''true'' OR current_setting(''app.is_super_admin'',true)=''true'' OR school_id = NULLIF(current_setting(''app.tenant_id'',true),'''')::integer)', t||'_tenant_fallback',t);
  EXECUTE format('CREATE POLICY %I ON public.%I AS PERMISSIVE FOR ALL TO apex_app_runtime USING (current_setting(''app.is_super_admin'',true)=''true'' OR school_id::text = NULLIF(current_setting(''app.tenant_id'',true),'''')) WITH CHECK (current_setting(''app.is_super_admin'',true)=''true'' OR school_id::text = NULLIF(current_setting(''app.tenant_id'',true),''''))', t||'_app_runtime',t);
 END LOOP;
END
$init$;
SQL
readcount() {
 local label="$1" expected="$2" setup="$3" actual
 actual="$(psql -X -A -t -q -v ON_ERROR_STOP=1 -d postgres -c "BEGIN READ ONLY; SET LOCAL ROLE apex_app_runtime; $setup SELECT (SELECT count(*) FROM public.school_documents)+(SELECT count(*) FROM public.school_document_events)+(SELECT count(*) FROM public.school_document_revisions); ROLLBACK;" | tr -d '[:space:]')"
 echo "$label expected=$expected actual=$actual"
 test "$actual" = "$expected"
}
readcount OLD_UNSCOPED 6 ""
printf "SET assps.qa_only TO '1';\n\\i %s\n" "$ROOT/assps_document_rls_scoped_QA_ONLY_20261019.sql" | psql -X -q -v ON_ERROR_STOP=1 -d postgres
readcount MISSING_TENANT_DEFAULT_DENY 0 ""
readcount TENANT_101 3 "SET LOCAL app.rls_enabled='true'; SET LOCAL app.is_super_admin='false'; SET LOCAL app.tenant_id='101';"
readcount TENANT_202 3 "SET LOCAL app.rls_enabled='true'; SET LOCAL app.is_super_admin='false'; SET LOCAL app.tenant_id='202';"
readcount TENANT_303_DENIED 0 "SET LOCAL app.rls_enabled='true'; SET LOCAL app.is_super_admin='false'; SET LOCAL app.tenant_id='303';"
readcount FLAG_MISSING_BUT_TENANT_SET_DENIED 0 "SET LOCAL app.tenant_id='101';"
readcount SUPERADMIN_EXPLICIT_FLAG 6 "SET LOCAL app.rls_enabled='true'; SET LOCAL app.is_super_admin='true';"
echo FULL_THREE_TABLE_RLS_MIGRATION_DISPOSABLE_PG16_PASS
