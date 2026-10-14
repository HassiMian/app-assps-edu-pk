#!/usr/bin/env bash
# Real Node/pg worker adapter acceptance against a disposable restored DB ONLY.
set -Eeuo pipefail
umask 077
PORT=55477
Q=/var/lib/postgresql/assps-node-ai-worker-qa-55477-20261015
BK=/root/assps-release-backups/core-six-global-precutover-20261014T183510Z
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
MARKER=/var/run/postgresql
cleanup(){
 runuser -u postgres -- /usr/lib/postgresql/16/bin/pg_ctl -D "$Q" -m immediate stop >/dev/null 2>&1 || :
 if [ "$Q" = '/var/lib/postgresql/assps-node-ai-worker-qa-55477-20261015' ];then
   runuser -u postgres -- rm -rf -- "$Q" >/dev/null 2>&1 || :
 fi
}
test ! -e "$Q" || { echo QA_DIRECTORY_ALREADY_EXISTS;exit 3; }
! ss -lnt | grep -q ":$PORT " || { echo QA_PORT_IN_USE;exit 3; }
(cd "$BK" && sha256sum -c SHA256SUMS >/dev/null)
trap cleanup EXIT
mkdir -m700 "$Q";chown postgres:postgres "$Q"
runuser -u postgres -- /usr/lib/postgresql/16/bin/initdb -D "$Q" -A peer --no-instructions >/dev/null
# QA socket only: require real SCRAM for the temporary worker test login.
sed -i '1i local apexos assps_core_qa_login scram-sha-256' "$Q/pg_hba.conf"
chown postgres:postgres "$Q/pg_hba.conf"
runuser -u postgres -- /usr/lib/postgresql/16/bin/pg_ctl -D "$Q" -o "-p $PORT -h '' -k /var/run/postgresql" -l "$Q/log" start >/dev/null
echo QA_PG_SOCKET_ONLY_STARTED
# Copy role NAMES only; no production role passwords, staff credentials or users.
runuser -u postgres -- psql -X -q -t -A -v ON_ERROR_STOP=1 -p5432 -d postgres  -c "SELECT format('CREATE ROLE %I NOLOGIN;',rolname) FROM pg_roles WHERE left(rolname,3)<>'pg_' AND rolname<>'postgres' ORDER BY rolname" |
 runuser -u postgres -- psql -X -q -v ON_ERROR_STOP=1 -p"$PORT" -d postgres >/dev/null
runuser -u postgres -- psql -X -q -v ON_ERROR_STOP=1 -p"$PORT" -d postgres  -c "GRANT apex_app_runtime TO assps_core_green_runtime WITH INHERIT TRUE, SET FALSE" >/dev/null
runuser -u postgres -- createdb -p"$PORT" apexos
runuser -u postgres -- pg_restore -p"$PORT" -d apexos --exit-on-error < "$BK/apexos-full.dump" >/dev/null
echo QA_FULL_ACL_RESTORE_VERIFIED
data_before=$(runuser -u postgres -- psql -X -q -A -t -p"$PORT" -d apexos  -c "SELECT count(*)||':'||count(*) FILTER (WHERE marks_obtained=0) FROM exam_results WHERE school_id=1 AND exam_id=9")
test "$data_before" = '1762:213' || { echo QA_MARKS_RESTORE_NOT_MATCHED;exit 3; }
SOURCE="$ROOT/ops/release/signed-bluegreen/qa-six-global-leastpriv-20261014.sql"
runuser -u postgres -- psql -X -q -v ON_ERROR_STOP=1 -p"$PORT" -d apexos < "$SOURCE" >/dev/null
echo QA_CORE_LEASTPRIV_POLICY_STAGED
# A genuinely authenticated, ephemeral QA LOGIN only; never a real employee.
# Ephemeral password is kept in shell memory and never echoed/logged/stored.
password=$(openssl rand -hex 32)
hmac=$(openssl rand -hex 32)
runuser -u postgres -- psql -X -q -v ON_ERROR_STOP=1 -p"$PORT" -d apexos >/dev/null <<SQL
CREATE ROLE assps_core_qa_login LOGIN INHERIT NOSUPERUSER NOBYPASSRLS PASSWORD '$password';
GRANT assps_core_qa_ai_worker TO assps_core_qa_login WITH INHERIT TRUE, SET FALSE;
SQL
echo QA_EPHEMERAL_SCRAM_LOGIN_CREATED
# LIVE application code path: SQL through actual workerQuery + node-postgres.
# Export only inside the isolated QA shell. Secrets are not in env(1) argv.
export NODE_PATH=/var/www/apex-backend/node_modules NODE_ENV=test
export DB_STARTUP_PROBE=false ASSPS_ISOLATED_QA=yes
export DB_SIGNED_TENANT_RLS_ENABLED=true DB_ENFORCE_LEAST_PRIVILEGE_LOGIN=true
export DB_AUTH_USE_SIGNED_TENANT_CONTEXT=true DB_SIGNED_TENANT_HMAC_KEY="$hmac"
export DB_USER=apexos_user DB_AI_WORKER_HOST="$MARKER" DB_AI_WORKER_PORT="$PORT"
export DB_AI_WORKER_NAME=apexos DB_AI_WORKER_USER=assps_core_qa_login
export DB_AI_WORKER_PASSWORD="$password" DB_AI_WORKER_ROLE=assps_core_qa_ai_worker
node "$ROOT/al-siddique-backend/src/services/ai/qa-ai-worker-real-socket-20261015.js"
unset DB_AI_WORKER_PASSWORD DB_SIGNED_TENANT_HMAC_KEY
unset password hmac
data_after=$(runuser -u postgres -- psql -X -q -A -t -p"$PORT" -d apexos  -c "SELECT count(*)||':'||count(*) FILTER (WHERE marks_obtained=0) FROM exam_results WHERE school_id=1 AND exam_id=9")
test "$data_after" = "$data_before" || { echo QA_OFFICIAL_SCORES_CHANGED;exit 4; }
echo QA_OFFICIAL_MARKS_ZERO_DATA_LOSS
echo QA_AUTOCLEANUP_ENABLED
