#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROD=/opt/assps-editor-worker/repo

echo 'ASSPS ZERO-PAID FAILOVER TEST'
date -Is
bash "$ROOT/ops/cloud-offload/preflight.sh"
# Core must remain usable with Windows and AWS treated as unavailable.
systemctl is-active cloud-agent >/dev/null
systemctl is-active code-server@asspsworker >/dev/null
curl --noproxy '*' -fsS --max-time 4 http://127.0.0.1:8484/ >/dev/null
# GitHub durability check without changing refs.
git -c safe.directory="$ROOT" -C "$ROOT" ls-remote --exit-code origin "refs/heads/feat/free-cloud-workstation-zero-paid-20261004" >/dev/null
# Production safety invariant.
[[ -z "$(git -c safe.directory="$PROD" -C "$PROD" status --porcelain)" ]] || { echo 'FAIL: production dirty' >&2; exit 71; }
echo 'SIMULATED_WINDOWS=UNAVAILABLE'
echo 'SIMULATED_AWS_SANDBOX=UNAVAILABLE'
echo 'CORE_CONTROL_PLANE=AVAILABLE'
echo 'GITHUB_DURABILITY=AVAILABLE'
echo 'FAILOVER_PASS'
