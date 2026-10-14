#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
QA=/var/lib/postgresql/assps-connect-six-global-qa-55483-20261014
PORT=55483
BK=/root/assps-release-backups/connect-full-recovery-20261014T170713Z
SRC=$(cd "$(dirname "$0")" && pwd)
TABLES="admin_block_audit_log ai_jobs ai_queue_events ai_queue_state campuses organizations"
cleanup(){
 runuser -u postgres -- /usr/lib/postgresql/16/bin/pg_ctl -D "$QA" -m immediate stop >/dev/null 2>&1 || :
 if [[ "$QA" == '/var/lib/postgresql/assps-connect-six-global-qa-55483-20261014' ]];then
   runuser -u postgres -- rm -rf -- "$QA" 2>/dev/null || :
 fi
}
test ! -e "$QA" || { echo QA_PATH_IN_USE;exit 3; }
ss -lnt | grep -qE ":$PORT[[:space:]]" && { echo QA_SOCKET_IN_USE;exit 3; }
(cd "$BK" && sha256sum -c SHA256SUMS >/dev/null)
trap cleanup EXIT
mkdir -m 700 "$QA"; chown postgres:postgres "$QA"
runuser -u postgres -- /usr/lib/postgresql/16/bin/initdb -D "$QA" -A peer --no-instructions >/dev/null
runuser -u postgres -- /usr/lib/postgresql/16/bin/pg_ctl -D "$QA" -o "-p $PORT -h '' -k /var/run/postgresql" -l "$QA/server.log" start >/dev/null
echo QA_SOCKET_ONLY_INIT_PASS
runuser -u postgres -- psql -X -q -t -A -v ON_ERROR_STOP=1 -p5432 -d postgres -c "SELECT format('CREATE ROLE %I NOLOGIN;',rolname) FROM pg_roles WHERE left(rolname,3)<>'pg_' AND rolname<>'postgres' ORDER BY rolname" | runuser -u postgres -- psql -X -q -v ON_ERROR_STOP=1 -p55483 -d postgres >/dev/null
runuser -u postgres -- psql -X -q -v ON_ERROR_STOP=1 -p55483 -d postgres -c "GRANT apex_app_runtime TO assps_core_green_runtime WITH INHERIT TRUE, SET FALSE;" >/dev/null
runuser -u postgres -- createdb -p55483 apexos
runuser -u postgres -- pg_restore -p55483 -d apexos --exit-on-error < "$BK/apexos-full.dump" >/dev/null
echo FULL_ACL_ISOLATED_RESTORE_PASS
before=$(runuser -u postgres -- psql -X -q -t -A -p55483 -d apexos -c "SELECT count(*)||':'||count(*) FILTER(WHERE marks_obtained=0) FROM exam_results WHERE school_id=1 AND exam_id=9;")
test "$before" = 1762:213 || { echo RESTORED_MARKS_INTEGRITY_FAIL;exit 3; }
for table in $TABLES;do
  grant=$(runuser -u postgres -- psql -X -q -t -A -p55483 -d apexos -c "SELECT has_table_privilege('assps_core_green_runtime','public.$table','SELECT')")
  test "$grant" = t || { echo "BASELINE_GRANT_MISSING $table";exit 3; }
done
# Root streams root-private source via process stdin: no permission relaxation.
runuser -u postgres -- psql -X -q -v ON_ERROR_STOP=1 -p55483 -d apexos < "$SRC/qa-green-global-rls-stage-20261014.sql" >/dev/null
echo SIX_GLOBAL_TABLES_STAGED
for table in $TABLES;do
 green=$(runuser -u postgres -- psql -X -q -t -A -p55483 -d apexos -c "BEGIN READ ONLY;SET LOCAL ROLE assps_core_green_runtime;SELECT count(*) FROM public.$table;ROLLBACK;" | head -1)
 legacy=$(runuser -u postgres -- psql -X -q -t -A -p55483 -d apexos -c "BEGIN READ ONLY;SET LOCAL ROLE apex_app_runtime;SELECT count(*) FROM public.$table;ROLLBACK;" | head -1)
 owner=$(runuser -u postgres -- psql -X -q -t -A -p55483 -d apexos -c "BEGIN READ ONLY;SET LOCAL ROLE apexos_user;SELECT count(*) FROM public.$table;ROLLBACK;" | head -1)
 test "$green" = 0 || { echo "GREEN_READ_EXPOSED_$table:$green";exit 4; }
 echo "$legacy" | grep -Eq '^[0-9]+$' || { echo "LEGACY_READ_FAILED_$table";exit 4; }
 echo "$owner" | grep -Eq '^[0-9]+$' || { echo "OWNER_READ_FAILED_$table";exit 4; }
 # Assert actual forced RLS and exact restrictive false guard.
 check=$(runuser -u postgres -- psql -X -q -t -A -p55483 -d apexos -c "SELECT c.relrowsecurity::text||':'||c.relforcerowsecurity::text||':'||(SELECT count(*) FROM pg_policies WHERE tablename=c.relname AND policyname='assps_qa_green_unscoped_deny_v1' AND qual='false' AND with_check='false') FROM pg_class c WHERE c.oid='public.$table'::regclass;")
 test "$check" = true:true:1 || { echo "BAD_RLS_POLICY_$table:$check";exit 4; }
 echo "QA_DENY_PASS $table GREEN=0 LEGACY=$legacy OWNER=$owner"
