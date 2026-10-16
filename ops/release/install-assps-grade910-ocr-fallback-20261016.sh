#!/usr/bin/env bash
# Safe only; source OCR receipts, NEVER academic approval or production writes.
set -euo pipefail
MODE="${1:---check}"
[[ "$MODE" == --check || "$MODE" == --apply ]] || exit 64
[[ "$(id -u)" -eq 0 ]] || exit 65
ROOT=/root/workspace/assps-grade910-metadata-source-claim-20261016
SRC="$ROOT/ops/qbank/verify-grade910-scanned-source-ocr-fallback-20261016.mjs"
DEST=/usr/local/libexec/assps-grade910-sourceclaims
UNIT=assps-grade910-scanned-ocr-fallback.service
TIMER=assps-grade910-scanned-ocr-fallback.timer
test -s "$SRC" && test -s /var/lib/assps-grade910-sourceclaims/question-page-textlayer.json
test -s "$ROOT/ops/qbank/assps-grade910-autonomous-six-phase-receipt-20261016.py"
test -f /var/www/apex-backend/node_modules/pdfjs-dist/legacy/build/pdf.mjs
test -f /var/www/apex-backend/node_modules/@napi-rs/canvas/index.js
command -v tesseract >/dev/null
node --check "$SRC"
node --check "$ROOT/ops/qbank/assps-grade910-ocr-resume-guard-20261016.mjs"
node --test "$ROOT/ops/tests/grade910-ocr-resume-guard-20261016.test.mjs"
node --test "$ROOT/ops/tests/grade910-scanned-source-ocr-fallback-20261016.test.mjs"
python3 -m unittest discover -s "$ROOT/ops/tests" -p test_grade910_six_phase_receipt_20261016.py -q
systemd-analyze verify "$ROOT/ops/release/$UNIT" "$ROOT/ops/release/$TIMER"
if [[ "$MODE" == --check ]];then
 echo ASSPS_ENGLISH_SCANNED_OCR_PREFLIGHT_PASS_NO_PRODUCTION_CHANGE
 exit 0
fi
[[ -z "$(git -C "$ROOT" status --porcelain)" ]] || { echo UNCOMMITTED_SOURCE_HOLD;exit 66; }
STATE=/var/lib/assps-grade910-sourceclaims
[[ ! -L "$STATE" ]] || { echo UNSAFE_SOURCE_STATE_SYMLINK;exit 67; }
install -d -m 0700 -o root -g root "$STATE"
mkdir -p "$DEST"
install -m 0644 "$SRC" "$DEST/$(basename "$SRC")"
install -m 0644 "$ROOT/ops/qbank/assps-grade910-ocr-resume-guard-20261016.mjs" "$DEST/assps-grade910-ocr-resume-guard-20261016.mjs"
install -m 0644 "$ROOT/ops/qbank/assps-grade910-autonomous-six-phase-receipt-20261016.py" "$DEST/assps-grade910-autonomous-six-phase-receipt-20261016.py"
install -m 0644 "$ROOT/ops/release/$UNIT" "/etc/systemd/system/$UNIT"
install -m 0644 "$ROOT/ops/release/$TIMER" "/etc/systemd/system/$TIMER"
systemctl daemon-reload
systemctl enable --now "$TIMER"
systemctl is-active --quiet "$TIMER"
echo ASSPS_ENGLISH_SCANNED_OCR_OFF_HOURS_TIMER_ACTIVE_NO_PRODUCTION_CHANGE
