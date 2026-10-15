#!/usr/bin/env bash
# P0 operational Diary-only frontend recovery. This NEVER deploys backend, DB or academic approvals.
set -euo pipefail
MODE="${1:---check}"
[[ "$MODE" == "--check" || "$MODE" == "--apply" ]] || { echo 'USAGE: --check|--apply'; exit 64; }
OLD=/var/www/assps-diary-p0-only-49f6a6a1
NEW=/var/www/assps-marks-register-p0-4ce2c5e3
SITE=/etc/nginx/sites-enabled/apex-app-ssl
API_SITE=/etc/nginx/sites-enabled/apex-api-ssl
OUT=/root/assps-release-candidates/marks-register-p0-4ce2c5e3-20261015
BLUE=/root/assps-release-backups/marks-register-blue-20261015
LOCK=/run/lock/assps-frontend-release.lock
GUARD=/root/workspace/assps-frontend-diary-unified-cutover-20261015/ops/release/verify-diary-controls-in-active-bundle-20261015.cjs
EXPECTED_OLD_INDEX=8961fcebb3e022ca320c03d6f6cff834e1f732bf4b2a3d426cbbd9d955462f90
EXPECTED_NEW_INDEX=aa29d4980a73d085a64c02ad14edd0d189531f5c727cc66ab49237bf1f9090c1
EXPECTED_CONFIG=db3a38d8471944d3102b5b4c60dad42121cc87a810cec9754b9d2fc37c2c9be7
sha(){ sha256sum "$1" | awk '{print $1}'; }
fail(){ echo "MARKS_REGISTER_FRONTEND_ONLY_HOLD: $*" >&2; exit 2; }
[[ "$(id -u)" == 0 ]] || fail 'root controlled release required'
exec 9>"$LOCK"
flock -n 9 || fail 'another release currently running'
[[ -d "$NEW/assets" && -f "$NEW/index.html" && -f "$OLD/index.html" ]] || fail 'static roots missing'
[[ "$(sha "$OLD/index.html")" == "$EXPECTED_OLD_INDEX" ]] || fail 'live frontend changed; re-evaluate'
[[ "$(sha "$NEW/index.html")" == "$EXPECTED_NEW_INDEX" ]] || fail 'candidate frontend not exact reviewed build'
[[ "$(sha "$SITE")" == "$EXPECTED_CONFIG" ]] || fail 'live Nginx changed; re-evaluate'
cmp -s "$SITE" "$BLUE/apex-app-ssl.pre-cutover.conf" || fail 'current nginx config not original Blue'
[[ -s "$BLUE/live-frontend.tar.gz" ]] || fail 'verified rollback backup absent'
[[ -f "$GUARD" ]] || fail 'source-linked active controller gate absent'
node "$GUARD" --dist "$NEW" > "$OUT/active-diaries-precutover-gate.json" || fail '11 controller reachable active graph missing'
python3 - "$NEW" <<'PYTHON'
from pathlib import Path
import sys,re
r=Path(sys.argv[1])
html=(r/'index.html').read_text()
m=re.search(r'/assets/(index-[A-Za-z0-9_-]+\.js)',html)
if not m:raise SystemExit('MISSING_ACTIVE_INDEX')
entry=(r/'assets'/m.group(1)).read_text()
m=re.search(r'MarksRegister-[A-Za-z0-9_-]+\.js',entry)
if not m:raise SystemExit('MARKS_REGISTER_NOT_REACHABLE_FROM_ROUTER')
feature=(r/'assets'/m.group()).read_text()
for sign in ('Saved Marks Register','Print Marks Sheet','/api/exams/results','ABSENT','Edit'):
 if sign not in feature:raise SystemExit('MISSING_MARKS_FEATURE:'+sign)
print('REGISTER_ACTIVE_MODULE_PASS',m.group())
PYTHON
python3 - "$OLD" "$NEW" <<'PYTHON'
from pathlib import Path
import sys
old,new=(Path(x) for x in sys.argv[1:3])
existing=[p for p in old.rglob('*') if p.is_file()]
for p in existing:
 rel=p.relative_to(old); q=new/rel
 if not q.is_file(): raise SystemExit('existing asset REMOVED: '+str(rel))
 if rel != Path('index.html') and p.read_bytes()!=q.read_bytes():raise SystemExit('existing asset CHANGED: '+str(rel))
