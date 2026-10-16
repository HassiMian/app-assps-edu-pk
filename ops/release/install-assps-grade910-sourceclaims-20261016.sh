#!/usr/bin/env bash
# Safe unattended academic source claims audit. NO school DB writes or approval promotion.
set -euo pipefail
MODE=--check
if [[ $# -gt 0 ]];then MODE="$1";fi
[[ "$MODE" == --check || "$MODE" == --apply ]] || exit 64
[[ "$(id -u)" == 0 ]] || exit 65
REPO=/root/workspace/assps-grade910-metadata-source-claim-20261016
SRC="$REPO/ops/qbank/audit-live-grade910-source-claims-20261016.py"
TEST=test_grade910_live_source_claim_recovery_20261016.py
MAN="$REPO/al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/officialSourceManifest.json"
ORIGINAL="$REPO/docs/question-bank/ASSPS_GRADE910_UNIFIED_2581_FACULTY_CONTENT_REVIEW_PRIORITIES_20261011.json"
UNIT=assps-grade910-live-source-claims.service
TIMER=assps-grade910-live-source-claims.timer
DEST=/usr/local/libexec/assps-grade910-sourceclaims
test -s "$SRC" && test -s "$MAN" && test -s "$ORIGINAL"
python3 -m py_compile "$SRC"
python3 -m py_compile "$REPO/ops/qbank/reconcile-grade910-held-original-candidates-20261016.py"
python3 -m py_compile "$REPO/ops/qbank/audit-grade910-live-answer-integrity-20261016.py"
python3 -m py_compile "$REPO/ops/qbank/assps-grade910-autonomous-six-phase-receipt-20261016.py"
python3 -m py_compile "$REPO/ops/qbank/assps-grade910-held170-near-duplicate-screen-20261016.py"
node --check "$REPO/ops/qbank/verify-grade910-pdf-physical-page-bounds-20261016.mjs"
node --test "$REPO/ops/tests/grade910-physical-pdf-page-bounds-20261016.test.mjs"
node --check "$REPO/ops/qbank/verify-grade910-pdf-question-text-evidence-20261016.mjs"
node --test "$REPO/ops/tests/grade910-pdf-question-text-evidence-20261016.test.mjs"
python3 -m unittest discover -s "$REPO/ops/tests" -p "$TEST" -q
python3 -m unittest discover -s "$REPO/ops/tests" -p test_grade910_170_original_reconciliation_20261016.py -q
python3 -m unittest discover -s "$REPO/ops/tests" -p test_grade910_live_answer_integrity_20261016.py -q
python3 -m unittest discover -s "$REPO/ops/tests" -p test_grade910_six_phase_receipt_20261016.py -q
python3 -m unittest discover -s "$REPO/ops/tests" -p test_grade910_held170_near_duplicate_screen_20261016.py -q
systemd-analyze verify "$REPO/ops/release/$UNIT" "$REPO/ops/release/$TIMER"
if [[ "$MODE" == --check ]];then
 echo ASSPS_SOURCE_CLAIMS_PREFLIGHT_PASS_NO_PRODUCTION_CHANGE
 exit 0
fi
[[ -z "$(git -C "$REPO" status --porcelain)" ]] || { echo UNCOMMITTED_SOURCE_HOLD;exit 66; }
STATE=/var/lib/assps-grade910-sourceclaims
[[ ! -L "$STATE" ]] || { echo UNSAFE_SOURCE_STATE_SYMLINK;exit 67; }
install -d -m 0700 -o root -g root "$STATE"
mkdir -p "$DEST"
install -m 0644 "$SRC" "$DEST/$(basename "$SRC")"
install -m 0644 "$REPO/ops/qbank/reconcile-grade910-held-original-candidates-20261016.py" "$DEST/reconcile-grade910-held-original-candidates-20261016.py"
install -m 0644 "$REPO/ops/qbank/audit-grade910-live-answer-integrity-20261016.py" "$DEST/audit-grade910-live-answer-integrity-20261016.py"
install -m 0644 "$REPO/ops/qbank/assps-grade910-autonomous-six-phase-receipt-20261016.py" "$DEST/assps-grade910-autonomous-six-phase-receipt-20261016.py"
install -m 0644 "$REPO/ops/qbank/assps-grade910-held170-near-duplicate-screen-20261016.py" "$DEST/assps-grade910-held170-near-duplicate-screen-20261016.py"
install -m 0644 "$REPO/ops/qbank/verify-grade910-pdf-physical-page-bounds-20261016.mjs" "$DEST/verify-grade910-pdf-physical-page-bounds-20261016.mjs"
install -m 0644 "$REPO/ops/qbank/verify-grade910-pdf-question-text-evidence-20261016.mjs" "$DEST/verify-grade910-pdf-question-text-evidence-20261016.mjs"
mkdir -p "$DEST/held-stems"
chmod 700 "$DEST/held-stems"
for fn in biology9Chapter1TopicDrafts.json biology9TopicResearchDrafts.json english9CompetencyOriginals2026.json mathematics10OriginalReasoningBatch2026.json physics10OriginalApplicationBatch2026.json;do
 install -m 0600 "$REPO/al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/$fn" "$DEST/held-stems/$fn"
done
install -m 0644 "$REPO/docs/question-bank/ASSPS_GRADE910_2581_PUBLIC_SAFE_REVIEW_CROSSWALK_20261015.json" "$DEST/originalReviewCrosswalk2581.json"
install -m 0644 "$MAN" "$DEST/officialSourceManifest.json"
install -m 0644 "$ORIGINAL" "$DEST/frozenOriginalResearchIDs.json"
install -m 0644 "$REPO/ops/release/$UNIT" "/etc/systemd/system/$UNIT"
install -m 0644 "$REPO/ops/release/$TIMER" "/etc/systemd/system/$TIMER"
systemctl daemon-reload
systemctl enable --now "$TIMER"
systemctl start "$UNIT"
systemctl is-active --quiet "$TIMER"
python3 - <<'PY'
from pathlib import Path
import json
r=json.loads(Path('/var/lib/assps-grade910-sourceclaims/latest.json').read_text())
s=r['summary']
assert s['rows']>=2000 and s['newAcademicApprovals']==0
assert s['cachedPdfHashesConflicting']==0
assert s['manifestHashMatches']==s['rows']
assert s['orphanLiveSeedIds']==0
assert s['liveIdsMatchingProtectedOriginals']==s['rows']
assert not r['facultySignaturesCreated']
h=json.loads(Path('/var/lib/assps-grade910-sourceclaims/held170.json').read_text())
assert h['sourceIdsNotInLive']==170 and h['existingUnsignedFacultyFormsVerified']==170
assert h['newApprovedQuestions']==0 and h['databaseWrites']==0
z=json.loads(Path('/var/lib/assps-grade910-sourceclaims/live-answer-integrity.json').read_text())
assert z['liveCandidateRows']>=2411 and z['mcqCandidates']>=809
assert z['substantiveOrStructuralAnswerConflicts']==0
assert z['recordCompletenessIssues']=={} and z['missingAnswerRecords']==0
assert z['unexpectedApprovedWithoutAuthenticatedReviewerEvidence']==0
assert z['productionDatabaseWrites']==0
p=json.loads(Path('/var/lib/assps-grade910-sourceclaims/autonomous-six-phase-checkpoint.json').read_text())
assert p['phaseCount']==6 and p['machinePassedPhases']>=4
assert p['academicVerifiedPublicationReady'] is False
assert p['authenticIndependentAcademicApprovals']==0
assert p['academicPublicationDecision']=='BLOCK_UNVERIFIED_QUESTION_PUBLICATION'
n=json.loads(Path('/var/lib/assps-grade910-sourceclaims/held170-near-duplicate.json').read_text())
assert n['sourceOriginalOnly']==170 and n['liveComparisonRows']==2411
assert n['automaticImports']==0 and n['newApprovals']==0 and n['confirmedDuplicateCount']==0
assert len(n['rows'])==170
v=json.loads(Path('/var/lib/assps-grade910-sourceclaims/physical-page-count.json').read_text())
assert v['summary']['catalogPdfFilesVerified']==56
assert v['summary']['pdfPageCountConflicts']==0
assert v['summary']['originalAuthorPageClaims']==998
assert v['summary']['authorPageClaimsWithinActualPdfRange']==998
assert v['summary']['authorPageClaimsOutsideActualPdfRange']==0
assert v['summary']['independentlyVerifiedQuestionPages']==0
t=json.loads(Path('/var/lib/assps-grade910-sourceclaims/question-page-textlayer.json').read_text())
assert t['summary']['claimsChecked']==998
assert t['summary']['distinctPdfPagesChecked']==162
assert t['summary']['independentlyVerifiedQuestionPages']==0
assert t['summary']['genuineFacultyApproved']==0
assert t['summary']['newPublishedQuestions']==0
assert t['summary']['productionDatabaseWrites']==0
assert sum(t['summary']['categories'].values())==998
print('ASSPS_SOURCE_CLAIMS_WEEKLY_INSTALLED_FIRST_RUN_PASS',s['rows'],
      s['cachedPdfHashesMatchingManifest'],s['authorPageClaimsRangePlausibleOnly'])
PY
