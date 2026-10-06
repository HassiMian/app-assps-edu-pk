#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GUARD="$ROOT/ops/production-lineage-guard.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

git -C "$TMP" init -q
git -C "$TMP" config user.name test
git -C "$TMP" config user.email test@example.invalid
mkdir -p "$TMP/al-siddique-frontend" "$TMP/al-siddique-backend"
echo front-a > "$TMP/al-siddique-frontend/app.txt"
echo back-a > "$TMP/al-siddique-backend/app.txt"
git -C "$TMP" add . && git -C "$TMP" commit -q -m base
A="$(git -C "$TMP" rev-parse HEAD)"

echo back-b >> "$TMP/al-siddique-backend/app.txt"
git -C "$TMP" commit -qam backend-b
B="$(git -C "$TMP" rev-parse HEAD)"
echo back-c >> "$TMP/al-siddique-backend/app.txt"
git -C "$TMP" commit -qam backend-c
C="$(git -C "$TMP" rev-parse HEAD)"

git -C "$TMP" checkout -q -b frontend-line "$A"
echo front-f >> "$TMP/al-siddique-frontend/app.txt"
git -C "$TMP" commit -qam frontend-f
F="$(git -C "$TMP" rev-parse HEAD)"

git -C "$TMP" checkout -q master
git -C "$TMP" reset -q --hard "$B"
echo bad-front >> "$TMP/al-siddique-frontend/app.txt"
git -C "$TMP" commit -qam bad-backend-target
BAD="$(git -C "$TMP" rev-parse HEAD)"

meta(){ printf '{"commit":"%s","component":"%s"}\n' "$1" "$2" > "$3"; }
meta "$A" frontend "$TMP/front.json"
meta "$B" backend "$TMP/back.json"

# Split production lineages are valid: backend can advance B -> C while frontend stays A.
"$GUARD" "$C" "$TMP" "$TMP/front.json" "$TMP/back.json" Backend | grep -q ASSPS_LINEAGE_GUARD_PASS
# Frontend can independently advance A -> F while backend stays B.
"$GUARD" "$F" "$TMP" "$TMP/front.json" "$TMP/back.json" Frontend | grep -q ASSPS_LINEAGE_GUARD_PASS

# Backend reverse is blocked independently of frontend metadata.
set +e
"$GUARD" "$A" "$TMP" "$TMP/front.json" "$TMP/back.json" Backend >"$TMP/o" 2>"$TMP/e"
rc=$?
set -e
[ "$rc" -eq 43 ] && grep -q 'component=backend' "$TMP/e"

# Backend-only target that changes frontend is blocked.
set +e
"$GUARD" "$BAD" "$TMP" "$TMP/front.json" "$TMP/back.json" Backend >"$TMP/o" 2>"$TMP/e"
rc=$?
set -e
[ "$rc" -eq 42 ] && grep -q 'Backend-only deploy target contains frontend changes' "$TMP/e"

# Frontend reverse is blocked after frontend advances to F.
meta "$F" frontend "$TMP/front.json"
set +e
"$GUARD" "$A" "$TMP" "$TMP/front.json" "$TMP/back.json" Frontend >"$TMP/o" 2>"$TMP/e"
rc=$?
set -e
[ "$rc" -eq 43 ] && grep -q 'component=frontend' "$TMP/e"

echo PRODUCTION_LINEAGE_GUARD_V2_TEST_PASS