print('ALL EXISTING STATIC ASSETS UNCHANGED EXCEPT VERIFIED INDEX: PASS',len(existing))
PYTHON
nginx -t >/dev/null || fail 'nginx baseline invalid'
local_code=$(curl -ksS -o /dev/null -w '%{http_code}' --max-time 8 --resolve app.assps.edu.pk:443:127.0.0.1 https://app.assps.edu.pk/)
[[ "$local_code" == 200 ]] || fail "baseline site HTTP=$local_code"
health=$(curl -ksS -o /dev/null -w '%{http_code}' --max-time 8 https://api.assps.edu.pk/health)
[[ "$health" == 200 ]] || fail "backend health $health"
api_hash=$(sha "$API_SITE")
printf 'release=MARKS_REGISTER_P0_STATIC_ONLY\nmode=%s\nbaseline=%s\ntarget=%s\n' "$MODE" "$EXPECTED_OLD_INDEX" "$EXPECTED_NEW_INDEX"
[[ "$MODE" == --apply ]] || { echo 'MARKS_REGISTER_P0_STATIC_ONLY_PREFLIGHT_PASS_NO_PRODUCTION_CHANGE'; exit 0; }
BACKUP="$OUT/apex-app-ssl.confirmed-blue-precutover.conf"
cp -p "$SITE" "$BACKUP"
rollback(){
 echo 'MARKS_REGISTER_P0_ROLLBACK_TRIGGERED' >&2
 cp -p "$BACKUP" "$SITE.rollback-$$"
 mv -f "$SITE.rollback-$$" "$SITE"
 nginx -t >/dev/null && systemctl reload nginx || echo 'MANUAL NGINX ROLLBACK ATTENTION NEEDED' >&2
}
trap rollback EXIT
python3 - "$SITE" "$OLD" "$NEW" <<'PYTHON'
from pathlib import Path
import os,sys
p=Path(sys.argv[1]);old,new=sys.argv[2:]
s=p.read_text()
a='root '+old+';'
b='root '+new+';'
if s.count(a)!=1:raise SystemExit('refuse unexpected nginx root occurrences')
t=p.with_name(p.name+'.diary-p0-temp-'+str(os.getpid()))
t.write_text(s.replace(a,b))
t.chmod(p.stat().st_mode & 0o777)
os.replace(t,p)
PYTHON
nginx -t >/dev/null
systemctl reload nginx
sleep 2
local_html="$OUT/local-served-diary-p0-index.html"
curl -kfsS --max-time 12 --resolve app.assps.edu.pk:443:127.0.0.1 https://app.assps.edu.pk/ -o "$local_html"
[[ "$(sha "$local_html")" == "$EXPECTED_NEW_INDEX" ]] || fail 'local TLS candidate index mismatch'
public_html="$OUT/public-served-diary-p0-index.html"
curl -kfsS --max-time 15 'https://app.assps.edu.pk/?diary_recovery=49f6a6a1' -o "$public_html"
[[ "$(sha "$public_html")" == "$EXPECTED_NEW_INDEX" ]] || fail 'public candidate index mismatch'
js="https://app.assps.edu.pk/assets/MarksRegister-9dVsvdXN.js"
code=$(curl -kLsS -o /dev/null -w '%{http_code}' --max-time 9 "$js")
[[ "$code" == 200 ]] || fail "public diary JS $code"
[[ "$(sha "$API_SITE")" == "$api_hash" ]] || fail 'API config changed during cutover'
api=$(curl -ksS -o /dev/null -w '%{http_code}' --max-time 8 https://api.assps.edu.pk/health)
[[ "$api" == 200 ]] || fail 'API health changed during cutover'
for path in /api/auth/me /api/exams /api/daily-diary /api/exams/results;do
 code=$(curl -ksS -o /dev/null -w '%{http_code}' --max-time 8 "https://app.assps.edu.pk$path")
 [[ "$code" == 401 || "$code" == 403 ]] || fail "anonymous access unexpected $path HTTP=$code"
done
[[ "$(sha "$SITE")" != "$EXPECTED_CONFIG" ]] || fail 'nginx still on old release'
trap - EXIT
printf 'scope=frontend-marks-register-read-print-only\nstatus=PUBLIC_MARKS_REGISTER_ACTIVE\nsource=4ce2c5e34a9265c1fd124a481cfd67b8ace596d0\nnew_index=%s\nold_index=%s\nofficial_full_stack_core_gate=HOLD_NOT_CLAIMED\nreal_teacher_print_acceptance=NOT_YET_OBSERVED\n' "$EXPECTED_NEW_INDEX" "$EXPECTED_OLD_INDEX" > "$OUT/production-operational-receipt.private.txt"
chmod 600 "$OUT/production-operational-receipt.private.txt"
echo 'MARKS_REGISTER_P0_FRONTEND_DEPLOYED_HEALTHY_DIARY_PRESERVED_BACKEND_UNCHANGED'
