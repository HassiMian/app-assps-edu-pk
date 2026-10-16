#!/usr/bin/env bash
# Additive academic-only link of historical authored explanations to CURRENT live
# question-revision risk backlog. Not a release, import, or staff review.
set -euo pipefail
MODE=--check
[[ $# -eq 0 ]] || MODE="$1"
[[ "$MODE" == "--check" || "$MODE" == "--apply" ]] || exit 64
ROOT="$(cd "$(dirname "$0")/../.." && pwd -P)"
Q="$ROOT/ops/qbank/audit-grade910-existing-long-answer-proposal-crosswalk-20261016.py"
PHASE="$ROOT/ops/qbank/assps-grade910-autonomous-six-phase-receipt-20261016.py"
MAIN=assps-grade910-live-source-claims.service
DIR="/etc/systemd/system/$MAIN.d"
TARGET="$DIR/84z-grade910-prior-long-answer-research.conf"
PHASE_LIVE=/usr/local/libexec/assps-grade910-sourceclaims/assps-grade910-six-phase-current-numeric-proof-20261016.py
PREVIOUS=e42b7699a3c2b77333570a3a0d2f08bc3403934c27ca8eff368e641e3f0f95ca
for name in 80-grade910-live-numerical-proofs.conf 82-grade910-mcq-choice-equivalence.conf 84-grade910-subjective-depth-review.conf 85-grade910-current-machine-phase.conf;do
 [[ -s "$DIR/$name" ]] || { echo "MISSING_PREVIOUS_ACADEMIC_QA_HOOK_$name" >&2;exit 2; }
done
[[ -s "$Q" && -s "$PHASE" && -s "$PHASE_LIVE" ]] || exit 2
python3 -m py_compile "$Q" "$PHASE"
for test in test_grade910_existing_long_answer_proposal_crosswalk_20261016.py test_grade910_historical_answer_research_phase_guard_20261016.py test_grade910_subjective_six_phase_gate_20261016.py test_grade910_six_phase_receipt_20261016.py test_grade910_biology10_urdu_ten_explanation_drafts_20261016.py test_grade910_new_urdu_biology_research_queue_gate_20261016.py test_grade910_new_fourteen_urdu_original_explanations_20261016.py test_grade910_second_urdu_crosswalk_release_hold_20261016.py test_grade910_new_ten_urdu_chemistry_original_research_20261016.py test_grade910_ten_urdu_chemistry_research_crosswalk_20261016.py test_grade910_english21_essay_exemplar_research_20261016.py test_grade9_urdu_chemistry8_conceptual_answers_20261016.py test_grade910_29_essay_and_urdu_chem_current_gate_20261016.py;do
 python3 -m unittest discover -s "$ROOT/ops/tests" -p "$test" -q
done
CURRENT_SHA="$(sha256sum "$PHASE_LIVE" | cut -d' ' -f1)"
NEW_SHA="$(sha256sum "$PHASE" | cut -d' ' -f1)"
[[ "$CURRENT_SHA" == "$PREVIOUS" || "$CURRENT_SHA" == "$NEW_SHA" ]] || { echo 'UNKNOWN_EXISTING_SIXPHASE_GENERATOR' >&2;exit 2; }
EXPECTED="[Service]"$'\n'"ExecStartPost=/usr/bin/python3 $Q"
[[ ! -e "$TARGET" || "$(cat "$TARGET")" == "$EXPECTED" ]] || { echo 'UNEXPECTED_RESEARCH_HOOK_COLLISION' >&2;exit 2; }
if [[ "$MODE" == "--check" ]];then
 echo 'HISTORICAL_LONG_ANSWER_RESEARCH_HOOK_SOURCE_QA_CHECK_PASS'
 exit 0
fi
[[ "$(id -u)" -eq 0 ]] || exit 65
[[ -z "$(git -C "$ROOT" status --porcelain)" ]] || { echo 'DIRTY_SOURCE_REFUSED' >&2;exit 2; }
python3 "$ROOT/ops/qbank/author-grade10-urdu-biology-ten-research-answers-20261016.py" --check
python3 "$ROOT/ops/qbank/author-grade9-biology8-grade10-computer6-urdu-research-20261016.py" --check
python3 "$ROOT/ops/qbank/author-grade10-urdu-chemistry-ten-safe-conceptual-answers-20261016.py" --check
python3 "$ROOT/ops/qbank/author-grade910-english-21-essay-exemplars-20261016.py" --check
python3 "$ROOT/ops/qbank/author-grade9-urdu-chemistry-eight-conceptual-20261016.py" --check
BACKUP=''
CHANGED=0
ADDED=0
rollback_if_failed(){
 status=$?
 if [[ "$status" -ne 0 ]];then
  [[ "$ADDED" -ne 1 ]] || rm -f "$TARGET"
  [[ "$CHANGED" -ne 1 || -z "$BACKUP" ]] || install -m 0644 "$BACKUP" "$PHASE_LIVE"
  systemctl daemon-reload || true
  echo 'HISTORICAL_ACADEMIC_HOOK_ROLLED_BACK' >&2
 fi
 [[ -z "$BACKUP" ]] || rm -f "$BACKUP"
 exit "$status"
}
trap rollback_if_failed EXIT
if [[ "$CURRENT_SHA" != "$NEW_SHA" ]];then
 BACKUP="$(mktemp /var/lib/assps-grade910-sourceclaims/.prior-long-answer-phase-XXXXXX)"
 install -m 0600 "$PHASE_LIVE" "$BACKUP"
 install -m 0644 "$PHASE" "$PHASE_LIVE"
 CHANGED=1
fi
if [[ ! -e "$TARGET" ]];then
 printf '%s\n' "$EXPECTED" > "$TARGET"
 chmod 0644 "$TARGET"
 ADDED=1
fi
systemctl daemon-reload
[[ "$(sha256sum "$PHASE_LIVE" | cut -d' ' -f1)" == "$NEW_SHA" ]]
test -s "$TARGET"
systemctl is-active --quiet assps-grade910-live-source-claims.timer
echo 'HISTORICAL_84z_RESEARCH_HOOK_STAGED_NOT_FULL_SERVICE_CERTIFIED'
trap - EXIT
[[ -z "$BACKUP" ]] || rm -f "$BACKUP"
