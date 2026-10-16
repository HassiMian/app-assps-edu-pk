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
UNIT=assps-grade910-live-source-claims.service
TIMER=assps-grade910-live-source-claims.timer
DEST=/usr/local/libexec/assps-grade910-sourceclaims
test -s "$SRC" && test -s "$MAN"
python3 -m py_compile "$SRC"
python3 -m unittest discover -s "$REPO/ops/tests" -p "$TEST" -q
systemd-analyze verify "$REPO/ops/release/$UNIT" "$REPO/ops/release/$TIMER"
if [[ "$MODE" == --check ]];then
 echo ASSPS_SOURCE_CLAIMS_PREFLIGHT_PASS_NO_PRODUCTION_CHANGE
 exit 0
fi
[[ -z "$(git -C "$REPO" status --porcelain)" ]] || { echo UNCOMMITTED_SOURCE_HOLD;exit 66; }
mkdir -p "$DEST"
install -m 0644 "$SRC" "$DEST/$(basename "$SRC")"
install -m 0644 "$MAN" "$DEST/officialSourceManifest.json"
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
assert not r['facultySignaturesCreated']
print('ASSPS_SOURCE_CLAIMS_WEEKLY_INSTALLED_FIRST_RUN_PASS',s['rows'],
      s['cachedPdfHashesMatchingManifest'],s['authorPageClaimsRangePlausibleOnly'])
PY
