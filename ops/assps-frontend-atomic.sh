#!/usr/bin/env bash
# ASSPS immutable frontend deploy controller. Does not write to any student database.
set -euo pipefail
umask 077

ACTION="${1:-}"
RELEASE_ID="${2:-}"
ARCHIVE="${3:-}"
CONFIG="/etc/nginx/sites-enabled/apex-app-ssl"
BASE="/var/www/assps-releases"
STATE="/var/lib/assps-release-manager"
LOCK="/run/lock/assps-frontend-release.lock"

[[ $EUID -eq 0 ]] || { echo 'Root access required on release VPS' >&2; exit 77; }
[[ -f "$CONFIG" ]] || { echo 'Nginx site config missing' >&2; exit 78; }
mkdir -p "$BASE" "$STATE"
# Public web root needs execute traversal for Nginx, state remains private.
chmod 755 "$BASE"
chmod 700 "$STATE"
exec 9>"$LOCK"
flock -x -w 20 9 || { echo 'Deployment currently locked' >&2; exit 75; }

live_root() {
  python3 - "$CONFIG" <<'PY'
import pathlib,sys,re
s=pathlib.Path(sys.argv[1]).read_text()
m=re.findall(r'^\s*root\s+(/var/www/[^;\s]+)\s*;',s,re.M)
if len(m)!=1:raise SystemExit('Nginx must have exactly one /var/www/ document root')
print(m[0])
PY
}
require_id() {
  [[ "$RELEASE_ID" =~ ^[a-zA-Z0-9][a-zA-Z0-9_.-]{4,65}$ && "$RELEASE_ID" != *..* ]] || {
    echo 'Invalid release ID' >&2; exit 64;
  }
}
assert_release() {
  require_id
  [[ -d "$BASE/$RELEASE_ID" && -f "$BASE/$RELEASE_ID/index.html" ]] || {
    echo 'Candidate release has not been staged' >&2; exit 66;
  }
}
test_origin() {
  local expect="$1"
  local got
  got="$(curl -kfsS --http1.1 --retry 2 --retry-delay 1 --connect-timeout 5 --max-time 20 --resolve app.assps.edu.pk:443:127.0.0.1 https://app.assps.edu.pk/login | grep -oE '/assets/index-[^"]+\.js' | head -1)"
  if [[ -z "$got" || "$got" != "$expect" ]]; then
    echo "Live origin entry mismatch: expected $expect, got $got" >&2
    return 1
  fi
  curl -fsS --http1.1 --connect-timeout 5 --max-time 15 http://127.0.0.1:5000/health/ready | grep -q '"database":"ok"' 
}

swap_config() {
  local newroot="$1" oldroot="$2"
  python3 - "$CONFIG" "$oldroot" "$newroot" <<'PY'
import pathlib,re,sys,os,tempfile
p=pathlib.Path(sys.argv[1])
old,new=sys.argv[2:4]
s=p.read_text()
pat=r'(?m)^(\s*root\s+)' + re.escape(old) + r'(\s*;)'
if len(re.findall(pat,s))!=1:raise SystemExit('Nginx root changed externally; refusing swap')
updated=re.sub(pat,lambda m:m.group(1)+new+m.group(2),s,count=1)
fd,tmp=tempfile.mkstemp(prefix='.assps-nginx-',dir=str(p.parent))
try:
  os.fchmod(fd,0o600)
  with os.fdopen(fd,'w') as f:f.write(updated)
  os.replace(tmp,p)
except:
  if os.path.exists(tmp):os.remove(tmp)
  raise
PY
}

case "$ACTION" in
  status)
    echo "active_root=$(live_root)"
    echo "release_root=$BASE"
    ;;
  stage)
    require_id
    [[ -n "$ARCHIVE" && -f "$ARCHIVE" ]] || { echo 'Missing release archive' >&2; exit 66; }
    # No auto-deletion of historic rollback releases. Refuse releases on low disk.
    free_kb="$(df -Pk "$BASE" | awk 'NR==2 {print $4}')"
    [[ "$free_kb" =~ ^[0-9]+$ && "$free_kb" -ge 2097152 ]] || {
      echo 'Less than 2 GiB disk free: release refused, previous releases preserved' >&2; exit 75;
    }
    [[ ! -e "$BASE/$RELEASE_ID" && ! -e "$STATE/$RELEASE_ID" ]] || { echo 'Release ID already exists' >&2; exit 73; }
    mkdir -m 700 "$BASE/$RELEASE_ID"
    # Reject path traversal, symlinks and special tar entries before extracting.
    python3 - "$ARCHIVE" "$BASE/$RELEASE_ID" <<'PY'
import os,pathlib,sys,tarfile
archive,target=map(pathlib.Path,sys.argv[1:])
with tarfile.open(archive) as t:
  members=t.getmembers()
  if not members:raise SystemExit('Empty release archive')
  for m in members:
    name=m.name
    parts=pathlib.PurePosixPath(name).parts
    if name.startswith('/') or '..' in parts or not (m.isfile() or m.isdir()):
      raise SystemExit('Unsafe release archive member: '+name)
  t.extractall(target,filter='data')
index=target/'index.html'
if not index.is_file():raise SystemExit('Staged release lacks index.html')
PY
    node - "$BASE/$RELEASE_ID" <<'JS'
