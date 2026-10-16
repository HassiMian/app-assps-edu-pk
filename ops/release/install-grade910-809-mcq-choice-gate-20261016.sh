#!/usr/bin/env bash
# Separate Grade IX/X School1 MCQ mechanical-choice audit. No Question Bank DB writes.
set -euo pipefail
MODE=--check
[[ $# -eq 0 ]] || MODE="$1"
[[ "$MODE" == "--check" || "$MODE" == "--apply" ]] || exit 64
REPO="$(cd "$(dirname "$0")/../.." && pwd -P)"
SRC="$REPO/ops/qbank/audit-grade910-live-mcq-choice-equivalence-20261016.py"
TEST=test_grade910_live_mcq_choice_equivalence_20261016.py
MAIN=assps-grade910-live-source-claims.service
PRE="/etc/systemd/system/$MAIN.d/80-grade910-live-numerical-proofs.conf"
POST="/etc/systemd/system/$MAIN.d/85-grade910-current-machine-phase.conf"
TARGET="/etc/systemd/system/$MAIN.d/82-grade910-mcq-choice-equivalence.conf"
[[ -f "$PRE" && -f "$POST" && -f "$SRC" ]] || { echo 'ACADEMIC_SERVICE_EVIDENCE_CHAIN_INCOMPLETE' >&2; exit 2; }
grep -q 'recompute-grade910-21-original-numericals-20261016.py' "$PRE"
grep -q 'assps-grade910-six-phase-current-numeric-proof-20261016.py' "$POST"
python3 -m py_compile "$SRC"
python3 -m unittest discover -s "$REPO/ops/tests" -p "$TEST" -q
if [[ "$MODE" == "--check" ]];then
 echo 'MCQ_OPTION_GATE_CHECK_PASS_NO_DEPLOYMENT'
 exit 0
fi
[[ "$(id -u)" -eq 0 ]] || exit 65
[[ -z "$(git -C "$REPO" status --porcelain)" ]] || { echo 'UNCOMMITTED_ACADEMIC_SOURCE_DENIED' >&2; exit 2; }
(
 cd "$REPO"
 python3 ops/qbank/audit-grade910-live-mcq-choice-equivalence-20261016.py
)
EXPECTED="[Service]"$'\n'"ExecStartPost=/usr/bin/python3 $SRC"
if [[ -e "$TARGET" && "$(cat "$TARGET")" != "$EXPECTED" ]];then
 echo 'EXISTING_MCQS_AUDIT_DROPIN_CONFLICT' >&2; exit 2
fi
NEW=0
if [[ ! -e "$TARGET" ]];then
 printf '%s\n' "$EXPECTED" > "$TARGET"
 chmod 0644 "$TARGET"
 NEW=1
fi
cleanup_failed(){
 rc=$?
 if ((rc!=0 && NEW==1));then
  rm -f "$TARGET"
  systemctl daemon-reload || true
  echo 'MCQ_ADDITIVE_AUDIT_DROPIN_ROLLED_BACK' >&2
 fi
 exit "$rc"
}
trap cleanup_failed EXIT
systemctl daemon-reload
# Long-running PDF source jobs must NEVER hold the installer process open.
# Execute and independently verify the full existing academic service separately.
systemctl is-active --quiet assps-grade910-live-source-claims.timer
printf '%s\n' "MCQ_HOOK_STAGED_NOT_YET_SERVICE_CERTIFIED"
trap - EXIT
