#!/usr/bin/env bash
# One protected, source-only current revision postcheck; no production writes.
set -euo pipefail
ROOT=/root/workspace/assps-grade910-14-numerical-verification-20261016
BRANCH=audit/grade910-21-live-full-revision-numericals-20261016
PROGRAM="$ROOT/ops/qbank/build-grade910-single-authoritative-review-blocker-cluster-20261017.py"
UNIT=assps-grade910-live-source-claims.service
TIMER=assps-grade910-live-source-claims.timer
DROP="/etc/systemd/system/$UNIT.d/92-grade910-unified-1305-independent-review-hold.conf"
MODE="${1:---check}"
[[ "$MODE" == --apply || "$MODE" == --check ]] || { echo MODE_CHECK_OR_APPLY_REQUIRED;exit 2; }
cd "$ROOT"
[[ "$(git branch --show-current)" == "$BRANCH" ]] || { echo UNEXPECTED_BRANCH;exit 1; }
python3 -m py_compile "$PROGRAM"
python3 -m unittest discover -s ops/tests -p test_grade910_master_1305_distinct_blocker_cluster_20261017.py -q
python3 "$PROGRAM" --check
systemctl is-active --quiet "$TIMER"
LINE="ExecStartPost=/usr/bin/python3 $PROGRAM --check"
if [[ "$MODE" == --check ]];then
 echo ONE_UNIFIED_1305_REVIEW_BLOCKER_CLUSTER_HELD_NOT_APPROVED
 exit 0
fi
[[ -z "$(git status --porcelain)" ]] || { echo DIRTY_WORKTREE_REFUSED;exit 1; }
LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git ls-remote origin "refs/heads/$BRANCH" | cut -f1)"
[[ "$LOCAL" == "$REMOTE" && -n "$REMOTE" ]] || { echo PUSHED_EXACT_COMMIT_REQUIRED;exit 1; }
python3 - <<'PYCHECK'
import json,datetime
r=json.load(open('/var/lib/assps-technical-self-verification/latest.json'))
obs=datetime.datetime.fromisoformat(r['observedUTC'])
now=datetime.datetime.now(datetime.timezone.utc)
assert obs.tzinfo is not None and -120<(now-obs).total_seconds()<3600,'HEALTH_EXPIRED'
assert r['decision']=='OPERATIONAL' and r['criticalIssues']==[],'CORE_NOT_OPERATIONAL'
assert r['appHTTP']==200 and r['apiHTTP']==200,'ENDPOINTS_UNHEALTHY'
assert len(r['anonymousProtectedEndpoints'])>=4 and all(v==401 for v in r['anonymousProtectedEndpoints'].values()),'ANON_DENIAL_FAILED'
assert r['productionMutations'] is False,'CORE_MUTATION_OBSERVED'
PYCHECK
if [[ -e "$DROP" ]];then
 [[ ! -L "$DROP" ]] || { echo SYMLINKED_DROPIN_REFUSED;exit 1; }
 grep -Fxq "$LINE" "$DROP" || { echo CONFLICTING_SYSTEMD_HOOK_REFUSED;exit 1; }
else
 TMP="$(mktemp /var/lib/assps-grade910-sourceclaims/.grade910-one-cluster-XXXXXXXX)"
 trap 'rm -f "$TMP"' EXIT
 printf '[Service]\n%s\n' "$LINE" > "$TMP"
 install -m 0644 "$TMP" "$DROP"
 systemctl daemon-reload
 rm -f "$TMP"
 trap - EXIT
fi
systemctl cat "$UNIT" | grep -Fxq "$LINE"
python3 "$PROGRAM" --check
systemctl is-active --quiet "$TIMER"
echo "ONE_UNIFIED_1305_REVIEW_BLOCKER_POSTCHECK_INSTALLED_$LOCAL"
