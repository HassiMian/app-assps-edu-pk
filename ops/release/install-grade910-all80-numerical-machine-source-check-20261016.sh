#!/usr/bin/env bash
# Guarded academic-only current-revision arithmetic check in existing timer.
set -euo pipefail
ROOT='/root/workspace/assps-grade910-14-numerical-verification-20261016'
BRANCH='audit/grade910-21-live-full-revision-numericals-20261016'
PROGRAM="$ROOT/ops/qbank/reconcile-grade910-80-live-numerical-machine-proof-20261016.py"
UNIT='assps-grade910-live-source-claims.service'
TIMER='assps-grade910-live-source-claims.timer'
DROP="/etc/systemd/system/$UNIT.d/87-grade910-all80-source-machine-only.conf"
MODE="${1:---check}"
[[ "$MODE" == '--check' || "$MODE" == '--apply' ]] || { echo 'USE_CHECK_OR_APPLY' >&2;exit 2; }
cd "$ROOT"
[[ "$(git branch --show-current)" == "$BRANCH" ]] || { echo 'NUMERICAL_WRONG_BRANCH' >&2;exit 1; }
[[ -f "$PROGRAM" && ! -L "$PROGRAM" ]] || { echo 'NO_VALID_NUMERICAL_CURRENT_SHA_AUDITOR' >&2;exit 1; }
python3 -m py_compile "$PROGRAM"
python3 -m unittest discover -s ops/tests -p test_grade910_all_80_numerical_machine_vs_review_20261016.py -q
python3 "$PROGRAM" --check
systemctl is-active --quiet "$TIMER"
LINE="ExecStartPost=/usr/bin/python3 $PROGRAM --check"
if [[ "$MODE" == '--check' ]];then
 echo 'CURRENT_80_NUMERICAL_MACHINE_COVERAGE_CHECK_VALID_NOT_A_TEACHER_APPROVAL'
 exit 0
fi
[[ -z "$(git status --porcelain)" ]] || { echo 'DIRTY_GIT_NO_INSTALL' >&2;exit 1; }
LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git ls-remote origin "refs/heads/$BRANCH" | cut -f1)"
[[ -n "$REMOTE" && "$LOCAL" == "$REMOTE" ]] || { echo 'LOCAL_REMOTE_GIT_SHA_NOT_EQUAL' >&2;exit 1; }
if [[ -e "$DROP" ]];then
 [[ ! -L "$DROP" ]] || { echo 'UNSAFE_SYMLINKED_SYSTEMD_DROPIN' >&2;exit 1; }
 grep -Fqx "$LINE" "$DROP" || { echo 'FOREIGN_ACADEMIC_SYSTEMD_HOOK_PRESERVED' >&2;exit 1; }
fi
TEMP="$(mktemp /var/lib/assps-grade910-sourceclaims/.num80-hook-XXXXXXXX)"
CREATED=0
rollback(){
 code=$?
 rm -f "$TEMP"
 if [[ "$code" != 0 && "$CREATED" == 1 ]];then
  rm -f "$DROP"
  systemctl daemon-reload || true
  echo 'NUM80_SYSTEMD_HOOK_REVERTED' >&2
 fi
 exit "$code"
}
trap rollback EXIT
printf '[Service]\n%s\n' "$LINE" > "$TEMP"
if [[ ! -e "$DROP" ]];then
 install -m 0644 "$TEMP" "$DROP"
 CREATED=1
fi
systemctl daemon-reload
systemctl cat "$UNIT" | grep -Fqx "$LINE"
systemctl is-active --quiet "$TIMER"
python3 "$PROGRAM" --check
trap - EXIT
rm -f "$TEMP"
echo "GRADEX_NUMERICAL_80_POSTCHECK_INSTALLED_EXISTING_TIMER_SHA_$LOCAL"
