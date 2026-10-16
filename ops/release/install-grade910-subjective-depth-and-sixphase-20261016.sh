#!/usr/bin/env bash
# Strictly academic: add original model-answer depth triage without touching
# the school production database, paper renderer or reviewer approvals.
set -euo pipefail
MODE=--check
[[ $# -eq 0 ]] || MODE="$1"
[[ "$MODE" == "--check" || "$MODE" == "--apply" ]] || exit 64
REPO="$(cd "$(dirname "$0")/../.." && pwd -P)"
Q="$REPO/ops/qbank/audit-grade910-subjective-answer-depth-20261016.py"
P="$REPO/ops/qbank/assps-grade910-autonomous-six-phase-receipt-20261016.py"
CURRENT=/usr/local/libexec/assps-grade910-sourceclaims/assps-grade910-six-phase-current-numeric-proof-20261016.py
MAIN=assps-grade910-live-source-claims.service
DROP=/etc/systemd/system/$MAIN.d/84-grade910-subjective-depth-review.conf
OLDER_SHA=1df810e7b6d2279ffcb6ee628d5f3b17d5b5ea15f178e99d948fc705428b1041
[[ -f "$Q" && -f "$P" && -f "$CURRENT" ]] || { echo MISSING_ACADEMIC_SOURCE; exit 2; }
for name in 80-grade910-live-numerical-proofs.conf 82-grade910-mcq-choice-equivalence.conf 85-grade910-current-machine-phase.conf; do
 [[ -f "/etc/systemd/system/$MAIN.d/$name" ]] || { echo "MISSING_DEPENDENCY_$name";exit 2; }
done
grep -Fq "$CURRENT" "/etc/systemd/system/$MAIN.d/85-grade910-current-machine-phase.conf" || { echo PHASE_EXECUTABLE_CHANGED;exit 2; }
python3 -m py_compile "$Q" "$P"
for pattern in test_grade910_subjective_answer_depth_20261016.py test_grade910_subjective_six_phase_gate_20261016.py test_grade910_six_phase_receipt_20261016.py test_grade910_six_phase_current_numeric_proof_20261016.py; do
 python3 -m unittest discover -s "$REPO/ops/tests" -p "$pattern" -q
done
EXPECTED="[Service]"$'\n'"ExecStartPost=/usr/bin/python3 $Q"
if [[ -e "$DROP" && "$(cat "$DROP")" != "$EXPECTED" ]];then
 echo FOREIGN_SUBJECTIVE_HOOK_REFUSED;exit 2
fi
old_actual="$(sha256sum "$CURRENT" | awk '{print $1}')"
new_actual="$(sha256sum "$P" | awk '{print $1}')"
if [[ "$old_actual" != "$OLDER_SHA" && "$old_actual" != "$new_actual" ]];then
 echo UNREVIEWED_EXISTING_SIX_PHASE_SCRIPT_REFUSED;exit 2
fi
if [[ "$MODE" == "--check" ]];then
 echo 'SUBJECTIVE_84_CHECK_PASS_NO_SYSTEM_MUTATIONS'
 exit 0
fi
[[ "$(id -u)" == 0 ]] || exit 65
[[ -z "$(git -C "$REPO" status --porcelain)" ]] || { echo DIRTY_ACADEMIC_BRANCH_NOT_DEPLOYED;exit 2; }
BACKUP=''
CHANGED=0
ADDED=0
rollback_if_failed(){
 code=$?
 if ((code!=0));then
  [[ "$ADDED" -eq 0 ]] || rm -f "$DROP"
  if [[ "$CHANGED" -eq 1 && -n "$BACKUP" ]];then
   install -m 0644 "$BACKUP" "$CURRENT"
  fi
  systemctl daemon-reload || true
  echo ACADEMIC_HOOK_STAGING_ROLLED_BACK >&2
 fi
 [[ -z "$BACKUP" ]] || rm -f "$BACKUP"
 exit "$code"
}
trap rollback_if_failed EXIT
if [[ "$old_actual" != "$new_actual" ]];then
 BACKUP="$(mktemp /var/lib/assps-grade910-sourceclaims/.phase-prior-XXXXXX)"
 install -m 0600 "$CURRENT" "$BACKUP"
 install -m 0644 "$P" "$CURRENT"
 CHANGED=1
fi
if [[ ! -e "$DROP" ]];then
 printf '%s\n' "$EXPECTED" > "$DROP"
 chmod 0644 "$DROP"
 ADDED=1
fi
systemctl daemon-reload
[[ "$(sha256sum "$CURRENT"|awk '{print $1}')" == "$new_actual" ]]
test -f "$DROP"
systemctl is-active --quiet assps-grade910-live-source-claims.timer
echo 'SUBJECTIVE_84_STAGED_NOT_YET_FULL_AUDIT_CERTIFIED'
trap - EXIT
[[ -z "$BACKUP" ]] || rm -f "$BACKUP"
