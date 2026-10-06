#!/usr/bin/env bash
set -euo pipefail
echo "ASSPS ZERO-PAID WORKSPACE HEALTH"
date -Is
fail=0
for svc in cloud-agent assps-editor-worker code-server@asspsworker; do
  status="$(systemctl is-active "$svc" 2>/dev/null || true)"
  printf '%s: %s\n' "$svc" "$status"
  if [ "$status" != active ]; then fail=1; fi
done
http="$(curl --noproxy '*' -sS --max-time 4 -o /dev/null -w '%{http_code}' http://127.0.0.1:8484/ || true)"
printf 'IDE localhost HTTP: %s\n' "$http"
if [ "$http" != 200 ]; then fail=1; fi
if ss -lnt | grep -Eq '(^|[[:space:]])(0\.0\.0\.0|\[::\]|\*):8484([[:space:]]|$)'; then
  echo 'FAIL: IDE appears to be publicly bound'
  fail=1
else
  echo 'IDE external bind check: passed'
fi
echo '=== Memory ==='
free -h
echo '=== Storage ==='
df -h /
echo '=== Isolated repository ==='
git -c safe.directory=/opt/assps-cloud-worktrees/free-cloud -C /opt/assps-cloud-worktrees/free-cloud status --short --branch
echo '=== Production repository ==='
git -c safe.directory=/opt/assps-editor-worker/repo -C /opt/assps-editor-worker/repo status --short --branch
if [ "$fail" -eq 0 ]; then echo 'HEALTH_PASS'; else echo 'HEALTH_FAIL'; fi
exit "$fail"