done
# Synthetic negative insert only in detached QA DB (all changes rejected).
set +e
runuser -u postgres -- psql -X -q -v ON_ERROR_STOP=1 -p55483 -d apexos -c "BEGIN;SET LOCAL ROLE assps_core_green_runtime;INSERT INTO public.ai_queue_state(key,value) VALUES('QA_ONLY_DENY_20261014','test');ROLLBACK;" >/dev/null 2>&1
deny_rc=$?
set -e
test "$deny_rc" -ne 0 || { echo GREEN_DML_UNEXPECTED_PASS;exit 4; }
echo QA_GREEN_INSERT_REJECTED_PASS
# Actual legacy queue DML transaction is permitted in isolated QA and rolled back.
runuser -u postgres -- psql -X -q -v ON_ERROR_STOP=1 -p55483 -d apexos -c "BEGIN;SET LOCAL ROLE apex_app_runtime;INSERT INTO public.ai_queue_state(key,value) VALUES('QA_LEGACY_TRANSACTION_ROLLBACK_20261014','test');ROLLBACK;" >/dev/null
roll=$(runuser -u postgres -- psql -X -q -t -A -p55483 -d apexos -c "SELECT count(*) FROM public.ai_queue_state WHERE key='QA_LEGACY_TRANSACTION_ROLLBACK_20261014';")
test "$roll" = 0 || { echo LEGACY_TEST_RECORD_NOT_ROLLED_BACK;exit 4; }
echo QA_LEGACY_QUEUE_SYNTHETIC_DML_ROLLBACK_PASS
# Separate non-login worker can perform only necessary global AI operations.
worker_status=$(runuser -u postgres -- psql -X -q -t -A -p55483 -d apexos -c "SELECT rolcanlogin::text||':'||rolbypassrls::text FROM pg_roles WHERE rolname='assps_qa_global_job_worker';")
test "$worker_status" = false:false || { echo QA_WORKER_PRIVILEGED;exit 5; }
for table in ai_jobs ai_queue_events ai_queue_state;do
  count=$(runuser -u postgres -- psql -X -q -t -A -p55483 -d apexos -c "BEGIN READ ONLY;SET LOCAL ROLE assps_qa_global_job_worker;SELECT count(*) FROM public.$table;ROLLBACK;" | head -1)
  echo "$count" | grep -Eq '^[0-9]+$' || { echo "QA_WORKER_AI_TABLE_DENIED_$table";exit 5; }
  echo "QA_WORKER_SCOPED_READ_PASS $table"
done
# A real background service would authenticate through its own approved
# credential path. These test actions are QA-only transactions, rolled back.
runuser -u postgres -- psql -X -q -v ON_ERROR_STOP=1 -p55483 -d apexos -c "BEGIN;SET LOCAL ROLE assps_qa_global_job_worker;INSERT INTO public.ai_queue_state(key,value) VALUES('QA_WORKER_ONLY_20261014','test');INSERT INTO public.ai_queue_events(event_type,message,meta) VALUES('QA_WORKER_ONLY','test','{}'::jsonb);ROLLBACK;" >/dev/null
set +e
runuser -u postgres -- psql -X -q -v ON_ERROR_STOP=1 -p55483 -d apexos -c "BEGIN READ ONLY; SET LOCAL ROLE assps_qa_global_job_worker; SELECT count(*) FROM public.organizations; ROLLBACK;" >/dev/null 2>&1
worker_scope_rc=$?
set -e
test "$worker_scope_rc" -ne 0 || { echo QA_WORKER_ORGANIZATION_SCOPE_BYPASS;exit 5; }
echo QA_WORKER_SCOPED_DML_AND_UNAUTHORIZED_TABLE_DENIAL_PASS
runuser -u postgres -- psql -X -q -v ON_ERROR_STOP=1 -p55483 -d apexos < "$SRC/qa-green-global-rls-rollback-20261014.sql" >/dev/null
for table in $TABLES;do
 state=$(runuser -u postgres -- psql -X -q -t -A -p55483 -d apexos -c "SELECT c.relrowsecurity::text||':'||c.relforcerowsecurity::text||':'||(SELECT count(*) FROM pg_policies WHERE tablename=c.relname) FROM pg_class c WHERE c.oid='public.$table'::regclass;")
 test "$state" = false:false:0 || { echo "ROLLBACK_POLICY_DRIFT_$table:$state";exit 5; }
done
after=$(runuser -u postgres -- psql -X -q -t -A -p55483 -d apexos -c "SELECT count(*)||':'||count(*) FILTER(WHERE marks_obtained=0) FROM exam_results WHERE school_id=1 AND exam_id=9;")
test "$after" = "$before" || { echo MARKS_ROLLBACK_DRIFT;exit 5; }
echo ALL_SIX_QA_ROLLBACK_PASS
echo OFFICIAL_MARKS_CLONE_INTACT_PASS
echo QA_SCOPE_ONLY_PRODUCTION_UNTOUCHED
