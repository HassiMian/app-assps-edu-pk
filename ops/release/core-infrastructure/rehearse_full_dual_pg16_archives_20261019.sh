#!/usr/bin/env bash
set -euo pipefail
umask 077
OUT=/root/secure-archive/assps-dual-archive-local-restore-20261019
mkdir -p "$OUT"
chmod 700 "$OUT"
LABEL="$1"
ARCHIVE="$2"
if [ "$LABEL" != 'main' ] && [ "$LABEL" != 'signed' ]; then exit 5; fi
if [ "$ASSPS_RESTORE_QA_CHILD" != '1' ]; then
 printf '%s\n' "START $LABEL $(date -u +%FT%TZ)" > "$OUT/$LABEL.status"
 exec pg_virtualenv -v 16 -t env ASSPS_RESTORE_QA_CHILD=1 bash "$0" "$LABEL" "$ARCHIVE"
fi
if [ "$PGPORT" = '5432' ] || [ "$PGPORT" = '55432' ]; then
 echo 'PROD_PORT_REJECTED'; exit 7
fi
data_dir="$(psql -X -A -t -d postgres -c 'SHOW data_directory' | tr -d '[:space:]')"
case "$data_dir" in /tmp/pg_virtualenv.*/data/16/regress) ;; *) echo 'NON_QA_CLUSTER_REJECTED'; exit 8;; esac
test "$(df -Pk / | awk 'NR==2 {print $4}')" -gt 6000000
gzip -t "$ARCHIVE"
echo "QA_ISOLATION_CONFIRMED:$LABEL:$PGPORT"
if gzip -cd "$ARCHIVE" | sed -e "/^CREATE ROLE postgres;$/d" -e "/^ALTER ROLE postgres WITH /d" | psql -X -q -v ON_ERROR_STOP=1 -d postgres > "$OUT/$LABEL.restore.log" 2>&1; then
 echo "RESTORE_COMMAND_PASS:$LABEL"
else
 code="$?"
 echo "RESTORE_COMMAND_FAILED:$LABEL"
 printf '%s\n' "FAIL $LABEL $(date -u +%FT%TZ) command=$code" > "$OUT/$LABEL.status"
 exit "$code"
fi
counts="$(psql -X -A -t -d postgres -c 'SELECT count(*) FROM pg_database WHERE NOT datistemplate' | tr -d '[:space:]')"
if [ "$LABEL" = main ]; then
 test "$counts" -ge 62
 realcounts="$(psql -X -A -t -d apexos -c "SELECT (SELECT count(*) FROM public.students)::text||'/'||(SELECT count(*) FROM public.exam_results)::text" | tr -d '[:space:]')"
 test "$realcounts" = '322/1854'
else
 test "$counts" -ge 34
 realcounts='N/A'
fi
printf '%s\n' "PASS $LABEL $(date -u +%FT%TZ) databases=$counts critical_counts=$realcounts" > "$OUT/$LABEL.status"
echo "VERIFIED_DISPOSABLE_RESTORE:$LABEL:databases=$counts:critical_counts=$realcounts"
