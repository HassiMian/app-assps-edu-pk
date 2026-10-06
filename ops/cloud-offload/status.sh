#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BRANCH="${ASSPS_OFFLOAD_BRANCH:-feat/free-cloud-workstation-zero-paid-20261004}"
PROD="/opt/assps-editor-worker/repo"

echo "ASSPS ZERO-PAID DISTRIBUTED WORKSTATION STATUS"
date -Is

echo "=== Persistent control plane ==="
for svc in nginx postgresql redis-server cloud-agent assps-editor-worker code-server@asspsworker; do
  printf '%-28s %s\n' "$svc" "$(systemctl is-active "$svc" 2>/dev/null || true)"
done
curl --noproxy '*' -sS --max-time 4 -o /dev/null -w 'ide_http=%{http_code}\n' http://127.0.0.1:8484/ || true

echo "=== Capacity ==="
free -h
df -h /

echo "=== Git safety ==="
head="$(git -c safe.directory="$ROOT" -C "$ROOT" rev-parse HEAD)"
branch="$(git -c safe.directory="$ROOT" -C "$ROOT" branch --show-current)"
prod_head="$(git -c safe.directory="$PROD" -C "$PROD" rev-parse HEAD)"
printf 'isolated_branch=%s\nisolated_head=%s\nproduction_head=%s\n' "$branch" "$head" "$prod_head"
[[ "$branch" == "$BRANCH" ]] || { echo "FAIL: isolated branch mismatch" >&2; exit 51; }
[[ "$ROOT" != "$PROD" ]] || { echo "FAIL: production worktree selected" >&2; exit 52; }
if [[ -n "$(git -c safe.directory="$PROD" -C "$PROD" status --porcelain)" ]]; then
  echo "FAIL: production worktree is dirty" >&2
  exit 53
fi

echo "=== Windows relay ==="
"$ROOT/ops/cloud-offload/windows-recovery-status.sh" || true

echo "=== Sandbox policy ==="
echo "aws_builder_sandbox=ephemeral_only"
echo "oracle_free_tier=optional_zero_charge_only"
echo "paid_cloud_resources=forbidden_without_explicit_user_approval"
echo "production_secrets_in_sandbox=forbidden"
echo "direct_push_to_main_from_sandbox=forbidden"

echo "STATUS_PASS"