const fs=require('fs'),path=require('path');
const root=process.argv[2],html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const match=html.match(/<script[^>]*src="(\/assets\/index-[^"]+\.js)"/);
if(!match)throw Error('Missing hashed JS entry');
const assets=path.resolve(root,'assets');
const entry=path.resolve(root,match[1].slice(1));
if(!fs.existsSync(entry))throw Error('Entry file absent');
const seen=new Set();const queue=[entry];let checked=0;
while(queue.length){
 const file=queue.shift();
 if(seen.has(file))continue;
 if(!file.startsWith(assets+path.sep)||!fs.existsSync(file))throw Error('Missing reachable asset '+file);
 seen.add(file);
 const js=fs.readFileSync(file,'utf8');
 const refs=[
  ...js.matchAll(/\bfrom\s*["'](\.\.?\/[^"']+\.js)["']/g),
  ...js.matchAll(/\bimport\s*["'](\.\.?\/[^"']+\.js)["']/g),
  ...js.matchAll(/\bimport\s*\(\s*["'`](\.\.?\/[^"'`]+\.js)["'`]\s*\)/g)
 ];
 for(const ref of refs){
  const dep=path.resolve(path.dirname(file),ref[1]);
  if(!dep.startsWith(assets+path.sep)||!fs.existsSync(dep))throw Error('Missing dependency '+ref[1]);
  const base=path.basename(dep);
  if(/^index-[\w-]+\.js$/.test(base)&&dep!==entry)throw Error('Mixed entry graph in '+file);
  queue.push(dep);checked++;
 }
 // Vite chunk manifest contains lazily imported files as strings.
 if(file===entry){
  for(const m of js.matchAll(/["'`](assets\/[A-Za-z0-9_.-]+\.js)["'`]/g)){
   const dep=path.resolve(root,m[1]);
   if(!dep.startsWith(assets+path.sep)||!fs.existsSync(dep))throw Error('Missing lazy chunk '+m[1]);
   queue.push(dep);
  }
 }
}
console.log('Staged reachable frontend graph accepted; chunks='+seen.size+' imports='+checked);
JS
    mkdir -m 700 "$STATE/$RELEASE_ID"
    live_root > "$STATE/$RELEASE_ID/base-root"
    sha256sum "$ARCHIVE" > "$STATE/$RELEASE_ID/archive.sha256"
    chown -R www-data:www-data "$BASE/$RELEASE_ID"
    find "$BASE/$RELEASE_ID" -type d -exec chmod 755 {} +
    find "$BASE/$RELEASE_ID" -type f -exec chmod 644 {} +
    # Prevent a repeat of the Oct 22 root-directory traversal outage.
    su -s /bin/sh www-data -c "test -r '$BASE/$RELEASE_ID/index.html'" || {
      echo 'Nginx user cannot read candidate index.html' >&2; exit 78;
    }
    echo "STAGED release=$RELEASE_ID; baseline=$(cat "$STATE/$RELEASE_ID/base-root")"
    ;;
  promote)
    assert_release
    OLD="$(cat "$STATE/$RELEASE_ID/base-root")"
    NEW="$BASE/$RELEASE_ID"
    [[ "$(live_root)" == "$OLD" ]] || { echo 'Production moved since staging, aborting' >&2; exit 76; }
    [[ -f "$OLD/index.html" ]] || { echo 'Previous release missing, aborting' >&2; exit 76; }
    su -s /bin/sh www-data -c "test -r '$NEW/index.html'" || {
      echo 'Nginx cannot traverse candidate path; activation blocked' >&2; exit 78;
    }
    cp -p "$CONFIG" "$STATE/$RELEASE_ID/nginx.before"
    ENTRY="$(grep -oE '/assets/index-[^"]+\.js' "$NEW/index.html" | head -1)"
    rollback_inner() {
      cp -p "$STATE/$RELEASE_ID/nginx.before" "$CONFIG.rollback"
      mv -f "$CONFIG.rollback" "$CONFIG"
      nginx -t && nginx -s reload
    }
    swap_config "$NEW" "$OLD"
    if ! nginx -t; then
      echo 'Nginx config test failed: reverting' >&2
      rollback_inner
      exit 1
    fi
    if ! nginx -s reload; then
      echo 'Nginx reload failed: reverting' >&2
      rollback_inner
      exit 1
    fi
    if ! test_origin "$ENTRY"; then
      echo 'Origin acceptance failed: reverting' >&2
      rollback_inner
      exit 1
    fi
    printf '%s\n' "release=$RELEASE_ID" "previous=$OLD" "activated=$(date -Is)" > "$STATE/$RELEASE_ID/activated"
    echo "PROMOTED release=$RELEASE_ID; previous=$OLD"
    ;;
  rollback)
    assert_release
    NEW="$BASE/$RELEASE_ID"
    [[ -f "$STATE/$RELEASE_ID/nginx.before" ]] || { echo 'No rollback checkpoint' >&2; exit 76; }
    [[ "$(live_root)" == "$NEW" ]] || { echo 'Active root is not candidate; no rollback necessary or allowed' >&2; exit 76; }
    OLD="$(cat "$STATE/$RELEASE_ID/base-root")"
    cp -p "$CONFIG" "$STATE/$RELEASE_ID/nginx.pre-rollback"
    swap_config "$OLD" "$NEW"
    if ! nginx -t || ! nginx -s reload; then
      cp -p "$STATE/$RELEASE_ID/nginx.pre-rollback" "$CONFIG"
      nginx -t && nginx -s reload
      echo 'Rollback could not be safely activated; prior config restored' >&2
      exit 1
    fi
    echo "ROLLED_BACK release=$RELEASE_ID to=$OLD"
    ;;
  *)
    echo 'Usage: bash assps-frontend-atomic.sh {status|stage RELEASE_ID ARCHIVE|promote RELEASE_ID|rollback RELEASE_ID}' >&2
    exit 64
    ;;
esac
