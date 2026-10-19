#!/usr/bin/env bash
# Ephemeral pg_virtualenv-only syntax/guard test. NO live database or private data.
set -euo pipefail
MIG="$(cd "$(dirname "$0")" && pwd)/002_school_timetable_drafts_QA_ONLY.sql"
export MIG
pg_virtualenv -v 16 bash <<'QA_EPHEMERAL_SHELL'
set -euo pipefail
test -n "${PGPORT:-}"
psql -X -v ON_ERROR_STOP=1 -c "CREATE TABLE public.schools(id integer PRIMARY KEY)" >/dev/null
if psql -X -v ON_ERROR_STOP=1 -f "$MIG" >/dev/null 2>&1; then
  echo UNSAFE_MIGRATION_ACCEPTED_UNSIGNED_CONTEXT
  exit 11
fi
after="$(psql -X -A -t -c "SELECT COALESCE(to_regclass('public.school_timetable_drafts')::text,'MISSING')")"
test "$after" = "MISSING"
echo "PASS_FAIL_CLOSED_NO_SIGNED_GUARD_ROLLBACK"
psql -X -v ON_ERROR_STOP=1 >/dev/null <<'QA_ROLE_SETUP'
CREATE ROLE assps_core_green_runtime NOLOGIN;
CREATE SCHEMA core_security;
CREATE FUNCTION core_security.signed_school_allowed(integer) RETURNS boolean
 LANGUAGE sql STABLE AS $$ SELECT false $$;
QA_ROLE_SETUP
psql -X -v ON_ERROR_STOP=1 -f "$MIG" >/dev/null
echo "PASS_ADDITIVE_SCHEMA_APPLIED_ONLY_TO_EPHEMERAL_PG"
psql -X -A -t -c "SELECT relname||'|RLS='||relrowsecurity||'|FORCE='||relforcerowsecurity FROM pg_class WHERE relname LIKE 'school_timetable_draft%' AND relkind='r' ORDER BY relname"
count="$(psql -X -A -t -c "SELECT count(*) FROM pg_policies WHERE tablename IN ('school_timetable_drafts','school_timetable_draft_revisions')")"
test "$count" = "5"
echo "PASS_FIVE_SCHOOL_SCOPED_RLS_POLICIES"
QA_EPHEMERAL_SHELL
