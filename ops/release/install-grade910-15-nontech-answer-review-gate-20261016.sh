#!/usr/bin/env bash
# Academic research-only: source-only Grade910 six-phase receipt update + new
# bounded live current-SHA research QA; never production question publication.
set -euo pipefail
ROOT='/root/workspace/assps-grade910-14-numerical-verification-20261016'
BRANCH='audit/grade910-21-live-full-revision-numericals-20261016'
PHASE="$ROOT/ops/qbank/assps-grade910-autonomous-six-phase-receipt-20261016.py"
PHASE_LIVE='/usr/local/libexec/assps-grade910-sourceclaims/assps-grade910-six-phase-current-numeric-proof-20261016.py'
AUTHOR="$ROOT/ops/qbank/author-grade910-15-nontech-high-original-exemplars-20261016.py"
CROSS="$ROOT/ops/qbank/audit-grade910-existing-long-answer-proposal-crosswalk-20261016.py"
UNIT='assps-grade910-live-source-claims.service'
TIMER='assps-grade910-live-source-claims.timer'
DROP="/etc/systemd/system/$UNIT.d/88-grade910-15-conventional-unapproved-research.conf"
OLD='75f0fa11c12967408788b41ad3449d74a53612bde2edc17ebfc5d6e353b053e5'
MODE='--check'
if (( $# > 0 ));then MODE="$1";fi
[[ "$MODE" == '--check' || "$MODE" == '--apply' ]] || { echo 'USE_CHECK_OR_APPLY' >&2;exit 2; }
cd "$ROOT"
[[ "$(git branch --show-current)" == "$BRANCH" ]] || { echo 'UNEXPECTED_ACADEMIC_BRANCH' >&2;exit 1; }
[[ -f "$PHASE_LIVE" && ! -L "$PHASE_LIVE" && -f "$PHASE" && -f "$CROSS" ]] || { echo 'MISSING_ACADEMIC_SOURCE_FILES' >&2;exit 1; }
python3 -m py_compile "$PHASE" "$AUTHOR" "$CROSS"
python3 -m unittest discover -s ops/tests -p test_grade910_15_conventional_original_exemplars_review_20261016.py -q
python3 "$AUTHOR" --check
python3 "$PHASE" | grep -F 'PHASE_6=TECHNICAL_EVIDENCE_STAGED_ACADEMIC_PUBLICATION_HOLD'
systemctl is-active --quiet "$TIMER"
LINE="ExecStartPost=/usr/bin/python3 $AUTHOR --check"
CURRENT="$(sha256sum "$PHASE_LIVE" | cut -d' ' -f1)"
NEW="$(sha256sum "$PHASE" | cut -d' ' -f1)"
[[ "$CURRENT" == "$OLD" || "$CURRENT" == "$NEW" ]] || { echo 'UNKNOWN_SIX_PHASE_LIVE_BASELINE_REFUSED' >&2;exit 1; }
if [[ -e "$DROP" ]];then
 [[ ! -L "$DROP" ]] || { echo 'SYMLINK_DROPIN_REFUSED' >&2;exit 1; }
 grep -Fqx "$LINE" "$DROP" || { echo 'FOREIGN_CONFLICTING_ACADEMIC_DROPIN_REFUSED' >&2;exit 1; }
fi
if [[ "$MODE" == '--check' ]];then
 echo 'CONVENTIONAL_15_CROSSWALK_AND_PHASE_SOURCE_CHECK_VALID_NO_INSTALL'
 exit 0
fi
[[ -z "$(git status --porcelain)" ]] || { echo 'DIRTY_WORKTREE_REFUSE_ACADEMIC_HOOK_INSTALL' >&2;exit 1; }
LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git ls-remote origin "refs/heads/$BRANCH" | cut -f1)"
[[ -n "$REMOTE" && "$REMOTE" == "$LOCAL" ]] || { echo 'REMOTE_UNPUSHED_HEAD_REFUSED' >&2;exit 1; }
BACKUP="$(mktemp /var/lib/assps-grade910-sourceclaims/.phase15-backup-XXXXXXXX)"
TMP="$(mktemp /var/lib/assps-grade910-sourceclaims/.new15-hook-XXXXXXXX)"
COPIED=0
CREATED=0
cleanup(){
 code=$?
 if [[ "$code" -ne 0 ]];then
  if [[ "$COPIED" == 1 ]];then install -m 0644 "$BACKUP" "$PHASE_LIVE" || true;fi
  if [[ "$CREATED" == 1 ]];then rm -f "$DROP";fi
  systemctl daemon-reload || true
 fi
 rm -f "$TMP" "$BACKUP"
 exit "$code"
}
trap cleanup EXIT
install -m 0600 "$PHASE_LIVE" "$BACKUP"
printf '[Service]\n%s\n' "$LINE" > "$TMP"
if [[ "$CURRENT" != "$NEW" ]];then
 install -m 0644 "$PHASE" "$PHASE_LIVE"
 COPIED=1
fi
if [[ ! -e "$DROP" ]];then
 install -m 0644 "$TMP" "$DROP"
 CREATED=1
fi
systemctl daemon-reload
[[ "$(sha256sum "$PHASE_LIVE" | cut -d' ' -f1)" == "$NEW" ]]
systemctl cat "$UNIT" | grep -Fqx "$LINE"
python3 "$PHASE_LIVE" | grep -F 'PHASE_6=TECHNICAL_EVIDENCE_STAGED_ACADEMIC_PUBLICATION_HOLD'
python3 "$AUTHOR" --check
systemctl is-active --quiet "$TIMER"
trap - EXIT
rm -f "$TMP" "$BACKUP"
echo "15_ORIGINAL_RESEARCH_CURRENT_SHA_HOOK_INSTALLED_WITHOUT_ACADEMIC_PUBLICATION_$LOCAL"
