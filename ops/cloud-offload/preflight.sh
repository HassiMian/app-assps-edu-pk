#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
EXPECTED_BRANCH="${ASSPS_OFFLOAD_BRANCH:-feat/free-cloud-workstation-zero-paid-20261004}"
branch="$(git branch --show-current)"
dirty="$(git status --porcelain)"
echo "ASSPS ZERO-PAID PREFLIGHT"
echo "repo=$ROOT"
echo "branch=$branch"
if [[ "$branch" != "$EXPECTED_BRANCH" ]]; then
  echo "REFUSE: expected isolated branch $EXPECTED_BRANCH" >&2
  exit 20
fi
if [[ -n "$dirty" ]]; then
  echo "REFUSE: isolated worktree is dirty; commit/stash before offload" >&2
  exit 21
fi
if [[ "$ROOT" == "/opt/assps-editor-worker/repo" ]]; then
  echo "REFUSE: production worktree selected" >&2
  exit 22
fi
avail_kb="$(awk '/MemAvailable:/ {print $2}' /proc/meminfo)"
disk_kb="$(df -Pk "$ROOT" | awk 'NR==2 {print $4}')"
if (( avail_kb < 1048576 )); then
  echo "REFUSE: less than 1 GiB RAM available" >&2
  exit 23
fi
if (( disk_kb < 5242880 )); then
  echo "REFUSE: less than 5 GiB disk available" >&2
  exit 24
fi
echo "production=$(git -C /opt/assps-editor-worker/repo status --short --branch | head -1)"
echo "ram_available_kb=$avail_kb"
echo "disk_available_kb=$disk_kb"
echo "PREFLIGHT_PASS"
