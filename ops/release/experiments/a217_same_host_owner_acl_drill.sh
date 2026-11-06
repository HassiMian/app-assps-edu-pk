#!/bin/bash
set -Eeuo pipefail
umask 077
E=/root/workspace/assps-mission-20261106-a217-private
B=/usr/lib/postgresql/16/bin
T=/tmp/assps-a217-isolated-dr-$(date -u +%Y%m%d)
SOCK=$T/socket
PORT=5981
CL=$T/cluster
if [[ -e "$T" ]]; then echo 'A217 isolated temp root already exists: abort'; exit 4; fi
mkdir -p "$T" "$SOCK"
chown -R postgres:postgres "$T"
chmod 700 "$T" "$SOCK"
cleanup(){
 rc=$?
 if [[ -d "$CL" ]]; then
   runuser -u postgres -- "$B/pg_ctl" -D "$CL" -m immediate -w stop > "$E/A217_DR_CLUSTER_STOP.log" 2>&1 || true
 fi
 if [[ "$T" == /tmp/assps-a217-isolated-dr-* && -d "$T" ]]; then rm -rf -- "$T"; fi
 echo "$rc" > "$E/A217_DR_EXIT_CODE.txt"
 exit "$rc"
}
trap cleanup EXIT
echo 'phase_1: capture sources read-only' > "$E/A217_DR_PROGRESS.txt"
runuser -u postgres -- pg_dumpall -r --no-role-passwords -f "$T/roles_raw.sql" > "$E/A217_ROLE_DUMP_STDOUT.log" 2>&1
# Existing initdb postgres role is already present; avoid CREATE/ALTER postgres duplication in fresh cluster.
sed -e '/^CREATE ROLE postgres;$/d' -e '/^ALTER ROLE postgres WITH /d' "$T/roles_raw.sql" > "$T/roles.sql"
chown postgres:postgres "$T/roles.sql"
runuser -u postgres -- pg_dump --format=custom --create --blobs -d apexos -f "$T/apexos.data.custom" > "$E/A217_SOURCE_PGDUMP_STDOUT.log" 2>&1
archive_sha=$(sha256sum "$T/apexos.data.custom" | cut -d' ' -f1)
archive_bytes=$(stat -c '%s' "$T/apexos.data.custom")
echo 'phase_2: initialize isolated no-TCP local cluster' > "$E/A217_DR_PROGRESS.txt"
runuser -u postgres -- "$B/initdb" -D "$CL" --no-instructions --auth-local=trust --auth-host=reject > "$E/A217_DR_INITDB.log" 2>&1
runuser -u postgres -- "$B/pg_ctl" -D "$CL" -o "-c listen_addresses='' -c unix_socket_directories=$SOCK -p $PORT" -w start > "$E/A217_DR_CLUSTER_START.log" 2>&1
echo 'phase_3: restore role SHAPES only (no passwords)' > "$E/A217_DR_PROGRESS.txt"
runuser -u postgres -- psql -X -q -v ON_ERROR_STOP=1 -h "$SOCK" -p "$PORT" -d postgres -f "$T/roles.sql" > "$E/A217_DR_ROLE_RESTORE.log" 2>&1
echo 'phase_4: restore database, owner and ACLs' > "$E/A217_DR_PROGRESS.txt"
runuser -u postgres -- pg_restore --exit-on-error -h "$SOCK" -p "$PORT" -C -d postgres "$T/apexos.data.custom" > "$E/A217_DR_PG_RESTORE.log" 2>&1
cat > "$T/canonical.sql" <<'SQL'
BEGIN READ ONLY;
SELECT 'REL|'||n.nspname||'|'||c.relname||'|'||c.relkind::text||'|'||pg_get_userbyid(c.relowner)||'|'||
COALESCE((SELECT string_agg(x::text,',' ORDER BY x::text) FROM unnest(COALESCE(c.relacl,acldefault(CASE WHEN c.relkind='S' THEN 'S' ELSE 'r' END::"char",c.relowner))) AS x),'-')||'|'||
c.relrowsecurity||'|'||c.relforcerowsecurity
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','S','f')
UNION ALL
SELECT 'SCHEMA|'||nspname||'|'||pg_get_userbyid(nspowner)||'|'||
COALESCE((SELECT string_agg(x::text,',' ORDER BY x::text) FROM unnest(nspacl) AS x),'-')
FROM pg_namespace WHERE nspname='public'
UNION ALL
SELECT 'POLICY|'||schemaname||'|'||tablename||'|'||policyname||'|'||permissive||'|'||array_to_string(roles,',')||'|'||cmd||'|'||coalesce(qual,'-')||'|'||coalesce(with_check,'-')
FROM pg_policies WHERE schemaname='public'
UNION ALL
SELECT 'ROLE|'||rolname||'|'||rolcanlogin||'|'||rolsuper||'|'||rolcreatedb||'|'||rolcreaterole||'|'||rolinherit||'|'||rolreplication||'|'||rolbypassrls
FROM pg_roles WHERE rolname NOT LIKE 'pg_%'
UNION ALL
SELECT 'MEMBER|'||r.rolname||'|'||u.rolname||'|'||m.admin_option
FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.roleid JOIN pg_roles u ON u.oid=m.member WHERE r.rolname NOT LIKE 'pg_%' AND u.rolname NOT LIKE 'pg_%'
UNION ALL
SELECT 'DB|'||datname||'|'||pg_get_userbyid(datdba)||'|'||
COALESCE((SELECT string_agg(x::text,',' ORDER BY x::text) FROM unnest(datacl) AS x),'-')
FROM pg_database WHERE datname='apexos'
UNION ALL
SELECT 'SUMMARY|'||count(*)||'|'||count(*) FILTER(WHERE relrowsecurity)||'|'||
count(*) FILTER(WHERE relforcerowsecurity) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND relkind IN ('r','p')
ORDER BY 1;
ROLLBACK;
SQL
chown postgres:postgres "$T/canonical.sql"
echo 'phase_5: compare canonical source/restore metadata' > "$E/A217_DR_PROGRESS.txt"
runuser -u postgres -- psql -X -q -At -v ON_ERROR_STOP=1 -d apexos -f "$T/canonical.sql" > "$T/source_catalog.txt"
runuser -u postgres -- psql -X -q -At -v ON_ERROR_STOP=1 -h "$SOCK" -p "$PORT" -d apexos -f "$T/canonical.sql" > "$T/clone_catalog.txt"
sha_source=$(sha256sum "$T/source_catalog.txt" | cut -d' ' -f1)
sha_clone=$(sha256sum "$T/clone_catalog.txt" | cut -d' ' -f1)
source_count=$(wc -l < "$T/source_catalog.txt")
clone_count=$(wc -l < "$T/clone_catalog.txt")
same=false
if cmp -s "$T/source_catalog.txt" "$T/clone_catalog.txt"; then same=true; fi
diff -u "$T/source_catalog.txt" "$T/clone_catalog.txt" > "$E/A217_DR_CATALOG_DIFF_PRIVATE.txt" || true
chmod 600 "$E/A217_DR_CATALOG_DIFF_PRIVATE.txt"
echo 'phase_6: compare protected aggregate data' > "$E/A217_DR_PROGRESS.txt"
cat > "$T/data.sql" <<'SQL'
BEGIN READ ONLY;
SELECT 'STUDENTS|'||count(*)||'|'||count(*) FILTER(WHERE school_id=1 AND is_active) FROM students;
SELECT 'FIRSTTERM|'||count(*)||'|'||encode(public.digest(string_agg(to_jsonb(r)::text,E'\n' ORDER BY r.id),'sha256'),'hex') FROM exam_results r WHERE r.school_id=1 AND r.exam_id=9;
SELECT 'POLICIES|'||count(*) FROM pg_policies WHERE schemaname='public';
SELECT 'PAPERS|'||(SELECT count(*) FROM saved_papers WHERE school_id=1)||'|'||(SELECT count(*) FROM paper_documents WHERE school_id=1 AND deleted_at IS NULL);
ROLLBACK;
SQL
chown postgres:postgres "$T/data.sql"
runuser -u postgres -- psql -X -q -At -v ON_ERROR_STOP=1 -d apexos -f "$T/data.sql" > "$T/source_data.txt"
runuser -u postgres -- psql -X -q -At -v ON_ERROR_STOP=1 -h "$SOCK" -p "$PORT" -d apexos -f "$T/data.sql" > "$T/clone_data.txt"
datasame=false
if cmp -s "$T/source_data.txt" "$T/clone_data.txt"; then datasame=true; fi
data_sha=$(sha256sum "$T/source_data.txt" | cut -d' ' -f1)
echo 'phase_7: persist metadata only and secure cleanup' > "$E/A217_DR_PROGRESS.txt"
cat > "$E/A217_DR_EVIDENCE_RAW.env" <<EOF
ARCHIVE_SHA=$archive_sha
ARCHIVE_BYTES=$archive_bytes
SOURCE_CATALOG_SHA=$sha_source
CLONE_CATALOG_SHA=$sha_clone
SOURCE_CATALOG_ROWS=$source_count
CLONE_CATALOG_ROWS=$clone_count
METADATA_SAME=$same
DATA_SHA=$data_sha
DATA_SAME=$datasame
EOF
chmod 600 "$E/A217_DR_EVIDENCE_RAW.env"
if [[ "$datasame" != true ]]; then echo 'A217 restore aggregate mismatch'; exit 7; fi
# Catalog difference is evidence, not an excuse to claim full role+ACL parity.
echo "A217 completed isolated restore; metadata_same=$same data_same=$datasame catalog_rows=$source_count/$clone_count"
