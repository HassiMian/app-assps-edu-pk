#!/usr/bin/env bash
# Full-ACL, independent private socket clone of PRODUCTION data. QA ONLY.
set -Eeuo pipefail
umask 077
QA=/var/lib/postgresql/assps-connect-integrated-55477-20261014
PORT=55477
B=/root/assps-release-backups/connect-full-recovery-20261014T170713Z
SOURCE="$(cd "$(dirname "$0")" && pwd)"
cleanup(){
 runuser -u postgres -- /usr/lib/postgresql/16/bin/pg_ctl -D "$QA" -m immediate stop >/dev/null 2>&1 || :
 if [ "$QA" = /var/lib/postgresql/assps-connect-integrated-55477-20261014 ];then
   runuser -u postgres -- rm -rf -- "$QA" 2>/dev/null || :
 fi
}
test ! -e "$QA" || { echo QA_DIRECTORY_OCCUPIED;exit 3; }
if ss -lnt | grep -q ":$PORT ";then echo QA_PORT_OCCUPIED;exit 3;fi
(cd "$B" && sha256sum -c SHA256SUMS >/dev/null)
trap cleanup EXIT
mkdir -m 700 "$QA";chown postgres:postgres "$QA"
runuser -u postgres -- /usr/lib/postgresql/16/bin/initdb -D "$QA" -A peer --no-instructions >/dev/null
runuser -u postgres -- /usr/lib/postgresql/16/bin/pg_ctl -D "$QA" -o "-p $PORT -h '' -k /var/run/postgresql" -l "$QA/qa.log" start >/dev/null
echo QA_CLONE_START_AND_PRIVATE_FULL_ACL_BACKUP_VERIFIED
# No staff passwords, no synthetic teacher impersonation.
runuser -u postgres -- psql -X -q -A -t -p5432 -d postgres -v ON_ERROR_STOP=1 -c "SELECT format('CREATE ROLE %I NOLOGIN;',rolname) FROM pg_roles WHERE left(rolname,3)<>'pg_' AND rolname<>'postgres' ORDER BY rolname;" | runuser -u postgres -- psql -X -q -p "$PORT" -d postgres -v ON_ERROR_STOP=1 >/dev/null
runuser -u postgres -- psql -X -q -p "$PORT" -d postgres -v ON_ERROR_STOP=1 -c "GRANT apex_app_runtime TO assps_core_green_runtime WITH INHERIT TRUE, SET FALSE;" >/dev/null
runuser -u postgres -- createdb -p "$PORT" apexos
runuser -u postgres -- pg_restore -p "$PORT" -d apexos --exit-on-error < "$B/apexos-full.dump" >/dev/null
echo QA_ORIGINAL_OWNERS_AND_ACL_RESTORED
# Run the Core owner's previously certified role-scoped QA migration
# against clone only, then independent source-owner acceptance checks.
runuser -u postgres -- psql -X -q -p "$PORT" -d apexos -v ON_ERROR_STOP=1 < "$SOURCE/qa-six-global-leastpriv-20261014.sql" >/dev/null
echo QA_SIX_GLOBAL_LEAST_PRIVILEGE_SQL_STAGED
python3 "$SOURCE/test-six-global-isolation-on-clone-20261014.py"
echo QA_EXECUTABLE_CERTIFICATION_PASS_WITH_SCOPE_ISOLATED
