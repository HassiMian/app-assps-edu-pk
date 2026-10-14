#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
Q=/var/lib/postgresql/assps-prod-candidate-55489-20261014
P=55489
B=/root/assps-release-backups/core-six-global-precutover-20261014T183510Z
DIR=$(cd "$(dirname "$0")" && pwd)
TMP=$(mktemp /root/assps-candidate-55489-sql.XXXXXX)
BACK=$(mktemp /root/assps-candidate-rollback-55489-sql.XXXXXX)
cleanup(){ runuser -u postgres -- /usr/lib/postgresql/16/bin/pg_ctl -D "$Q" -m immediate stop >/dev/null 2>&1 || :; if [[ "$Q" == /var/lib/postgresql/assps-prod-candidate-55489-20261014 ]];then runuser -u postgres -- rm -rf -- "$Q" 2>/dev/null || :;fi; rm -f "$TMP" "$BACK"; }
[[ ! -e "$Q" ]] || { echo CLONE_DIRECTORY_OCCUPIED; exit 3; }
! ss -lnt | grep -q ":$P " || { echo CLONE_PORT_OCCUPIED; exit 3; }
(cd "$B" && sha256sum -c SHA256SUMS >/dev/null)
trap cleanup EXIT
install -d -m 700 -o postgres -g postgres "$Q"
runuser -u postgres -- /usr/lib/postgresql/16/bin/initdb -D "$Q" -A peer --no-instructions >/dev/null
runuser -u postgres -- /usr/lib/postgresql/16/bin/pg_ctl -D "$Q" -o "-p $P -h '' -k /var/run/postgresql" -l "$Q/server.log" start >/dev/null
runuser -u postgres -- psql -XAt -p5432 -d postgres -v ON_ERROR_STOP=1 -c "SELECT format('CREATE ROLE %I NOLOGIN;',rolname) FROM pg_roles WHERE left(rolname,3)<>'pg_' AND rolname<>'postgres' ORDER BY rolname;" | runuser -u postgres -- psql -Xq -p "$P" -d postgres -v ON_ERROR_STOP=1 >/dev/null
runuser -u postgres -- psql -Xq -p "$P" -d postgres -v ON_ERROR_STOP=1 -c "GRANT apex_app_runtime TO assps_core_green_runtime WITH INHERIT TRUE, SET FALSE;" >/dev/null
runuser -u postgres -- createdb -p "$P" apexos
runuser -u postgres -- pg_restore -p "$P" -d apexos --exit-on-error < "$B/apexos-full.dump" >/dev/null
echo FULL_ACL_CLONE_RESTORED
python3 - "$DIR/production-six-global-leastpriv-20261014.sql" "$TMP" "$P" <<'PY'
import sys,pathlib
s=pathlib.Path(sys.argv[1]).read_text()
assert s.count("current_setting('port') <> '5432'")==1
s=s.replace("current_setting('port') <> '5432'",f"current_setting('port') <> '{sys.argv[3]}'")
pathlib.Path(sys.argv[2]).write_text(s)
PY
runuser -u postgres -- psql -X -q -p "$P" -d apexos -v ON_ERROR_STOP=1 < "$TMP" >/dev/null
echo PRODUCTION_CANDIDATE_SQL_ON_CLONE_PASS
runuser -u postgres -- psql -XAt -p "$P" -d apexos -v ON_ERROR_STOP=1 <<'SQL'
DO $test$
DECLARE t text;n integer;
BEGIN
 FOR t IN SELECT unnest(ARRAY['admin_block_audit_log','ai_jobs','ai_queue_events','ai_queue_state','campuses','organizations']) LOOP
  IF has_table_privilege('assps_core_green_runtime','public.'||t,'SELECT') OR has_table_privilege('assps_core_green_runtime','public.'||t,'INSERT') OR NOT has_table_privilege('apex_app_runtime','public.'||t,'SELECT') THEN
   RAISE EXCEPTION 'CLONE TENANT/GLOBAL isolation FAIL on %',t;
  END IF;
 END LOOP;
 IF NOT has_table_privilege('assps_core_ai_worker','public.ai_jobs','SELECT') OR has_table_privilege('assps_core_ai_worker','public.organizations','SELECT') OR has_table_privilege('assps_core_ai_worker','public.admin_block_audit_log','SELECT') THEN RAISE EXCEPTION 'Worker isolation FAIL'; END IF;
 IF has_table_privilege('assps_core_directory_reader','public.ai_jobs','SELECT') OR NOT has_table_privilege('assps_core_directory_reader','public.organizations','SELECT') THEN RAISE EXCEPTION 'Directory isolation FAIL'; END IF;
 IF has_table_privilege('assps_core_audit_writer','public.admin_block_audit_log','SELECT') OR NOT has_table_privilege('assps_core_audit_writer','public.admin_block_audit_log','INSERT') THEN RAISE EXCEPTION 'Audit isolation FAIL'; END IF;
 SELECT count(*) INTO n FROM pg_class c JOIN pg_policies p ON p.schemaname='public' AND p.tablename=c.relname AND p.policyname='core_signed_tenant_guard' WHERE c.relnamespace='public'::regnamespace AND c.relkind='r' AND has_table_privilege('assps_core_green_runtime',c.oid,'SELECT');
 IF n<>75 THEN RAISE EXCEPTION 'Lost signed RLS tables %',n; END IF;
