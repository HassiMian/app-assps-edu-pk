#!/usr/bin/env bash
# Disables automatic future QA checks only. Retains source and confidential evidence.
set -euo pipefail
MODE=--check
if [[ $# -gt 0 ]]; then MODE="$1"; fi
[[ "$MODE" = --check || "$MODE" = --apply ]] || exit 64
[[ $(id -u) -eq 0 ]] || exit 65
test -f /etc/systemd/system/assps-grade910-weekly-qa.timer || { echo "TIMER_NOT_INSTALLED";exit 2; }
if [[ "$MODE" = --check ]];then echo "ASSPS_GRADE910_WEEKLY_QA_DISABLE_READY_NO_CHANGE";exit 0;fi
systemctl disable --now assps-grade910-weekly-qa.timer
echo "ASSPS_GRADE910_WEEKLY_QA_TIMER_DISABLED_EVIDENCE_PRESERVED"
