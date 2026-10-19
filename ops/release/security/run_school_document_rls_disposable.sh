#!/usr/bin/env bash
set -eo pipefail
if [ "$ASSPS_DISPOSABLE_RLS" != "1" ]; then
 exec pg_virtualenv -v 16 -t env ASSPS_DISPOSABLE_RLS=1 bash "$0" "$1" "$2"
fi
if [ -z "$PGPORT" ] || [ "$PGPORT" = "5432" ] || [ "$PGPORT" = "55432" ]; then echo UNSAFE_DATABASE_PORT; exit 2; fi
if [ -z "$PGHOST" ]; then echo PGHOST_NOT_ISOLATED; exit 2; fi
DATADIR=$(psql -X -A -t -v ON_ERROR_STOP=1 -d postgres -c "SHOW data_directory")
case "$DATADIR" in /tmp/pg_virtualenv.*) ;; *) echo RLS_MUST_BE_DISPOSABLE; exit 2 ;; esac
ARCHIVE="$1"
SQL="$2"
test -f "$ARCHIVE" && test -f "$SQL"
gzip -t "$ARCHIVE"
echo DISPOSABLE_SCHEMA_RESTORE_START
gzip -cd "$ARCHIVE" | sed -e '/^CREATE ROLE postgres;$/d' -e '/^ALTER ROLE postgres /d' -e '/^ALTER USER postgres /d' -e '/^CREATE DATABASE postgres WITH /d' -e '/^CREATE DATABASE postgres;$/d' | psql -X -q -v ON_ERROR_STOP=1 -d postgres >/dev/null
echo DISPOSABLE_POLICY_REHEARSAL
psql -X -A -t -v ON_ERROR_STOP=1 -d apexos -f "$SQL" | grep -E 'before_context|peer_school2|school1|disabled_flag'
echo DISPOSABLE_RLS_REHEARSAL_COMPLETED_NO_PRODUCTION_WRITES
