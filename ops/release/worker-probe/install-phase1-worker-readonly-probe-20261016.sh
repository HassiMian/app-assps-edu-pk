#!/usr/bin/env bash
set -euo pipefail
# SAFE scope: one-shot read-only systemd probe, never touches apex-backend PM2,
# school records, Nginx, RLS policy, auth/passwords, or signed intake.
MODE="${1:---check}"
[[ "$MODE" == '--check' || "$MODE" == '--install' ]] || { echo 'HOLD: only --check or --install supported' >&2; exit 2; }
HERE="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(git -C "$HERE" rev-parse --show-toplevel)"
GIT_SHA="$(git -C "$ROOT" rev-parse HEAD)"
[[ -z "$(git -C "$ROOT" status --porcelain)" ]] || { echo 'HOLD: source worktree dirty' >&2; exit 2; }
git -C "$ROOT" merge-base --is-ancestor bfd7a35eb514a67e06705ae57b028c2eb5119488 "$GIT_SHA" || { echo 'HOLD: wrong Core ancestry' >&2; exit 2; }
ADAPTER="$ROOT/al-siddique-backend/src/services/ai/aiQueueWorkerDatabase.js"
PROBE="$HERE/phase1-worker-readonly-probe.cjs"
UNIT="$HERE/assps-phase1-worker-readonly-probe.service"
EXPECTED_ADAPTER='97090fee75c77283375141e21d572d52a1a9fe58952ff16a4584ca9f308592cc'
[[ "$(sha256sum "$ADAPTER" | cut -d' ' -f1)" == "$EXPECTED_ADAPTER" ]] || { echo 'HOLD: reviewed worker adapter hash mismatch' >&2; exit 2; }
node --check "$ADAPTER"
node --check "$PROBE"
systemd-analyze verify "$UNIT" >/dev/null
[[ -n "$(getent passwd assps_ai_worker_login || true)" ]] || { echo 'HOLD: no dedicated worker OS principal' >&2; exit 2; }
[[ -S /var/run/postgresql/.s.PGSQL.5432 ]] || { echo 'HOLD: production socket unavailable' >&2; exit 2; }
if [[ "$MODE" == '--check' ]]; then
  echo "READY_FOR_PRIVATE_READONLY_PROBE source=$GIT_SHA production_modified=false"
  exit 0
fi
[[ "${EUID}" == '0' ]] || { echo 'HOLD: only root may install restricted unit' >&2; exit 2; }
install -d -o root -g root -m 755 /usr/local/lib/assps-phase1-worker-probe
install -o root -g root -m 644 "$ADAPTER" /usr/local/lib/assps-phase1-worker-probe/aiQueueWorkerDatabase.js
install -o root -g root -m 644 "$PROBE" /usr/local/lib/assps-phase1-worker-probe/phase1-worker-readonly-probe.cjs
install -o root -g root -m 644 "$UNIT" /etc/systemd/system/assps-phase1-worker-readonly-probe.service
systemctl daemon-reload
systemctl start assps-phase1-worker-readonly-probe.service
[[ "$(systemctl show -p Result --value assps-phase1-worker-readonly-probe.service)" == 'success' ]] || { echo 'HOLD: restricted probe failed' >&2; exit 2; }
[[ "$(systemctl show -p ExecMainStatus --value assps-phase1-worker-readonly-probe.service)" == '0' ]] || { echo 'HOLD: restricted probe nonzero' >&2; exit 2; }
echo "PASS_RESTRICTED_READONLY_PEER_PROBE source=$GIT_SHA production_backend_modified=false security_certified=false"
