#!/usr/bin/env bash
# SHA-guarded same-service resource-URL recovery for PDF.js v5 JPX decoder.
# Does not touch production PDFs, student results, source manifests, questions,
# grades, or any other systemd unit; does not reset legacy OCR progress.
set -euo pipefail
MODE=--check
if [[ $# -gt 0 ]];then MODE="$1";fi
[[ $# -le 1 && ( "$MODE" == --check || "$MODE" == --apply ) ]] || exit 64
ROOT="$(cd "$(dirname "$0")/../.." && pwd -P)"
SRC="$ROOT/ops/qbank/verify-grade910-scanned-source-ocr-fallback-20261016.mjs"
DST=/usr/local/libexec/assps-grade910-sourceclaims/verify-grade910-scanned-source-ocr-fallback-20261016.mjs
SERVICE=assps-grade910-scanned-ocr-fallback.service
TIMER=assps-grade910-scanned-ocr-fallback.timer
PREVIOUS=599728d156271845debcbd4635eb1631641c6ca493f31b10dfbc23ccca53b49f
[[ -s "$SRC" && -s "$DST" ]] || exit 2
test -d /var/www/apex-backend/node_modules/pdfjs-dist/wasm
test -d /var/www/apex-backend/node_modules/pdfjs-dist/standard_fonts
test -f /var/www/apex-backend/node_modules/pdfjs-dist/wasm/openjpeg.wasm
test -f /var/www/apex-backend/node_modules/pdfjs-dist/wasm/openjpeg_nowasm_fallback.js
command -v node >/dev/null
node --check "$SRC"
node --test "$ROOT/ops/tests/grade910-ocr-pdfjs-local-assets-20261016.test.mjs" "$ROOT/ops/tests/grade910-scanned-source-ocr-fallback-20261016.test.mjs" "$ROOT/ops/tests/grade910-ocr-resume-guard-20261016.test.mjs" >/dev/null
CURRENT="$(sha256sum "$DST" | cut -d' ' -f1)"
NEW="$(sha256sum "$SRC" | cut -d' ' -f1)"
[[ "$CURRENT" == "$PREVIOUS" || "$CURRENT" == "$NEW" ]] || { echo OCR_WORKER_UNKNOWN_SHA_REFUSED >&2;exit 2; }
systemctl is-active --quiet "$TIMER"
if [[ "$MODE" == --check ]];then
 echo 'OCR_PDFJS_EXPLICIT_RESOURCE_ASSET_VALIDATION_AND_25_TESTS_PASS'
 exit 0
fi
[[ "$(id -u)" -eq 0 ]] || exit 65
[[ -z "$(git -C "$ROOT" status --porcelain)" ]] || { echo 'DIRTY_SOURCE_REFUSED' >&2;exit 2; }
# Never replace a currently running OCR worker.
[[ "$(systemctl show "$SERVICE" -p ActiveState --value)" == inactive ]] || { echo OCR_CURRENTLY_RUNNING_RETRY_AFTER_IT_FINISHES >&2;exit 2; }
BACKUP=''
UPDATED=0
restore(){
 result=$?
 if [[ "$result" != 0 && "$UPDATED" == 1 && -n "$BACKUP" ]];then
  install -m 0644 "$BACKUP" "$DST"
  echo 'OCR_PREVIOUS_WORKER_RESTORED' >&2
 fi
 [[ -z "$BACKUP" ]] || rm -f "$BACKUP"
 exit "$result"
}
trap restore EXIT
if [[ "$CURRENT" != "$NEW" ]];then
 BACKUP="$(mktemp /var/lib/assps-grade910-sourceclaims/.pdfjs-pre-wasm-XXXXXX)"
 install -m 0600 "$DST" "$BACKUP"
 install -m 0644 "$SRC" "$DST"
 UPDATED=1
fi
[[ "$(sha256sum "$DST" | cut -d' ' -f1)" == "$NEW" ]]
node --check "$DST"
echo 'ASSPS_EXISTING_OCR_WORKER_PDFJS_DECODER_ASSETS_STAGED_NO_PROGRESS_RESET_OR_PUBLICATION'
trap - EXIT
[[ -z "$BACKUP" ]] || rm -f "$BACKUP"
