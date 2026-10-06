#!/usr/bin/env bash
set -Eeuo pipefail

SNAPSHOT_DIR="${1:-}"
if [[ -z "$SNAPSHOT_DIR" ]]; then
  echo "usage: $0 <snapshot-dir>" >&2
  exit 64
fi

fail(){ echo "ROLLBACK_SNAPSHOT_FAIL $*" >&2; exit 65; }
[[ -d "$SNAPSHOT_DIR" ]] || fail "missing_dir=$SNAPSHOT_DIR"
[[ -d "$SNAPSHOT_DIR/apex-os.before" ]] || fail "missing_frontend_copy"
[[ -d "$SNAPSHOT_DIR/apex-backend.before" ]] || fail "missing_backend_copy"
[[ -s "$SNAPSHOT_DIR/apexos.before.dump" ]] || fail "missing_or_empty_db_dump"
command -v pg_restore >/dev/null 2>&1 || fail "pg_restore_unavailable"
pg_restore -l "$SNAPSHOT_DIR/apexos.before.dump" >/dev/null || fail "db_dump_unreadable"

front_meta="$SNAPSHOT_DIR/apex-os.before/release-meta.json"
back_meta="$SNAPSHOT_DIR/apex-backend.before/release-meta.json"
[[ -s "$front_meta" ]] || fail "missing_frontend_release_meta"
[[ -s "$back_meta" ]] || fail "missing_backend_release_meta"

node - "$front_meta" "$back_meta" <<'NODE'
const fs=require('fs')
const [frontPath,backPath]=process.argv.slice(2)
function read(p,label){
  let parsed
  try{ parsed=JSON.parse(fs.readFileSync(p,'utf8')) }catch(e){ console.error(`ROLLBACK_SNAPSHOT_FAIL invalid_${label}_release_meta`); process.exit(66) }
  if(!/^[0-9a-f]{40}$/i.test(String(parsed.commit||''))){ console.error(`ROLLBACK_SNAPSHOT_FAIL invalid_${label}_commit`); process.exit(67) }
  return parsed
}
const front=read(frontPath,'frontend')
const back=read(backPath,'backend')
console.log(`ROLLBACK_SNAPSHOT_RELEASES frontend=${front.commit} backend=${back.commit}`)
NODE

front_count=$(find "$SNAPSHOT_DIR/apex-os.before" -type f | wc -l | tr -d ' ')
back_count=$(find "$SNAPSHOT_DIR/apex-backend.before" -type f | wc -l | tr -d ' ')
[[ "$front_count" -gt 0 ]] || fail "frontend_copy_empty"
[[ "$back_count" -gt 0 ]] || fail "backend_copy_empty"

dump_bytes=$(wc -c < "$SNAPSHOT_DIR/apexos.before.dump" | tr -d ' ')
echo "ROLLBACK_SNAPSHOT_PASS dir=$SNAPSHOT_DIR db_bytes=$dump_bytes frontend_files=$front_count backend_files=$back_count"
