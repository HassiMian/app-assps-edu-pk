#!/usr/bin/env bash
# Additive academic numerical QA only. Existing main unit, production code and school data untouched.
set -euo pipefail
MODE=--check
[[ $# -gt 0 ]] && MODE="$1"
[[ "$MODE" == "--check" || "$MODE" == "--apply" ]] || exit 64
REPO="$(cd "$(dirname "$0")/../.." && pwd -P)"
SRC="$REPO/ops/qbank/recompute-grade910-21-original-numericals-20261016.py"
SUITE="$REPO/ops/tests/test_grade910_numerical_deep_recompute_20261016.py"
MAIN=assps-grade910-live-source-claims.service
TARGET="/etc/systemd/system/$MAIN.d/80-grade910-live-numerical-proofs.conf"
RECEIPT=/var/lib/assps-grade910-sourceclaims/numerical-deep-recomputation-21.json
[[ -f "$SRC" && -f "$SUITE" ]]
[[ -f "/etc/systemd/system/$MAIN" ]] || { echo "EXISTING_ACADEMIC_SERVICE_NOT_INSTALLED" >&2; exit 2; }
grep -q 'build-grade910-numerical-review-priority-20261016.py' "/etc/systemd/system/$MAIN" || { echo "SOURCE_AUDIT_CHAIN_CHANGED" >&2; exit 2; }
python3 -m py_compile "$SRC"
python3 -m unittest discover -s "$REPO/ops/tests" -p test_grade910_numerical_deep_recompute_20261016.py -q
(
 cd "$REPO"
 python3 ops/qbank/recompute-grade910-21-original-numericals-20261016.py
)
if [[ "$MODE" == "--check" ]];then
 echo "NUMERICAL_SOURCE_HOOK_CHECK_PASS_NO_SYSTEM_MODIFICATION"
 exit 0
fi
[[ "$(id -u)" -eq 0 ]] || exit 65
[[ -z "$(git -C "$REPO" status --porcelain)" ]] || { echo "UNCOMMITTED_ACADEMIC_SOURCE_REFUSED" >&2; exit 2; }
# Refuse to overwrite another workstream's systemd drop-in.
EXPECTED=$(printf '[Service]\nExecStartPost=/usr/bin/python3 %s --live-readonly --write-private-receipt\n' "$SRC")
if [[ -e "$TARGET" && "$(cat "$TARGET")" != "$EXPECTED" ]];then
 echo 'DIFFERENT_HOOK_ALREADY_EXISTS_REFUSED' >&2
 exit 2
fi
CREATED_NEW=0
if [[ ! -e "$TARGET" ]];then CREATED_NEW=1;fi
recover_if_failed() {
 code=$?
 if ((code!=0 && CREATED_NEW==1));then
  rm -f "$TARGET"
  systemctl daemon-reload || true
  echo 'NEW_ACADEMIC_DROPIN_ROLLED_BACK' >&2
 fi
 exit "$code"
}
trap recover_if_failed EXIT
install -d -m 0755 "$(dirname "$TARGET")"
TMP="$(mktemp -p "$(dirname "$TARGET")" .academic-XXXXXX)"
trap 'rm -f "$TMP"' RETURN
printf '%s\n' "$EXPECTED" > "$TMP"
install -m 0644 "$TMP" "$TARGET"
rm -f "$TMP"
systemctl daemon-reload
systemctl start "$MAIN"
python3 - "$RECEIPT" <<'PY'
from pathlib import Path
import json,sys
p=Path(sys.argv[1])
assert p.stat().st_mode & 0o077 == 0,'PRIVATE_RECEIPT_PERMISSION_ERROR'
data=json.loads(p.read_text())
assert data['combined80NumericalReadOnlyProof'] is True
assert data['currentLiveStemsAndAnswersMatched']==21
assert data['prior59FullLiveRevisionAndStemReauthenticated']==59
assert data['liveTextComparisonFailures']==0
assert data['productionDatabaseWrites']==0
assert data['qualifiedFacultyApprovalsCreated']==0
assert data['paperStudioPublicationEnabled'] is False
print('ADDITIVE_WEEKLY_ACADEMIC_NUMERICAL_PROOF_INSTALLED_80_OF_80_PASS')
PY
systemctl is-active --quiet assps-grade910-live-source-claims.timer
systemctl show "$MAIN" -p Result -p ExecMainStatus --no-pager
trap - EXIT
