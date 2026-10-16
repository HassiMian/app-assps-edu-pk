#!/usr/bin/env bash
# Append one source-claim reviewer-routing postcheck to the existing Grade910
# academic-only audit timer. No new timer, database writes or publication.
set -euo pipefail
ROOT='/root/workspace/assps-grade910-14-numerical-verification-20261016'
BRANCH='audit/grade910-21-live-full-revision-numericals-20261016'
SCRIPT="$ROOT/ops/qbank/triage-grade910-998-unverified-source-page-claims-20261016.py"
DROP='/etc/systemd/system/assps-grade910-live-source-claims.service.d/86-grade910-998-source-evidence-review.conf'
TIMER='assps-grade910-live-source-claims.timer'
MODE='--check'
if (( $# > 0 ));then MODE="$1";fi
[[ "$MODE" == '--check' || "$MODE" == '--apply' ]] || { echo 'USE_CHECK_OR_APPLY' >&2; exit 2; }
cd "$ROOT"
[[ "$(git branch --show-current)" == "$BRANCH" ]] || { echo 'WRONG_GRADE_REVIEW_BRANCH' >&2; exit 1; }
[[ -f "$SCRIPT" && ! -L "$SCRIPT" ]] || { echo 'MISSING_OR_SYMLINKED_SOURCE_REVIEW' >&2; exit 1; }
python3 -m py_compile "$SCRIPT"
python3 -m unittest discover -s ops/tests -p test_grade910_998_source_gap_review_queue_20261016.py -q
python3 "$SCRIPT" --check
systemctl is-active --quiet "$TIMER"
EXPECTED="ExecStartPost=/usr/bin/python3 $SCRIPT"
if [[ "$MODE" == '--check' ]]; then
  echo '998_SOURCE_ROUTING_HERMETIC_CURRENT_SHA_PRIVATE_RECEIPT_CHECK_PASSED_NO_INSTALL'
  exit 0
fi
[[ -z "$(git status --porcelain)" ]] || { echo 'DIRTY_GIT_REFUSE_SYSTEM_HOOK_INSTALL' >&2;exit 1; }
LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git ls-remote origin "refs/heads/$BRANCH" | cut -f1)"
[[ -n "$REMOTE" && "$LOCAL" == "$REMOTE" ]] || { echo 'NOT_THE_REMOTE_PUBLISHED_HEAD' >&2;exit 1; }
# Never replace a foreign administrator-installed academic hook.
if [[ -e "$DROP" ]];then
  [[ ! -L "$DROP" ]] || { echo 'SYMLINKED_HOOK_REFUSED' >&2;exit 1; }
  grep -Fqx "$EXPECTED" "$DROP" || { echo 'EXISTING_FOREIGN_HOOK_NOT_OVERWRITTEN' >&2;exit 1; }
fi
umask 077
TMP="$(mktemp /var/lib/assps-grade910-sourceclaims/.new-source-routing-hook-XXXXXX)"
ADDED=0
cleanup(){
  rc=$?
  rm -f "$TMP"
  if [[ "$rc" -ne 0 && "$ADDED" == 1 ]];then
    rm -f "$DROP"
    systemctl daemon-reload || true
    echo 'UNAPPROVED_SOURCE_REVIEW_HOOK_ROLLED_BACK' >&2
  fi
  exit "$rc"
}
trap cleanup EXIT
printf '[Service]\n%s\n' "$EXPECTED" > "$TMP"
if [[ ! -e "$DROP" ]];then
 install -m 0644 "$TMP" "$DROP"
 ADDED=1
fi
systemctl daemon-reload
systemctl cat assps-grade910-live-source-claims.service | grep -Fqx "$EXPECTED"
systemctl is-active --quiet "$TIMER"
python3 "$SCRIPT" --check
trap - EXIT
rm -f "$TMP"
echo "INSTALLED_GRADE910_998_SOURCE_ONLY_POSTCHECK_SINGLE_EXISTING_TIMER_HEAD_$LOCAL"
