#!/usr/bin/env bash
set -euo pipefail
BASE="${1:-http://127.0.0.1:5000}"

healthy=0
for _ in {1..30}; do
  if curl -fsS "$BASE/health" >/dev/null 2>&1; then
    healthy=1
    break
  fi
  sleep 1
done
[ "$healthy" -eq 1 ] || { echo "BACKEND_RELEASE_SMOKE_FAIL health" >&2; exit 51; }

expect_status() {
  local path="$1" expected="$2" code
  code="$(curl -sS -o /dev/null -w '%{http_code}' "$BASE$path")"
  [ "$code" = "$expected" ] || {
    echo "BACKEND_RELEASE_SMOKE_FAIL path=$path expected=$expected actual=$code" >&2
    exit 52
  }
}

expect_post_status() {
  local path="$1" expected="$2" code
  code="$(curl -sS -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d '{}' "$BASE$path")"
  [ "$code" = "$expected" ] || {
    echo "BACKEND_RELEASE_SMOKE_FAIL method=POST path=$path expected=$expected actual=$code" >&2
    exit 53
  }
}

expect_status /api/assessment-studio/papers 401
expect_status /api/portal/paper-studio/context 401
expect_status /api/portal/paper-studio/papers 401
expect_status /api/portal/paper-studio/canonical-readiness 401
expect_status /api/portal/paper-studio/canonical-canary/1/preflight 401
expect_post_status /api/portal/paper-studio/publisher-review/validate 401
expect_post_status /api/portal/paper-studio/publisher-review/promotion-precheck 401
expect_post_status /api/portal/paper-studio/publisher-review/promotion-envelope 401
expect_post_status /api/portal/paper-studio/publisher-review/signature-verify 401
expect_post_status /api/portal/paper-studio/publisher-review/approval-decision-validate 401
expect_post_status /api/portal/paper-studio/publisher-review/approval-activation-precheck 401
expect_post_status /api/portal/paper-studio/publisher-review/key-custody-precheck 401
expect_status /api/question-bank 401
expect_status /api/paper/vault 401

echo ASSPS_BACKEND_RELEASE_SMOKE_PASS
