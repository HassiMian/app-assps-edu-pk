#!/usr/bin/env bash
# Roll back ONLY the 15 Oct Diary static frontend route, never school data.
set -euo pipefail
MODE="${1:---check}"
[[ "$MODE" == "--check" || "$MODE" == "--apply" ]] || exit 64
OLD=/var/www/assps-grade910-draft-save-print-b18a8aae
NEW=/var/www/assps-diary-p0-only-49f6a6a1
SITE=/etc/nginx/sites-enabled/apex-app-ssl
OUT=/root/assps-release-candidates/diary-p0-only-49f6a6a1-20261015
BACKUP="$OUT/apex-app-ssl.confirmed-blue-precutover.conf"
LOCK=/run/lock/assps-frontend-release.lock
oldhash=ed6d77130aae12c1a72087d3a4854b9ffc7f42488e81b8c6f67066e7ac35e2c0
newhash=8961fcebb3e022ca320c03d6f6cff834e1f732bf4b2a3d426cbbd9d955462f90
sha(){ sha256sum "$1" | awk '{print $1}'; }
die(){ echo "DIARY_P0_ROLLBACK_HOLD: $*" >&2;exit 2; }
[[ $(id -u) == 0 ]] || die 'root required'
exec 9>"$LOCK";flock -n 9 || die 'another release active'
[[ -s "$BACKUP" ]] || die 'original Nginx backup missing'
[[ "$(sha "$BACKUP")" == 70638e5277c7766c98f663287bcf953211e4360415e3dd7a7b55e038facaeb42 ]] || die 'Nginx rollback hash mismatch'
[[ "$(sha "$OLD/index.html")" == "$oldhash" && "$(sha "$NEW/index.html")" == "$newhash" ]] || die 'original/candidate static assets changed'
grep -q "root $NEW;" "$SITE" || die 'site no longer targets exact P0 deployment; do not override'
nginx -t >/dev/null
[[ "$MODE" == --apply ]] || { echo DIARY_P0_BACKOUT_READY_NO_CHANGE;exit 0; }
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
echo DIARY_P0_STATIC_FRONTEND_ROLLBACK_CONFIRMED_BACKEND_UNTOUCHED
