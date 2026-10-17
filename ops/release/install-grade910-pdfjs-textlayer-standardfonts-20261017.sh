#!/usr/bin/env bash
# Guarded read-only PDF.js source audit font-asset correction; no SaaS deployment.
set -euo pipefail
REPO='/root/workspace/assps-grade910-14-numerical-verification-20261016'
BRANCH='audit/grade910-21-live-full-revision-numericals-20261016'
SOURCE="$REPO/ops/qbank/verify-grade910-pdf-question-text-evidence-20261016.mjs"
TARGET='/usr/local/libexec/assps-grade910-sourceclaims/verify-grade910-pdf-question-text-evidence-20261016.mjs'
OLD_SHA='8e61950c318f4ca36acabb54e1438d2a8a81e33e89d405a4f9937eeff59d8596'
MODE="${1:---check}"
[[ "$MODE" == '--check' || "$MODE" == '--apply' ]] || { echo 'USE_CHECK_OR_APPLY' >&2;exit 2; }
cd "$REPO"
[[ "$(git branch --show-current)" == "$BRANCH" ]] || { echo 'SOURCE_BRANCH_MISMATCH' >&2;exit 1; }
[[ -f "$SOURCE" && -f "$TARGET" && ! -L "$TARGET" ]] || { echo 'FONT_SOURCE_FILE_PATH_INVALID' >&2;exit 1; }
node --check "$SOURCE"
node --test "$REPO/ops/tests/grade910-pdf-question-text-evidence-20261016.test.mjs" >/dev/null
NEW_SHA="$(sha256sum "$SOURCE" | cut -d' ' -f1)"
HAVE_SHA="$(sha256sum "$TARGET" | cut -d' ' -f1)"
[[ "$HAVE_SHA" == "$OLD_SHA" || "$HAVE_SHA" == "$NEW_SHA" ]] || { echo 'UNKNOWN_INSTALLED_TEXT_LAYER_SHA_ABORT' >&2;exit 1; }
systemctl is-active --quiet assps-grade910-live-source-claims.timer
if [[ "$MODE" == '--check' ]];then
 echo 'SOURCE_ONLY_PDFJS_FONT_PATCH_VALID_NO_INSTALL'
 exit 0
fi
[[ "$(systemctl is-active assps-grade910-live-source-claims.service)" == 'inactive' ]] || { echo 'LIVE_ACADEMIC_AUDIT_STILL_ACTIVE_ABORT';exit 1; }
[[ -z "$(git status --porcelain)" ]] || { echo 'DIRTY_WORKTREE_REFUSE_INSTALL';exit 1; }
HERE="$(git rev-parse HEAD)"
REMOTE="$(git ls-remote origin "refs/heads/$BRANCH" | cut -f1)"
[[ "$HERE" == "$REMOTE" && -n "$REMOTE" ]] || { echo 'PUSHED_SHA_REQUIRED';exit 1; }
python3 - <<'PYCORE'
import datetime,json
x=json.load(open('/var/lib/assps-technical-self-verification/latest.json'))
observed=datetime.datetime.fromisoformat(x['observedUTC'])
assert observed.tzinfo is not None,'MISSING_CORE_EVIDENCE_TIMEZONE'
assert -120<(datetime.datetime.now(datetime.timezone.utc)-observed).total_seconds()<3600,'CORE_EVIDENCE_STALE'
assert x['decision']=='OPERATIONAL' and x['criticalIssues']==[],'CORE_SECURITY_NOT_HEALTHY'
assert x['appHTTP']==200 and x['apiHTTP']==200,'APP_OR_API_NOT_HEALTHY'
assert len(x['anonymousProtectedEndpoints'])>=4 and all(n==401 for n in x['anonymousProtectedEndpoints'].values()),'ANONYMOUS_DENIAL_FAILED'
assert x['productionMutations'] is False,'CORE_READONLY_VIOLATED'
PYCORE
if [[ "$NEW_SHA" == "$HAVE_SHA" ]];then echo 'TEXT_LAYER_LOCAL_STANDARD_FONTS_ALREADY_INSTALLED';exit 0;fi
TMP="$(mktemp '/usr/local/libexec/assps-grade910-sourceclaims/.font-patch-XXXXXXXX')"
BACKUP="$(mktemp '/var/lib/assps-grade910-sourceclaims/.original-pdf-text-audit-XXXXXXXX')"
WROTE=0
recover(){
 code=$?
 if [[ "$code" -ne 0 && "$WROTE" == 1 ]];then
  install -m 0644 "$BACKUP" "$TARGET"
 fi
 rm -f "$TMP" "$BACKUP"
 exit "$code"
}
trap recover EXIT
install -m 0600 "$TARGET" "$BACKUP"
install -m 0644 "$SOURCE" "$TMP"
[[ "$(sha256sum "$TMP" | cut -d' ' -f1)" == "$NEW_SHA" ]] || { echo 'STAGED_FONT_PATCH_HASH_INVALID';exit 1; }
mv -f "$TMP" "$TARGET"
WROTE=1
[[ "$(sha256sum "$TARGET" | cut -d' ' -f1)" == "$NEW_SHA" ]]
node --check "$TARGET"
trap - EXIT
rm -f "$TMP" "$BACKUP"
echo "ACADEMIC_SOURCE_TEXT_FONT_ASSET_PATCH_INSTALLED_PRESERVED_READONLY_$HERE"
