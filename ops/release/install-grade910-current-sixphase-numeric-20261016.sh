#!/usr/bin/env bash
# Academic-only additive six-phase checkpoint reconciliation; no SaaS deployment.
set -euo pipefail
MODE=--check
[[ $# -eq 0 ]] || MODE="$1"
[[ "$MODE" == "--check" || "$MODE" == "--apply" ]] || exit 64
REPO="$(cd "$(dirname "$0")/../.." && pwd -P)"
SRC="$REPO/ops/qbank/assps-grade910-autonomous-six-phase-receipt-20261016.py"
MAIN=assps-grade910-live-source-claims.service
DIR=/usr/local/libexec/assps-grade910-sourceclaims
COPY="$DIR/assps-grade910-six-phase-current-numeric-proof-20261016.py"
DROP="/etc/systemd/system/$MAIN.d/85-grade910-current-machine-phase.conf"
PRIOR="/etc/systemd/system/$MAIN.d/80-grade910-live-numerical-proofs.conf"
[[ -f "$SRC" && -f "$PRIOR" ]] || { echo 'MISSING_EXISTING_ACADEMIC_PROOF_SOURCE' >&2; exit 2; }
grep -q 'recompute-grade910-21-original-numericals-20261016.py' "$PRIOR" || { echo 'PRIOR_NUMERIC_HOOK_CHANGED' >&2; exit 2; }
python3 -m py_compile "$SRC"
python3 -m unittest discover -s "$REPO/ops/tests" -p test_grade910_six_phase_current_numeric_proof_20261016.py -q
python3 -m unittest discover -s "$REPO/ops/tests" -p test_grade910_six_phase_receipt_20261016.py -q
if [[ "$MODE" == "--check" ]];then
 echo 'ACADEMIC_CURRENT_PHASE_HOOK_CHECK_PASS_NO_SYSTEM_MODIFICATION'
 exit 0
fi
[[ "$(id -u)" -eq 0 ]] || exit 65
[[ -z "$(git -C "$REPO" status --porcelain)" ]] || { echo 'DIRTY_ACADEMIC_CHECKOUT_DENIED' >&2; exit 2; }
mkdir -p "$(dirname "$DROP")"
EXPECTED="[$(printf 'Service')]"$'\n'"ExecStartPost=/usr/bin/python3 $COPY"
if [[ -e "$DROP" && "$(cat "$DROP")" != "$EXPECTED" ]];then
 echo 'DIFFERENT_PHASE_HOOK_ALREADY_INSTALLED' >&2
 exit 2
fi
if [[ -e "$COPY" ]] && ! cmp -s "$SRC" "$COPY";then
 echo 'DIFFERENT_PHASE_EXECUTABLE_ALREADY_INSTALLED' >&2
 exit 2
fi
MADE_COPY=0
MADE_DROP=0
undo_if_failed(){
  rc=$?
  if ((rc!=0));then
    if ((MADE_DROP==1));then rm -f "$DROP";fi
    if ((MADE_COPY==1));then rm -f "$COPY";fi
    systemctl daemon-reload || true
    echo 'ADDITIVE_ACADEMIC_PHASE_HOOK_ROLLED_BACK_AFTER_FAILURE' >&2
  fi
  exit "$rc"
}
trap undo_if_failed EXIT
if [[ ! -e "$COPY" ]];then
 install -m 0644 "$SRC" "$COPY"
 MADE_COPY=1
fi
if [[ ! -e "$DROP" ]];then
 printf '%s\n' "$EXPECTED" > "$DROP"
 chmod 0644 "$DROP"
 MADE_DROP=1
fi
systemctl daemon-reload
# Long-running PDF source jobs must NEVER hold the installer process open.
# Execute and independently verify the full existing academic service separately.
systemctl is-active --quiet assps-grade910-live-source-claims.timer
printf '%s\n' "SIX_PHASE_HOOK_STAGED_NOT_YET_SERVICE_CERTIFIED"
trap - EXIT
