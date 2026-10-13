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
# Vite fixture occasionally loses its loopback listener mid-suite. Only retry
# a transport-refused failure once; never retry / conceal a test assertion.
run_marks_fixture() {
  local tmp rc=0
  tmp="$(mktemp -t assps-marks-browser-XXXXXX)" || return 2
  if (cd "$FRONT" && node scripts/test-marks-entry-firstterm-browser.mjs) >"$tmp" 2>&1; then
    cat "$tmp"; rm -f "$tmp"; return 0
  else
    rc=$?
  fi
  cat "$tmp"
  if [ "$rc" -ne 0 ] && grep -q 'net::ERR_CONNECTION_REFUSED at http://127.0.0.1:' "$tmp"; then
    echo '[QA_TRANSPORT_RETRY] Marks fixture local listener failed; one fresh isolated rerun.'
    rm -f "$tmp"
    if (cd "$FRONT" && node scripts/test-marks-entry-firstterm-browser.mjs); then
      echo '[QA_TRANSPORT_RECOVERED] First attempt failed; do not count first attempt as passing.'
      return 0
    fi
    echo '[QA_TRANSPORT_RETRY_FAILED]'
    return 1
  fi
  rm -f "$tmp"
  return "$rc"
}
run_source browser_marks run_marks_fixture
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
run_gate staged_core_guard_clone python3 "$OPS/core-infrastructure/verify-core-clone-signed-app-guard-20261012.py"
run_gate full77_combined_signed_clone python3 "$OPS/core-infrastructure/full-app-signed-77-policy-gate-20261012.py" --target guarded_combined_clone
run_gate full77_live_production python3 "$OPS/core-infrastructure/full-app-signed-77-policy-gate-20261012.py" --target production
run_gate legacy_backend_bypass python3 "$OPS/core-infrastructure/legacy-backend-bypass-cutover-gate-20261012.py"
run_gate infrastructure_readiness python3 "$OPS/core-infrastructure/readiness-audit-20261012.py" --strict
run_gate public_api_path python3 "$OPS/core-infrastructure/public-api-path-diagnostic-20261012.py" --samples 2
run_gate live_marks_method_contract python3 "$OPS/core-infrastructure/verify-live-marks-methods-20261012.py"
run_gate dual_runtime_crud_clone python3 "$OPS/core-infrastructure/verify-dual-runtime-crud-boundary-20261012.py" --target guarded_clone
run_gate dual_runtime_crud_live python3 "$OPS/core-infrastructure/verify-dual-runtime-crud-boundary-20261012.py" --target production
run_gate anonymous_school_boundary python3 "$OPS/core-infrastructure/verify-live-anonymous-school-boundaries-20261012.py"
run_gate fresh_backup_chain python3 "$OPS/core-infrastructure/verify-fresh-core-certification-backup-20261012.py"
# A data/schema restore does not prove ACL or global-role restore readiness.
run_gate restored_acl_readiness python3 "$OPS/core-infrastructure/verify-fresh-restore-acl-parity-20261012.py"
run_gate restored_global_roles python3 "$OPS/core-infrastructure/verify-fresh-restore-global-roles-20261012.py"
run_gate hardened_recovery_candidate python3 "$OPS/core-infrastructure/verify-safe-core-recovery-candidate-20261012.py"
run_gate hostinger_100gb_disk python3 "$OPS/core-infrastructure/hostinger-100gb-capacity-preflight-20261013.py"
run_gate legacy_paper_global_role python3 "$OPS/core-infrastructure/verify-legacy-role-paper-boundary-20261013.py"
# The Core/Paper forward-port is verified as an independently sourced gate.
# Its clean-worktree requirement intentionally HOLDs during uncommitted edits.
run_gate paper_core_forwardport python3 "$OPS/core-infrastructure/verify-paper-core-forwardport-boundary-20261012.py"

printf '\n[ASSPS_THREE_GATE_FINAL]\n'
echo "python_unit_suites=$python_count"
echo "source_qa=$([ "$SOURCE_FAIL" -eq 0 ] && echo PASS || echo FAIL)"
echo "read_only_gate_holds=$read_only_hold"
if [ "$SOURCE_FAIL" -ne 0 ] || [ "$read_only_hold" -ne 0 ]; then
  echo 'full_backend_release=HOLD'
  echo 'production_change=NONE'
  exit 2
fi
echo 'full_backend_release=HOLD_PENDING_AUTHENTICATED_ROUTE_ACCEPTANCE_AND_RELEASE_CERTIFICATION'
echo 'production_change=NONE'
# A source/infra GREEN is never authorization to replace live backend; until
# exact authenticated route signatures and live release certification exist,
# keep an explicit nonzero release status for automation and human operators.
exit 2
