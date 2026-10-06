#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-$(git rev-parse --show-toplevel)}"
EXPECTED="${ASSPS_OFFLOAD_BRANCH:-feat/free-cloud-workstation-zero-paid-20261004}"
branch="$(git -c safe.directory="$ROOT" -C "$ROOT" branch --show-current)"
[[ "$branch" == "$EXPECTED" ]] || { echo "REFUSE: expected $EXPECTED, found $branch" >&2; exit 61; }
[[ -z "$(git -c safe.directory="$ROOT" -C "$ROOT" status --porcelain)" ]] || { echo "REFUSE: isolated worktree is dirty" >&2; exit 62; }
url="$(git -c safe.directory="$ROOT" -C "$ROOT" remote get-url origin)"
[[ "$url" == *'HassiMian/app-assps-edu-pk.git'* ]] || { echo "REFUSE: unexpected origin $url" >&2; exit 63; }
echo "BRANCH_GUARD_PASS"
