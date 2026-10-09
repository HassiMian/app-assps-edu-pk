#!/usr/bin/env bash
# Runs host-specific HTTPS/HTTP tests against transformed, disposable copies
# of the exact full candidate site configurations. Never reloads live Nginx.
set -euo pipefail
candidate="${1:?Pass private staged candidate directory}"
test -d "$candidate/sites" || exit 12
for name in apex-api-ssl apex-app-ssl apex-gateway apex-web-ssl; do
  test -f "$candidate/sites/$name" || exit 12
done
scratch=$(mktemp -d /var/tmp/assps-nginx-upload-host-test-XXXXXXXX)
chmod 755 "$scratch"
cleanup() {
  nginx -c "$scratch/nginx.conf" -s stop >/dev/null 2>&1 || true
  rm -rf "$scratch"
}
trap cleanup EXIT
mkdir "$scratch/sites" "$scratch/branding"
chmod 755 "$scratch/sites" "$scratch/branding"
printf 'SYNTHETIC_PUBLIC_BRAND_LOGO_P24' > "$scratch/branding/synthetic-logo.png"
printf 'SYNTHETIC_NOT_RASTER_HTML' > "$scratch/branding/synthetic-active.html"
printf 'SYNTHETIC_NOT_RASTER_SVG' > "$scratch/branding/synthetic-vector.svg"
printf 'SYNTHETIC_PRIVATE_MEDIA_NOT_SERVED' > "$scratch/synthetic-private.png"
ln -s "$scratch/synthetic-private.png" "$scratch/branding/synthetic-linked.png"
# Copy/port remap only into private test staging. Preserve server_name, all
# location ordering, TLS certificates, proxy precedence and actual return rules.
python3 - "$candidate/sites" "$scratch/sites" "$scratch/branding" <<'PY'
from pathlib import Path
import re,sys
source,dest,branding=map(Path,sys.argv[1:])
names=('apex-api-ssl','apex-app-ssl','apex-gateway','apex-web-ssl')
for name in names:
 s=(source/name).read_text()
 assert s.count('alias /var/uploads/branding/;')==({'apex-gateway':2}.get(name,1)),name
 s=s.replace('alias /var/uploads/branding/;',f'alias {branding}/;')
 def remap(m):
  original=m.group(2)
  if '[::]' in original: return ''
  if ' ssl' in original or '443' in original:
   return m.group(1)+'listen 127.0.0.1:5676 ssl'+(' default_server' if 'default_server' in original else '')+';'
  return m.group(1)+'listen 127.0.0.1:5677'+(' default_server' if 'default_server' in original else '')+';'
 s,n=re.subn(r'(?m)^(\s*)listen\s+([^;]+);',remap,s)
 assert n>=2,(name,n)
 (dest/name).write_text(s)
PY
cat > "$scratch/nginx.conf" <<EOF
worker_processes 1;
pid $scratch/nginx.pid;
error_log $scratch/error.log notice;
events { worker_connections 128; }
http {
 include /etc/nginx/mime.types;
 default_type application/octet-stream;
 access_log off;
 server_names_hash_bucket_size 128;
 include $scratch/sites/*;
}
EOF
echo 'FULL_HOST_SYNTAX'
nginx -t -c "$scratch/nginx.conf" 2>&1 |tail -n 3
nginx -c "$scratch/nginx.conf"
sleep 0.5
checks=0
for host in api.assps.edu.pk app.assps.edu.pk www.assps.edu.pk apex.assps.edu.pk;do
 for spec in 'branding/synthetic-logo.png:200' 'branding/synthetic-active.html:404' 'branding/synthetic-vector.svg:404' 'branding/synthetic-linked.png:403' 'identity/synthetic.png:404' 'payment-screenshots/synthetic.png:404' 'private-records/synthetic.png:404' 'branding/../identity/synthetic.png:404';do
  expected=${spec##*:}
  suffix=${spec%:*}
  status=$(curl --noproxy '*' --path-as-is -k -s --max-time 5 -D "$scratch/headers" -o "$scratch/response" -w '%{http_code}' --resolve "$host:5676:127.0.0.1" "https://$host:5676/uploads/$suffix")
  echo "SYNTHETIC_HOST_SSL host=$host path=$suffix code=$status expected=$expected"
  test "$status" = "$expected" || exit 21
  if [ "$expected" = 200 ];then
    grep -q 'SYNTHETIC_PUBLIC_BRAND_LOGO_P24' "$scratch/response"
    grep -qi "^X-Content-Type-Options: nosniff" "$scratch/headers"
    grep -qi "^Content-Security-Policy: sandbox" "$scratch/headers"
  fi
  ! grep -q 'SYNTHETIC_PRIVATE_MEDIA_NOT_SERVED' "$scratch/response"
  checks=$((checks+1))
 done
done
host=apex.assps.edu.pk
for spec in 'branding/synthetic-logo.png:301' 'identity/synthetic.png:301' 'payment-screenshots/synthetic.png:301';do
 expected=${spec##*:}; suffix=${spec%:*}
 status=$(curl --noproxy '*' --path-as-is -s --max-time 5 -D "$scratch/headers" -o "$scratch/response" -w '%{http_code}' --resolve "$host:5677:127.0.0.1" "http://$host:5677/uploads/$suffix")
 echo "SYNTHETIC_HOST_HTTP host=$host path=$suffix code=$status expected=$expected"
 test "$status" = "$expected" || exit 21
 grep -qi "^location: https://apex.assps.edu.pk/uploads/$suffix" "$scratch/headers" || exit 22
 ! grep -q "SYNTHETIC_PUBLIC_BRAND_LOGO_P24" "$scratch/response"
 checks=$((checks+1))
done
echo "P24_CANDIDATE_HOST_ACCEPTANCE_PASS checks=$checks"
