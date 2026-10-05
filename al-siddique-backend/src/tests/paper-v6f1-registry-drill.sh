#!/usr/bin/env bash
set -euo pipefail
DB="v6f1_drill_${$}"
SUFFIX="${$}"
MIG="$(cd "$(dirname "$0")/../migrations" && pwd)/20261005_paper_canonical_registry_v6f1.sql"
TMP="$(mktemp)"
cleanup(){ sudo -u postgres dropdb --if-exists "$DB" >/dev/null 2>&1 || true; sudo -u postgres psql -d postgres -qAtc "DROP ROLE IF EXISTS tmp_apex_paper_runtime_${SUFFIX}; DROP ROLE IF EXISTS tmp_apex_paper_owner_${SUFFIX};" >/dev/null 2>&1 || true; rm -f "$TMP"; }
trap cleanup EXIT
sudo -u postgres createdb "$DB"
sudo -u postgres psql -d "$DB" -v ON_ERROR_STOP=1 -q <<'SQL'
CREATE TABLE schools(id serial PRIMARY KEY,name text);
CREATE TABLE users(id serial PRIMARY KEY,school_id int REFERENCES schools(id),name text);
INSERT INTO schools(name) VALUES ('Tenant One'),('Tenant Two');
INSERT INTO users(school_id,name) VALUES (1,'Teacher One'),(2,'Teacher Two');
SQL
sed -e "s/apex_paper_owner/tmp_apex_paper_owner_${SUFFIX}/g" -e "s/apex_paper_runtime/tmp_apex_paper_runtime_${SUFFIX}/g" "$MIG" > "$TMP"
chmod 644 "$TMP"
sudo -u postgres psql -d "$DB" -v ON_ERROR_STOP=1 -q -f "$TMP"
# Direct apexos_user has no inherited privileges despite BYPASSRLS.
sudo -u postgres psql -d "$DB" -v ON_ERROR_STOP=0 -qAt 2>&1 <<SQL | grep -q 'permission denied' || { echo 'FAIL direct bypass role unexpectedly accessed registry'; exit 1; }
SET SESSION AUTHORIZATION apexos_user;
SELECT count(*) FROM paper_documents;
SQL
# Restricted runtime: no tenant => no rows; write gate off => insert denied.
sudo -u postgres psql -d "$DB" -v ON_ERROR_STOP=0 -qAt <<SQL >"/tmp/v6f1_${SUFFIX}.out" 2>&1
SET SESSION AUTHORIZATION apexos_user;
SET ROLE tmp_apex_paper_runtime_${SUFFIX};
SELECT 'no_tenant='||count(*) FROM paper_documents;
INSERT INTO paper_documents(school_id,owner_user_id,document_family,document_format,schema_version,payload_hash,payload)
VALUES(1,1,'historical-v13','assps-canonical-paper',3,repeat('a',64),'{}');
SQL
grep -q 'no_tenant=0' "/tmp/v6f1_${SUFFIX}.out"
grep -q 'canonical paper registry write gate is disabled' "/tmp/v6f1_${SUFFIX}.out"
# Seed two tenants under explicit gated restricted role, then prove isolation and immutability.
sudo -u postgres psql -d "$DB" -v ON_ERROR_STOP=1 -q <<SQL
SET SESSION AUTHORIZATION apexos_user;
SET ROLE tmp_apex_paper_runtime_${SUFFIX};
SELECT set_config('app.tenant_id','1',false),set_config('app.paper_canonical_write_enabled','true',false);
INSERT INTO paper_documents(school_id,owner_user_id,document_family,document_format,schema_version,payload_hash,payload) VALUES(1,1,'historical-v13','assps-canonical-paper',3,repeat('a',64),'{"format":"assps-canonical-paper"}');
INSERT INTO paper_revisions(school_id,paper_document_id,revision,actor_user_id,event_kind,document_family,document_format,schema_version,payload_hash,payload) VALUES(1,(SELECT id FROM paper_documents WHERE school_id=1 LIMIT 1),1,1,'canonical_create','historical-v13','assps-canonical-paper',3,repeat('a',64),'{"format":"assps-canonical-paper"}');
RESET ROLE; RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION apexos_user;
SET ROLE tmp_apex_paper_runtime_${SUFFIX};
SELECT set_config('app.tenant_id','2',false),set_config('app.paper_canonical_write_enabled','true',false);
INSERT INTO paper_documents(school_id,owner_user_id,document_family,document_format,schema_version,payload_hash,payload) VALUES(2,2,'historical-v13','assps-canonical-paper',3,repeat('b',64),'{"format":"assps-canonical-paper"}');
INSERT INTO paper_revisions(school_id,paper_document_id,revision,actor_user_id,event_kind,document_family,document_format,schema_version,payload_hash,payload) VALUES(2,(SELECT id FROM paper_documents WHERE school_id=2 LIMIT 1),1,2,'canonical_create','historical-v13','assps-canonical-paper',3,repeat('b',64),'{"format":"assps-canonical-paper"}');
SQL
for TENANT in 1 2; do
  COUNT=$(sudo -u postgres psql -d "$DB" -qAt <<SQL
SET SESSION AUTHORIZATION apexos_user;
SET ROLE tmp_apex_paper_runtime_${SUFFIX};
SELECT set_config('app.tenant_id','$TENANT',false);
SELECT count(*) FROM paper_documents;
SQL
)
  [ "$(echo "$COUNT" | tail -1)" = 1 ] || { echo "FAIL tenant $TENANT saw wrong count: $COUNT"; exit 1; }
done
sudo -u postgres psql -d "$DB" -v ON_ERROR_STOP=0 -qAt <<SQL >"/tmp/v6f1_immut_${SUFFIX}.out" 2>&1
SET SESSION AUTHORIZATION apexos_user;
SET ROLE tmp_apex_paper_runtime_${SUFFIX};
SELECT set_config('app.tenant_id','1',false),set_config('app.paper_canonical_write_enabled','true',false);
UPDATE paper_revisions SET payload_hash=repeat('c',64) WHERE school_id=1 AND revision=1;
DELETE FROM paper_documents WHERE school_id=1;
SQL
test "$(grep -c 'permission denied for table paper_revisions' "/tmp/v6f1_immut_${SUFFIX}.out")" -eq 1
test "$(grep -c 'permission denied for table paper_documents' "/tmp/v6f1_immut_${SUFFIX}.out")" -eq 1
TRIGGERS=$(sudo -u postgres psql -d "$DB" -qAtc "select count(*) from pg_trigger where not tgisinternal and tgname in ('trg_paper_documents_write_guard_v6f1','trg_paper_revisions_write_guard_v6f1','trg_paper_revisions_immutable_v6f1','trg_paper_documents_no_delete_v6f1')")
[ "$TRIGGERS" = 4 ] || { echo "FAIL expected 4 canonical defense triggers, got $TRIGGERS"; exit 1; }
rm -f "/tmp/v6f1_${SUFFIX}.out" "/tmp/v6f1_immut_${SUFFIX}.out"
echo 'V6F1_REGISTRY_DRILL 8/8 PASS'
