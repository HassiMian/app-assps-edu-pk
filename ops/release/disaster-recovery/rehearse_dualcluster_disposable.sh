#!/usr/bin/env bash
set -eo pipefail
if [ "$ASSPS_RESTORE_DISPOSABLE" != "1" ]; then
 exec pg_virtualenv -v 16 -t env ASSPS_RESTORE_DISPOSABLE=1 bash "$0" "$1" "$2"
fi
test -n "$PGPORT"
test "$PGPORT" != "5432"
test "$PGPORT" != "55432"
DATADIR=$(psql -X -A -t -v ON_ERROR_STOP=1 -d postgres -c "SHOW data_directory")
case "$DATADIR" in /tmp/pg_virtualenv.*) ;; *) echo RESTORE_MUST_BE_DISPOSABLE; exit 2 ;; esac
SRC="$1"
LABEL="$2"
LOG="/root/secure-archive/assps-restore-rehearsal-20261019/restore_$LABEL.log"
umask 077
echo "ARCHIVE_CHECK:$LABEL"
gzip -t "$SRC"
echo "STARTING_LOCAL_DISPOSABLE_RESTORE:$LABEL"
if gzip -cd "$SRC" | sed -e '/^CREATE ROLE postgres;$/d' -e '/^ALTER ROLE postgres /d' -e '/^ALTER USER postgres /d' -e '/^CREATE DATABASE postgres WITH /d' -e '/^CREATE DATABASE postgres;$/d' | psql -X -q -v ON_ERROR_STOP=1 -d postgres > "$LOG" 2>&1; then
 echo "RESTORE_EXIT:0"
 psql -X -A -t -v ON_ERROR_STOP=1 -d postgres -c "SELECT 'db_count',count(*) FROM pg_database WHERE datistemplate=false"
 if psql -X -A -t -d apexos -c "SELECT count(*) FROM public.students" >/dev/null 2>&1; then
  psql -X -A -t -d apexos -c "SELECT 'students',count(*) FROM public.students UNION ALL SELECT 'exams',count(*) FROM public.exam_results ORDER BY 1;"
 fi
else
 echo "RESTORE_EXIT:NONZERO"
 echo "ERROR_SUMMARY_NOT_DATA:"
 grep -E '^psql:.*(ERROR|FATAL):' "$LOG" | cut -d: -f1-3 | head -5
 exit 2
fi
echo "DISPOSABLE_RESTORE_VERIFIED:$LABEL"
psql -X -A -t -d postgres -c "SELECT datname FROM pg_database WHERE datistemplate=false ORDER BY datname" | head -12
