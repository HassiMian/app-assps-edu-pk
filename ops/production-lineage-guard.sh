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
reverse_block() {
  echo "REVERSE_DEPLOY_BLOCKED component=$1 current=$2 target=$3" >&2
  exit 43
}

[ -n "$TARGET_SHA" ] || fail "target commit is required"
[ -d "$REPO/.git" ] || [ -f "$REPO/.git" ] || fail "authoritative git repository not found: $REPO"
git -C "$REPO" cat-file -e "$TARGET_SHA^{commit}" 2>/dev/null || fail "target commit $TARGET_SHA is not present in authoritative repository"

read_meta() {
  local f="$1" expected="$2"
  [ -f "$f" ] || fail "release metadata missing: $f"
  python3 - "$f" "$expected" <<'PY2'
import json,sys
p,expected=sys.argv[1],sys.argv[2]
try:
    x=json.load(open(p))
except Exception as e:
    raise SystemExit(f"invalid release metadata {p}: {e}")
c=str(x.get('commit') or '').strip()
component=str(x.get('component') or '').strip().lower()
if not c:
    raise SystemExit(f"missing commit in release metadata {p}")
if component and component != expected:
    raise SystemExit(f"component mismatch in {p}: expected={expected} actual={component}")
print(c)
PY2
}

FRONT_SHA="$(read_meta "$FRONT_META" frontend)" || fail "invalid frontend release metadata"
BACK_SHA="$(read_meta "$BACK_META" backend)" || fail "invalid backend release metadata"

git -C "$REPO" cat-file -e "$FRONT_SHA^{commit}" 2>/dev/null || fail "frontend production commit $FRONT_SHA is not present in authoritative repository"
git -C "$REPO" cat-file -e "$BACK_SHA^{commit}" 2>/dev/null || fail "backend production commit $BACK_SHA is not present in authoritative repository"

assert_forward() {
  local component="$1" current="$2"
  git -C "$REPO" merge-base --is-ancestor "$current" "$TARGET_SHA" || reverse_block "$component" "$current" "$TARGET_SHA"
}

case "$MODE" in
  Frontend)
    assert_forward frontend "$FRONT_SHA"
    git -C "$REPO" diff --quiet "$FRONT_SHA" "$TARGET_SHA" -- al-siddique-backend || fail "Frontend-only deploy target contains backend changes relative to frontend lineage"
    echo "ASSPS_LINEAGE_GUARD_PASS component=frontend current=$FRONT_SHA target=$TARGET_SHA backend_current=$BACK_SHA"
    ;;
  Backend)
    assert_forward backend "$BACK_SHA"
    git -C "$REPO" diff --quiet "$BACK_SHA" "$TARGET_SHA" -- al-siddique-frontend || fail "Backend-only deploy target contains frontend changes relative to backend lineage"
    echo "ASSPS_LINEAGE_GUARD_PASS component=backend current=$BACK_SHA target=$TARGET_SHA frontend_current=$FRONT_SHA"
    ;;
  Both)
    assert_forward frontend "$FRONT_SHA"
    assert_forward backend "$BACK_SHA"
    echo "ASSPS_LINEAGE_GUARD_PASS component=both frontend_current=$FRONT_SHA backend_current=$BACK_SHA target=$TARGET_SHA"
    ;;
  *) fail "invalid deploy mode: $MODE" ;;
esac
