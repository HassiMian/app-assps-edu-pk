#!/usr/bin/env bash
set -euo pipefail
echo "[ASSPS] zero-paid Codespace bootstrap"
node --version
npm --version
git --version
npm ci --prefix al-siddique-frontend
npm ci --prefix al-siddique-backend/src
echo "[ASSPS] dependencies ready"
echo "[GUARDRAIL] This repository does not create paid cloud resources."
