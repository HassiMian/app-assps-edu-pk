#!/usr/bin/env bash
set -euo pipefail

ROOT="${ASSPS_SANDBOX_DIR:-$HOME/assps-sandbox}"
OUT="${ASSPS_SANDBOX_EXPORT_DIR:-$HOME/assps-sandbox-export}"
BRANCH="${ASSPS_SANDBOX_BRANCH:-feat/free-cloud-workstation-zero-paid-20261004}"

cd "$ROOT"
[[ "$(git branch --show-current)" == "$BRANCH" ]] || { echo "REFUSE: unexpected branch" >&2; exit 41; }
mkdir -p "$OUT"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
git status --short > "$OUT/status-$stamp.txt"
git diff > "$OUT/worktree-$stamp.patch"
git diff --cached > "$OUT/index-$stamp.patch"
git bundle create "$OUT/repo-$stamp.bundle" HEAD
if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$OUT"/*"$stamp"* > "$OUT/SHA256SUMS-$stamp.txt"
fi
echo "CHECKPOINT_CREATED=$OUT"
echo "If GitHub authentication is available, push only a dedicated sandbox branch."
echo "Never push directly to main from an ephemeral sandbox."
