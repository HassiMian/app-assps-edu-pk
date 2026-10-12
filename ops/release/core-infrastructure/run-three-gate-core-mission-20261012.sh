#!/usr/bin/env bash
# ASSPS Core: one-shot, no-schedule source QA + read-only live release gates.
# Intentionally does NOT deploy, run migrations, seed production or restart.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
OPS="$ROOT/ops/release"
BACK="$ROOT/al-siddique-backend/src"
FRONT="$ROOT/al-siddique-frontend"
SOURCE_FAIL=0
read_only_hold=0

run_source() {
  local label="$1"; shift
  printf '\n[QA] %s\n' "$label"
  if "$@"; then echo "[QA_PASS] $label"; else
    echo "[QA_FAIL] $label"; SOURCE_FAIL=$((SOURCE_FAIL+1))
  fi
}
run_gate() {
  local label="$1"; shift
  printf '\n[READ_ONLY_GATE] %s\n' "$label"
  if "$@"; then echo "[GATE_PASS] $label"; else
    echo "[GATE_HOLD] $label"; read_only_hold=$((read_only_hold+1))
  fi
}

if [ ! -e "$FRONT/node_modules" ] || [ ! -d /var/www/apex-backend/node_modules ]; then
  echo '[BLOCKED] Existing isolated test dependencies unavailable; no install attempted.'
  exit 2
fi

python_count=0
for suite in "$OPS"/core-infrastructure/test-*.py "$OPS"/signed-bluegreen/test-*.py "$OPS"/signed-bluegreen/nginx/test-*.py; do
  [ -f "$suite" ] || continue
  python_count=$((python_count+1))
  run_source "python:$(basename "$suite")" env PYTHONDONTWRITEBYTECODE=1 python3 "$suite"
done

run_source backend_security env NODE_PATH=/var/www/apex-backend/node_modules \
  DB_STARTUP_PROBE=false NODE_ENV=test node --test \
  "$BACK/tests/tenant-school-id-boundary.test.js" \
  "$BACK/tests/tenant-clause-intersection-security.test.js" \
  "$BACK/tests/marks-green-loopback-contract.test.cjs" \
  "$BACK/tests/exam-marks-teacher-scope.test.js" \
  "$BACK/tests/exam-marks-teacher-http-isolated.test.js" \
  "$BACK/tests/database-tenant-context.test.js" \
  "$BACK/tests/saas-core-phase18-db-scope-strict.test.js" \
  "$BACK/tests/core-signed-envelope-contract.test.js" \
  "$BACK/tests/signed-runtime-catalog-contract.test.js" \
  "$BACK/tests/promote-demote-full-repair.test.cjs"

run_source protected_templates node "$FRONT/scripts/verify-protected-templates.mjs"
run_source marks_zero_state node "$FRONT/scripts/test-marks-zero-state-and-blank-print.mjs"
# Browser scripts rely on frontend cwd and provide LOCAL synthetic API fixtures.
run_source browser_marks bash -c 'cd "$1" && node scripts/test-marks-entry-firstterm-browser.mjs' -- "$FRONT"
run_source browser_result_cards bash -c 'cd "$1" && node scripts/test-result-cards-class-isolation-browser.mjs' -- "$FRONT"
run_source vite_build bash -c 'cd "$1" && npm run build' -- "$FRONT"
run_source diff_integrity git -C "$ROOT" diff --check

# Every subsequent gate uses SELECT/health endpoints only. A failing gate
# is an honest HOLD, never a signal to auto-migrate, bypass RLS or restart.
run_gate prod_signed_precutover python3 "$OPS/signed-bluegreen/verify-live-signed-precutover-20261011.py"
run_gate clone_baseline_parity python3 "$OPS/signed-bluegreen/verify-restored-clone-parity-20261011.py"
run_gate tenant_key_consistency python3 "$OPS/core-infrastructure/tenant-key-consistency-audit-20261012.py"
run_gate school_data_integrity python3 "$OPS/core-infrastructure/school-data-integrity-20261012.py"
run_gate fee_ledger_reconciliation python3 "$OPS/core-infrastructure/fee-ledger-reconciliation-20261012.py"
run_gate unsigned_rpl_runtime python3 "$OPS/core-infrastructure/unsigned-rls-role-denial-audit-20261012.py"
run_gate app_runtime_signed_guard_prod python3 "$OPS/core-infrastructure/app-runtime-policy-readiness-20261012.py" --database production
run_gate app_runtime_signed_guard_clone python3 "$OPS/core-infrastructure/app-runtime-policy-readiness-20261012.py" --database clone
run_gate infrastructure_readiness python3 "$OPS/core-infrastructure/readiness-audit-20261012.py" --strict
run_gate public_api_path python3 "$OPS/core-infrastructure/public-api-path-diagnostic-20261012.py" --samples 2

printf '\n[ASSPS_THREE_GATE_FINAL]\n'
echo "python_unit_suites=$python_count"
echo "source_qa=$([ "$SOURCE_FAIL" -eq 0 ] && echo PASS || echo FAIL)"
echo "read_only_gate_holds=$read_only_hold"
if [ "$SOURCE_FAIL" -ne 0 ] || [ "$read_only_hold" -ne 0 ]; then
  echo 'full_backend_release=HOLD'
  echo 'production_change=NONE'
  exit 2
fi
echo 'full_backend_release=ELIGIBILITY_TESTS_PASS_NOT_A_DEPLOYMENT_AUTHORIZATION'
echo 'production_change=NONE'
