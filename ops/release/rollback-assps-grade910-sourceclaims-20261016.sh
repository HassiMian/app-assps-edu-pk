#!/usr/bin/env bash
# Disables source audit timer ONLY. Never edits production records or stored evidence.
set -euo pipefail
MODE=--check
if [[ $# -gt 0 ]];then MODE="$1";fi
[[ "$MODE" == --check || "$MODE" == --apply ]] || exit 64
[[ "$(id -u)" == 0 ]] || exit 65
test -f /etc/systemd/system/assps-grade910-live-source-claims.timer || exit 2
if [[ "$MODE" == --check ]];then
 echo ASSPS_SOURCE_CLAIMS_TIMER_ROLLBACK_READY_NO_CHANGE
 exit 0
fi
systemctl disable --now assps-grade910-live-source-claims.timer
echo ASSPS_SOURCE_CLAIMS_TIMER_STOPPED_EVIDENCE_PRESERVED
