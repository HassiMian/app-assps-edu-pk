#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GUARD="$ROOT/ops/production-lineage-guard.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

git -C "$TMP" init -q
git -C "$TMP" config user.name test
git -C "$TMP" config user.email test@example.invalid
echo one > "$TMP/x"
git -C "$TMP" add x
git -C "$TMP" commit -q -m one
A="$(git -C "$TMP" rev-parse HEAD)"
echo two >> "$TMP/x"
git -C "$TMP" commit -qam two
B="$(git -C "$TMP" rev-parse HEAD)"
git -C "$TMP" checkout -q -b side "$A"
echo side > "$TMP/y"
git -C "$TMP" add y
git -C "$TMP" commit -q -m side
SIDE="$(git -C "$TMP" rev-parse HEAD)"

printf '{"commit":"%s"}
' "$A" > "$TMP/front.json"
printf '{"commit":"%s"}
' "$A" > "$TMP/back.json"
"$GUARD" "$B" "$TMP" "$TMP/front.json" "$TMP/back.json" | grep -q ASSPS_LINEAGE_GUARD_PASS

# Actual reverse: production is B, target is older A.
printf '{"commit":"%s"}
' "$B" > "$TMP/front.json"
printf '{"commit":"%s"}
' "$B" > "$TMP/back.json"
set +e
"$GUARD" "$A" "$TMP" "$TMP/front.json" "$TMP/back.json" >"$TMP/guard.out" 2>"$TMP/guard.err"
RC=$?
set -e
[ "$RC" -eq 43 ]
grep -q REVERSE_DEPLOY_BLOCKED "$TMP/guard.err"

# Frontend/backend lineage disagreement is also a hard block.
printf '{"commit":"%s"}
' "$A" > "$TMP/front.json"
printf '{"commit":"%s"}
' "$B" > "$TMP/back.json"
set +e
"$GUARD" "$B" "$TMP" "$TMP/front.json" "$TMP/back.json" >"$TMP/guard.out" 2>"$TMP/guard.err"
RC=$?
set -e
[ "$RC" -eq 42 ]
grep -q 'frontend/backend production lineage mismatch' "$TMP/guard.err"

echo PRODUCTION_LINEAGE_GUARD_TEST_PASS
