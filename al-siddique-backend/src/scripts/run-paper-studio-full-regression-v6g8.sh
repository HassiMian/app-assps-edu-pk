#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LIVE_ENV="${LIVE_ENV:-/var/www/apex-backend/.env}"
TEST_RUN_PORT="${TEST_PORT:-5033}"
STAMP="$(date -u +%Y%m%d%H%M%S)"
DB="assps_v6reg_${STAMP}"
LOG="${TEST_LOG:-/tmp/assps-v6reg-${STAMP}.tap}"
PIDFILE="/tmp/assps-v6reg-${STAMP}.pid"

case "$DB" in assps_v6reg_*) ;; *) echo "unsafe test DB name" >&2; exit 90;; esac
if ss -ltn | grep -q ":${TEST_RUN_PORT} "; then echo "test port ${TEST_RUN_PORT} is already in use" >&2; exit 91; fi
[ -f "$LIVE_ENV" ] || { echo "missing live env: $LIVE_ENV" >&2; exit 92; }

cleanup(){
  if [ -f "$PIDFILE" ]; then kill "$(cat "$PIDFILE")" 2>/dev/null || true; fi
  sudo -u postgres dropdb --if-exists "$DB" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

sudo -u postgres createdb "$DB"
sudo -u postgres pg_dump apexos | sudo -u postgres psql -q "$DB" >/dev/null

cd "$ROOT"
nohup sh -c "set -a; . '$LIVE_ENV'; set +a; export DB_NAME='$DB' PORT='$TEST_RUN_PORT' NODE_ENV=test DEMO_LOGIN_ENABLED=true; exec node server.js" >/tmp/assps-v6reg-${STAMP}.server.log 2>&1 &
echo $! > "$PIDFILE"
for _ in $(seq 1 25); do
  if timeout 3 curl -fsS "http://127.0.0.1:${TEST_RUN_PORT}/health" >/dev/null 2>&1; then break; fi
  sleep 1
done
timeout 3 curl -fsS "http://127.0.0.1:${TEST_RUN_PORT}/health" >/dev/null
# Health can become available slightly before async startup tasks settle.
# Require the protected Paper Studio router to be mounted, then allow one short
# event-loop stabilization interval before auth-heavy regression begins.
code="$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:${TEST_RUN_PORT}/api/portal/paper-studio/context")"
[ "$code" = "401" ] || { echo "protected route readiness failed: $code" >&2; exit 93; }
sleep 2

set -a; . "$LIVE_ENV"; set +a
export DB_NAME="$DB" TEST_API_PORT="$TEST_RUN_PORT" TEST_API_URL="http://127.0.0.1:${TEST_RUN_PORT}" NODE_ENV=test DEMO_LOGIN_ENABLED=true
node --test --test-concurrency=1 \
  tests/assessment-studio-persistence.test.js \
  tests/identity-issuance-http.test.js \
  tests/identity-provisioning-preservation.test.js \
  tests/login-fair-rate-limit.test.js \
  tests/paper-studio-v6-projection-http.test.js \
  tests/paper-studio-v6c-document-boundary.test.js \
  tests/paper-studio-v6d-revision-http.test.js \
  tests/paper-studio-v6e-delivery-manifest-http.test.js \
  tests/paper-studio-v6e2-native-render-policy.test.js \
  tests/paper-studio-v6f-readiness.test.js \
  tests/paper-v6f4-renderer-evidence.test.js \
  tests/paper-v6g-publisher-evidence.test.js \
  tests/paper-v6g2-technical-evidence.test.js \
  tests/paper-v6h0-canary-preflight.test.js \
  tests/paper-v6h1-source-binding.test.js \
  tests/paper-vault-scope-http.test.js \
  tests/portal-role-isolation.test.js \
  tests/question-bank-teacher-scope.test.js \
  tests/tenant-isolation-adversarial.test.js \
  tests/paper-v6g4-independent-review-intake.test.js \
  tests/paper-v6g5-question-page-map.test.js \
  tests/paper-v6g6-question-page-coverage.test.js \
  tests/paper-v6g7-academic-conflict-evidence.test.js \
  tests/paper-v6g8-independent-review-http.test.js \
  tests/paper-v6g8-review-cli.test.js \
  tests/paper-v6g9-promotion-precheck.test.js \
  tests/paper-v6g9-promotion-precheck-http.test.js \
  tests/paper-v6g10-promotion-envelope.test.js \
  tests/paper-v6g10-promotion-envelope-http.test.js \
  tests/paper-v6g11-detached-signature.test.js \
  tests/paper-v6g11-detached-signature-http.test.js \
  tests/paper-v6g12-approval-decision.test.js \
  tests/paper-v6g12-approval-decision-http.test.js \
  tests/paper-v6g13-approval-activation-preflight.test.js \
  tests/paper-v6g13-approval-activation-preflight-http.test.js \
  tests/paper-v6g14-key-custody-preflight.test.js \
  tests/paper-v6g14-key-custody-preflight-http.test.js \
  tests/paper-v6g15-edition-review-preflight.test.js \
  tests/paper-v6g15-edition-review-preflight-http.test.js \
  tests/paper-v6g16-academic-publication-precheck.test.js \
  tests/paper-v6g16-academic-publication-http.test.js \
  tests/paper-v6g17-release-envelope.test.js \
  tests/paper-v6g17-release-envelope-http.test.js \
  tests/paper-v6g18-human-authority-boundary.test.js \
  tests/paper-v6g18-human-authority-boundary-http.test.js \
  tests/paper-v6g19-release-signature.test.js \
  tests/paper-v6g19-release-signature-http.test.js | tee "$LOG"

grep -q '^# pass 114$' "$LOG"
grep -q '^# fail 0$' "$LOG"
echo "V6G19_FULL_REGRESSION_PASS db=$DB port=$TEST_RUN_PORT log=$LOG"
