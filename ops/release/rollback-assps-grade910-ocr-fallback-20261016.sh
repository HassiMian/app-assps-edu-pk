#!/usr/bin/env bash
# Stop future OCR only. Preserve existing source evidence and marked research.
set -euo pipefail
MODE="${1:---check}"
[[ "$MODE" == --check || "$MODE" == --apply ]] || exit 64
[[ "$(id -u)" -eq 0 ]] || exit 65
test -f /etc/systemd/system/assps-grade910-scanned-ocr-fallback.timer || exit 2
if [[ "$MODE" == --check ]];then
 echo ASSPS_OCR_TIMER_ROLLBACK_PREFLIGHT_PASS
 exit 0
fi
systemctl disable --now assps-grade910-scanned-ocr-fallback.timer
echo ASSPS_OCR_TIMER_DISABLED_SOURCE_EVIDENCE_PRESERVED
