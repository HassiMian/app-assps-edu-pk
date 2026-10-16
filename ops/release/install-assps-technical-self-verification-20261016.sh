#!/usr/bin/env bash
# Read-only monitor: does not modify SaaS DB, score data, printer jobs or approval status.
set -euo pipefail
MODE="${1:---check}"
[[ "$MODE" == --check || "$MODE" == --apply ]] || { echo "USAGE: --check|--apply";exit 64; }
[[ "$(id -u)" == 0 ]] || { echo "ROOT_REQUIRED";exit 65; }
# Resolve THIS Git worktree, never a stale chat/worktree copied months ago.
SOURCE="$(cd -- "$(dirname -- "$(readlink -f "$0")")" && pwd -P)"
REPO="$(cd -- "$SOURCE/../.." && pwd -P)"
if ! { test -d "$REPO/.git" || test -f "$REPO/.git"; };then echo "NOT_A_GIT_SOURCE_WORKTREE";exit 69;fi
[[ -z "$(git -C "$REPO" status --porcelain)" ]] || { echo "FAIL_CLOSED_DIRTY_SOURCE_WORKTREE";exit 70; }
DEST=/usr/local/libexec/assps-technical-self-verification
SERVICE=assps-technical-self-verification.service
TIMER=assps-technical-self-verification.timer
LOCK=/run/lock/assps-selfverify-install.lock
exec 8>"$LOCK";flock -n 8 || { echo "DEPLOYMENT_LOCK_BUSY";exit 66; }
for f in assps-technical-self-verification-20261016.py verify-resultcards-v3-active-20261015.cjs verify-resultcards-v2-active-20261015.cjs verify-diary-controls-in-active-bundle-20261015.cjs verify-marks-register-ui-20261015.cjs;do
 test -s "$SOURCE/$f" || { echo "MISSING_SOURCE_FILE_$f";exit 67; }
done
python3 -m py_compile "$SOURCE/assps-technical-self-verification-20261016.py"
python3 -m unittest discover -s "$REPO/ops/tests" -p 'test_assps_technical_self_verification_20261016.py'
systemd-analyze verify "$SOURCE/assps-technical-self-verification.service" "$SOURCE/assps-technical-self-verification.timer" || exit 68
python3 "$SOURCE/assps-technical-self-verification-20261016.py" --no-write >/tmp/assps-selfverify-source-check.json
python3 - <<'PY'
import json
d=json.load(open('/tmp/assps-selfverify-source-check.json'))
assert d.get('decision')=='OPERATIONAL',(d.get('decision'),d.get('criticalIssues'))
assert d['productionMutations'] is False and d['printerJobsDispatched']==0
print('SOURCE_VERIFICATION_PASS',d['metrics']['scores']['total_score_rows'],
      d['metrics']['subjectEvidence']['machine_checkable_configurations'])
PY
if [[ "$MODE" == --check ]];then echo "ASSPS_UNATTENDED_MONITOR_PREFLIGHT_PASS_NO_SYSTEM_CHANGES";exit 0;fi
mkdir -p "$DEST"
chmod 755 "$DEST"
for f in assps-technical-self-verification-20261016.py verify-resultcards-v3-active-20261015.cjs verify-resultcards-v2-active-20261015.cjs verify-diary-controls-in-active-bundle-20261015.cjs verify-marks-register-ui-20261015.cjs;do
 cp -p "$SOURCE/$f" "$DEST/$f"
 chmod 644 "$DEST/$f"
 chown root:root "$DEST/$f"
done
for f in "$SERVICE" "$TIMER";do
 cp -p "$SOURCE/$f" "/etc/systemd/system/$f"
 chown root:root "/etc/systemd/system/$f"
 chmod 644 "/etc/systemd/system/$f"
done
systemctl daemon-reload
systemctl enable --now "$TIMER"
systemctl start "$SERVICE"
systemctl is-active --quiet "$TIMER"
test -s /var/lib/assps-technical-self-verification/latest.json
python3 - <<'PY'
from pathlib import Path
import json
r=json.loads(Path('/var/lib/assps-technical-self-verification/latest.json').read_text())
assert r['decision']=='OPERATIONAL',r
assert r['metrics']['subjectEvidence']['machine_checkable_configurations']==64
assert r['printerJobsDispatched']==0 and not r['productionMutations']
print('ASSPS_HOURLY_READONLY_WATCH_ENABLED_AND_FIRST_RUN_VERIFIED')
PY
