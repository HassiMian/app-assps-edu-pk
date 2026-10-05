#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
"$ROOT/ops/cloud-offload/preflight.sh"
echo "=== ASSPS VPS BUILD OFFLOAD ==="
echo "Started: $(date -Is)"
free -h || true
npm ci --prefix al-siddique-frontend
npm run build:frontend
npm ci --prefix al-siddique-backend/src
npm run production:safety
echo "Completed: $(date -Is)"
