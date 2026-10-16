#!/usr/bin/env bash
# Additional official catalog / school-adoption and 2026 vs 2027 exam-year gate.
# Extends SINGLE existing Grade IX/X source-only weekly oneshot (84zz -> 85).
set -euo pipefail
MODE=--check
if [[ $# -gt 0 ]];then MODE="$1";fi
[[ $# -le 1 && ( "$MODE" == --check || "$MODE" == --apply ) ]] || exit 64
ROOT="$(cd "$(dirname "$0")/../.." && pwd -P)"
SERVICE=assps-grade910-live-source-claims.service
DIR="/etc/systemd/system/$SERVICE.d"
TARGET="$DIR/84zz-grade910-session-2027-applicability.conf"
GATE="$ROOT/ops/qbank/build-grade910-session-adoption-evidence-gate-20261016.py"
PHASE="$ROOT/ops/qbank/assps-grade910-autonomous-six-phase-receipt-20261016.py"
PHASE_LIVE=/usr/local/libexec/assps-grade910-sourceclaims/assps-grade910-six-phase-current-numeric-proof-20261016.py
PREVIOUS=7f2b8ad3908689d43d2ebc5e60da14e2aa90069c510ff5b9d31006daba0ab29f
NEW_SHA="$(sha256sum "$PHASE" | cut -d' ' -f1)"
OLD_SHA="$(sha256sum "$PHASE_LIVE" | cut -d' ' -f1)"
for file in 80-grade910-live-numerical-proofs.conf 82-grade910-mcq-choice-equivalence.conf 84-grade910-subjective-depth-review.conf 84z-grade910-prior-long-answer-research.conf 85-grade910-current-machine-phase.conf;do
 [[ -s "$DIR/$file" ]] || { echo "MISSING_PRIOR_ACADEMIC_CHECKPOINT:$file" >&2;exit 2; }
done
[[ "$OLD_SHA" == "$PREVIOUS" || "$OLD_SHA" == "$NEW_SHA" ]] || { echo 'UNKNOWN_ACADEMIC_RELEASE_GENERATOR_REFUSED' >&2;exit 2; }
[[ -s "$GATE" && -s "$PHASE" ]] || exit 2
EXPECTED="[Service]"$'\n'"ExecStartPost=/usr/bin/python3 $GATE"
[[ ! -e "$TARGET" || "$(cat "$TARGET")" == "$EXPECTED" ]] || { echo 'UNKNOWN_84zz_HOOK_COLLISION' >&2;exit 2; }
python3 -m py_compile "$GATE" "$PHASE"
python3 -m unittest discover -s "$ROOT/ops/tests" -p test_grade910_2026_27_catalog_vs_assps_adoption_evidence_20261016.py -q
python3 -m unittest discover -s "$ROOT/ops/tests" -p test_grade910_catalog_alp_2027_publication_hold_20261016.py -q
if [[ "$MODE" == --check ]];then
 echo 'ASSPS_CATALOG_YEAR_VS_ACTUAL_SCHOOL_ADOPTION_OFFLINE_QA_PASS'
 exit 0
fi
[[ "$(id -u)" -eq 0 ]] || exit 65
[[ -z "$(git -C "$ROOT" status --porcelain)" ]] || { echo 'DIRTY_ACADEMIC_SOURCE_REFUSED' >&2;exit 2; }
[[ -d /var/lib/assps-grade910-sourceclaims && ! -L /var/lib/assps-grade910-sourceclaims ]] || exit 3
python3 "$GATE" >/dev/null
BACKUP=''
UPDATED=0
ADDED=0
restore_on_failure() {
 status=$?
 if [[ "$status" != 0 ]];then
  [[ "$ADDED" == 0 ]] || rm -f "$TARGET"
  [[ "$UPDATED" == 0 || -z "$BACKUP" ]] || install -m 0644 "$BACKUP" "$PHASE_LIVE"
  systemctl daemon-reload || true
  echo 'GRADE910_SOURCE_GATE_INSTALL_ROLLBACK_DONE' >&2
 fi
 [[ -z "$BACKUP" ]] || rm -f "$BACKUP"
 exit "$status"
}
trap restore_on_failure EXIT
if [[ "$OLD_SHA" != "$NEW_SHA" ]];then
 BACKUP="$(mktemp /var/lib/assps-grade910-sourceclaims/.prior-phase-source-XXXXXX)"
 chmod 0600 "$BACKUP"
 install -m 0600 "$PHASE_LIVE" "$BACKUP"
 install -m 0644 "$PHASE" "$PHASE_LIVE"
 UPDATED=1
fi
if [[ ! -e "$TARGET" ]];then
 printf '%s\n' "$EXPECTED" > "$TARGET"
 chmod 0644 "$TARGET"
 ADDED=1
fi
systemctl daemon-reload
[[ "$(sha256sum "$PHASE_LIVE" | cut -d' ' -f1)" == "$NEW_SHA" ]]
[[ "$(cat "$TARGET")" == "$EXPECTED" ]]
systemctl is-active --quiet assps-grade910-live-source-claims.timer
echo 'ASSPS_CATALOG_VS_SCHOOL_ADOPTION_84zz_STAGED_SINGLE_AUDIT_TIMER_NO_RELEASE'
trap - EXIT
[[ -z "$BACKUP" ]] || rm -f "$BACKUP"
