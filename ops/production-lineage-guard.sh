#!/usr/bin/env bash
set -euo pipefail

TARGET_SHA="${1:-}"
REPO="${2:-/opt/assps-editor-worker/repo}"
FRONT_META="${3:-/var/www/apex-os/release-meta.json}"
BACK_META="${4:-/var/www/apex-backend/release-meta.json}"
MODE="${5:-Both}"

fail() {
  echo "ASSPS_LINEAGE_GUARD_BLOCKED: $*" >&2
  exit 42
}

[ -n "$TARGET_SHA" ] || fail "target commit is required"
[ -d "$REPO/.git" ] || [ -f "$REPO/.git" ] || fail "authoritative git repository not found: $REPO"
git -C "$REPO" cat-file -e "$TARGET_SHA^{commit}" 2>/dev/null || fail "target commit $TARGET_SHA is not present in authoritative repository"

read_commit() {
  local f="$1"
  [ -f "$f" ] || fail "release metadata missing: $f"
  python3 - "$f" <<'PY2'
import json,sys
p=sys.argv[1]
try:
    x=json.load(open(p))
    c=str(x.get("commit") or "").strip()
except Exception as e:
    raise SystemExit(f"invalid release metadata {p}: {e}")
if not c:
    raise SystemExit(f"missing commit in release metadata {p}")
print(c)
PY2
}

FRONT_SHA="$(read_commit "$FRONT_META")"
BACK_SHA="$(read_commit "$BACK_META")"

[ "$FRONT_SHA" = "$BACK_SHA" ] || fail "frontend/backend production lineage mismatch: frontend=$FRONT_SHA backend=$BACK_SHA"
git -C "$REPO" cat-file -e "$FRONT_SHA^{commit}" 2>/dev/null || fail "current production commit $FRONT_SHA is not present in authoritative repository"

if ! git -C "$REPO" merge-base --is-ancestor "$FRONT_SHA" "$TARGET_SHA"; then
  echo "REVERSE_DEPLOY_BLOCKED current=$FRONT_SHA target=$TARGET_SHA" >&2
  exit 43
fi

case "$MODE" in
  Frontend)
    git -C "$REPO" diff --quiet "$FRONT_SHA" "$TARGET_SHA" -- al-siddique-backend || fail "Frontend-only deploy target contains backend changes"
    ;;
  Backend)
    git -C "$REPO" diff --quiet "$FRONT_SHA" "$TARGET_SHA" -- al-siddique-frontend || fail "Backend-only deploy target contains frontend changes"
    ;;
  Both) ;;
  *) fail "invalid deploy mode: $MODE" ;;
esac

echo "ASSPS_LINEAGE_GUARD_PASS current=$FRONT_SHA target=$TARGET_SHA mode=$MODE"
