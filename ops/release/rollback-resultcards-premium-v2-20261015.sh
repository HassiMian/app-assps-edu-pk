#!/usr/bin/env bash
# Roll back ONLY the 15 Oct Diary static frontend route, never school data.
set -euo pipefail
MODE="${1:---check}"
[[ "$MODE" == "--check" || "$MODE" == "--apply" ]] || exit 64
OLD=/var/www/assps-marks-loginloop-recovery-20261015
NEW=/var/www/assps-resultcards-premium-v2-20261015
SITE=/etc/nginx/sites-enabled/apex-app-ssl
OUT=/root/assps-release-candidates/resultcards-premium-v2-20261015
BACKUP="$OUT/apex-app-ssl.confirmed-blue-precutover.conf"
LOCK=/run/lock/assps-frontend-release.lock
oldhash=ddb923aaa3157b90a53b9c2aa94b12e612d911c02bcb1baaf683100fb8de1b33
newhash=dc5d20ad39a52a69519214af0dbd6eadc682a0e43cb21fd35f67952f1f3bacbb
sha(){ sha256sum "$1" | awk '{print $1}'; }
die(){ echo "MARKS_REGISTER_ROLLBACK_HOLD: $*" >&2;exit 2; }
[[ $(id -u) == 0 ]] || die 'root required'
exec 9>"$LOCK";flock -n 9 || die 'another release active'
[[ -s "$BACKUP" ]] || die 'original Nginx backup missing'
[[ "$(sha "$BACKUP")" == db5cb8f5431609a80de712683489dac990876ba3013d413105b9449656968c14 ]] || die 'Nginx rollback hash mismatch'
[[ "$(sha "$OLD/index.html")" == "$oldhash" && "$(sha "$NEW/index.html")" == "$newhash" ]] || die 'original/candidate static assets changed'
grep -q "root $NEW;" "$SITE" || die 'site no longer targets exact P0 deployment; do not override'
nginx -t >/dev/null
[[ "$MODE" == --apply ]] || { echo MARKS_REGISTER_BACKOUT_READY_NO_CHANGE;exit 0; }
cp -p "$SITE" "$OUT/apex-app-ssl.before-rollback.conf"
revert(){
 cp -p "$OUT/apex-app-ssl.before-rollback.conf" "$SITE.restore-$$"
 mv -f "$SITE.restore-$$" "$SITE"
 nginx -t >/dev/null && systemctl reload nginx || echo RESTORE_OPERATOR_ATTENTION_NEEDED >&2
}
trap revert EXIT
cp -p "$BACKUP" "$SITE.old-$$";mv -f "$SITE.old-$$" "$SITE"
nginx -t >/dev/null;systemctl reload nginx
code=$(curl -kfsS --max-time 10 --resolve app.assps.edu.pk:443:127.0.0.1 https://app.assps.edu.pk/ | sha256sum | awk '{print $1}')
[[ "$code" == "$oldhash" ]] || die 'old frontend HTTP confirmation failed'
test "$(curl -ksS -o /dev/null -w '%{http_code}' --max-time 8 https://api.assps.edu.pk/health)" == 200
trap - EXIT
echo MARKS_REGISTER_STATIC_ROLLBACK_CONFIRMED_BACKEND_UNTOUCHED
