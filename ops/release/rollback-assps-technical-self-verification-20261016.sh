#!/usr/bin/env bash
# Disables only the monitor timer, retains receipts. No data or SaaS changes.
set -euo pipefail
MODE="${1:---check}"
[[ "$MODE" == --check || "$MODE" == --apply ]] || exit 64
[[ "$(id -u)" == 0 ]] || exit 65
unit=assps-technical-self-verification.timer
test -f "/etc/systemd/system/$unit" || { echo "ASSPS_MONITOR_NOT_INSTALLED";exit 2; }
if [[ "$MODE" == --check ]];then echo "ASSPS_SELF_VERIFICATION_TIMER_ROLLBACK_READY_NO_CHANGE";exit 0;fi
systemctl disable --now "$unit"
echo "ASSPS_SELF_VERIFICATION_TIMER_DISABLED_RETAINING_EVIDENCE_AND_SCRIPTS"