END $test$;
SQL
R=$(runuser -u postgres -- psql -XAt -p "$P" -d apexos -c "SELECT count(*)::text||'|'||count(*) FILTER (WHERE marks_obtained=0)::text FROM exam_results WHERE school_id=1 AND exam_id=9")
[[ "$R" == '1762|213' ]] || { echo "EXAM_RECORD_INVARIANT_FAIL:$R"; exit 4; }
echo SIX_DENIAL_BLUE_PRESERVATION_WORKER_RLS_MARKS_PASS
# Actual independent LOGIN role in isolated disposable DB. No real password or staff identity.
runuser -u postgres -- psql -Xq -p "$P" -d apexos -v ON_ERROR_STOP=1 -c "CREATE ROLE assps_ai_worker_login LOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS PASSWORD 'CLONE_ONLY_DO_NOT_REUSE'; GRANT assps_core_ai_worker TO assps_ai_worker_login WITH INHERIT TRUE, SET FALSE;" >/dev/null
runuser -u postgres -- psql -XAt -p "$P" -d apexos -c "SELECT pg_has_role('assps_ai_worker_login','assps_core_ai_worker','USAGE'),has_table_privilege('assps_ai_worker_login','public.ai_jobs','SELECT'),has_table_privilege('assps_ai_worker_login','public.organizations','SELECT');" | grep -qx 't|t|f'
echo DEDICATED_LOGIN_ROLE_ACL_PASS
# Inverse membership restore inside transaction; rollback ensures candidate is still confined.
REVERSE_PROOF=$(runuser -u postgres -- psql -XqAt -p "$P" -d apexos -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;
GRANT apex_app_runtime TO assps_core_green_runtime WITH INHERIT TRUE, SET FALSE;
SELECT string_agg(has_table_privilege('assps_core_green_runtime','public.'||t,'SELECT')::text,'|' ORDER BY t) FROM unnest(ARRAY['admin_block_audit_log','ai_jobs','ai_queue_events','ai_queue_state','campuses','organizations']) AS t;
ROLLBACK;
SQL
)
[[ "$REVERSE_PROOF" == 'true|true|true|true|true|true' ]] || { echo ROLLBACK_GRANT_MEMBERSHIP_INVERSE_FAIL; exit 5; }
runuser -u postgres -- psql -XAt -p "$P" -d apexos -c "SELECT has_table_privilege('assps_core_green_runtime','public.ai_jobs','SELECT')" | grep -qx f
echo ROLLBACK_INVERSE_PASS
python3 - "$DIR/production-six-global-leastpriv-rollback-20261014.sql" "$BACK" "$P" <<'PYROLL'
import sys,pathlib
s=pathlib.Path(sys.argv[1]).read_text()
assert s.count("current_setting('port')<>'5432'")==1
s=s.replace("current_setting('port')<>'5432'",f"current_setting('port')<>'{sys.argv[3]}'")
pathlib.Path(sys.argv[2]).write_text(s)
PYROLL
runuser -u postgres -- psql -Xq -p "$P" -d apexos -v ON_ERROR_STOP=1 < "$BACK" >/dev/null
R=$(runuser -u postgres -- psql -XAt -p "$P" -d apexos -c "SELECT count(*)::text||'|'||count(*) FILTER(WHERE marks_obtained=0)::text FROM exam_results WHERE school_id=1 AND exam_id=9")
[[ "$R" == '1762|213' ]] || { echo ROLLBACK_MARKS_INVARIANT_FAIL; exit 6; }
runuser -u postgres -- psql -XAt -p "$P" -d apexos -c "SELECT has_table_privilege('assps_core_green_runtime','public.ai_jobs','SELECT')" | grep -qx t
echo ACTUAL_ROLLBACK_SQL_EXECUTION_AND_MARKS_PASS
