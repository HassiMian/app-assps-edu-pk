#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${ASSPS_SANDBOX_DIR:-$HOME/assps-sandbox}"
OUT="${ASSPS_SANDBOX_EXPORT_DIR:-$HOME/assps-sandbox-export}"

checkpoint() {
  if [[ -d "$ROOT/.git" ]]; then
    ASSPS_SANDBOX_DIR="$ROOT" ASSPS_SANDBOX_EXPORT_DIR="$OUT" \
      "$SCRIPT_DIR/checkpoint.sh" || true
  fi
}
trap checkpoint EXIT INT TERM

# Preserve any existing tracked work before bootstrap refreshes the sandbox clone.
if [[ -d "$ROOT/.git" ]]; then
  checkpoint
fi

"$SCRIPT_DIR/bootstrap.sh"

echo "ASSPS_SANDBOX_SESSION_READY"
echo "workspace=$ROOT"
echo "checkpoint_dir=$OUT"
echo "Ephemeral sandbox only: do not store production secrets or push to main."
