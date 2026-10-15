#!/usr/bin/env bash
# Private HTTPS Nginx->reviewed compiled Next->Chromium. NO PM2/public ingress.
set -Eeuo pipefail
umask 077
NEXT=/root/assps-release-candidates/apex-connect-login-challenge-current-live-20261015
TOOLS=/opt/assps-editor-worker/repo/al-siddique-frontend
EXPECTED=rc1vIlE6prAQ8pHrw7ohX
[[ "$(git -C "$NEXT" rev-parse HEAD)" == 9fcca4320bdbeb834f6494d1af82d82f1d9b818f ]] || { echo UNREVIEWED_NEXT_SOURCE;exit 3; }
[[ "$(cat "$NEXT/.next/BUILD_ID")" == "$EXPECTED" ]] || { echo UNREVIEWED_COMPILED_NEXT;exit 3; }
for port in 3016 3017;do
 ! ss -lnt | grep -q ":$port " || { echo PRIVATE_PORT_IN_USE;exit 3; }
done
# Reject any certificate that does not actually validate the intended host
# or will expire too soon; Chrome must also independently validate TLS.
openssl x509 -in /etc/letsencrypt/live/www.assps.edu.pk/fullchain.pem   -noout -checkhost api.assps.edu.pk | grep -q 'does match certificate' || { echo PRIVATE_TLS_CERT_HOST_INVALID;exit 3; }
openssl x509 -in /etc/letsencrypt/live/www.assps.edu.pk/fullchain.pem   -noout -checkend 86400 >/dev/null || { echo PRIVATE_TLS_CERT_NEAR_EXPIRY;exit 3; }
CONFROOT=$(mktemp -d /tmp/assps-next-https-20261015-XXXXXX)
chmod 700 "$CONFROOT"
nextpid='' nextgroup='' nginxpid='' nginxgroup=''
cleanup(){
 for pair in "$nginxgroup:$nginxpid" "$nextgroup:$nextpid";do
  group=$(printf '%s' "$pair" | cut -d: -f1)
  pid=$(printf '%s' "$pair" | cut -d: -f2)
  if [[ -n "$group" && "$group" =~ ^[0-9]+$ && "$group" == "$pid" ]];then
    kill -- "-$group" >/dev/null 2>&1 || :
  elif [[ -n "$pid" ]];then kill "$pid" >/dev/null 2>&1 || :;fi
 done
 for pid in "$nginxpid" "$nextpid";do
  [[ -z "$pid" ]] || wait "$pid" >/dev/null 2>&1 || :
 done
 rm -rf -- "$CONFROOT"
}
trap cleanup EXIT
cat > "$CONFROOT/nginx.conf" <<CONF
pid $CONFROOT/nginx.pid;
error_log $CONFROOT/nginx-error.log warn;
worker_processes 1;
events { worker_connections 96; }
http {
  access_log off;
  server {
    listen 127.0.0.1:3017 ssl;
    server_name api.assps.edu.pk;
    ssl_certificate /etc/letsencrypt/live/www.assps.edu.pk/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/www.assps.edu.pk/privkey.pem;
    location / {
      proxy_pass http://127.0.0.1:3016;
      proxy_http_version 1.1;
      proxy_set_header Host api.assps.edu.pk;
      proxy_set_header X-Forwarded-Proto https;
      proxy_set_header X-Forwarded-Host api.assps.edu.pk:3017;
      proxy_set_header X-Forwarded-Port 3017;
      proxy_set_header X-Real-IP 127.0.0.1;
      proxy_set_header X-Forwarded-For 127.0.0.1;
      proxy_set_header Connection "";
    }
  }
}
CONF
nginx -t -p "$CONFROOT/" -c nginx.conf 2>&1 | tail -2
setsid bash -c '
 cd "$1"
 exec env NODE_ENV=production PORT=3016 HOSTNAME=127.0.0.1 \
 node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3016
' bash "$NEXT" > "$CONFROOT/next.log" 2>&1 &
nextpid=$!
nextgroup=$(ps -p "$nextpid" -o pgid= | tr -d ' ')
[[ "$nextgroup" == "$nextpid" ]] || { echo NEXT_PROCESS_GROUP_UNSAFE;exit 3; }
ready=no
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15;do
 if curl -sS -o /dev/null --max-time 2 --resolve 'api.assps.edu.pk:3016:127.0.0.1' \
  'http://api.assps.edu.pk:3016/login' 2>/dev/null;then ready=yes;break;fi
 sleep 1
done
[[ "$ready" == yes ]] || { echo PRIVATE_NEXT_NOT_READY;exit 3; }
setsid nginx -p "$CONFROOT/" -c nginx.conf -g 'daemon off; master_process off;' \
 > "$CONFROOT/nginx-out.log" 2>&1 &
nginxpid=$!
nginxgroup=$(ps -p "$nginxpid" -o pgid= | tr -d ' ')
[[ "$nginxgroup" == "$nginxpid" ]] || { echo NGINX_PROCESS_GROUP_UNSAFE;exit 3; }
https_ready=no
for i in 1 2 3 4 5 6 7 8 9 10;do
 if curl --silent --show-error -k --max-time 2 -o /dev/null \
 --resolve 'api.assps.edu.pk:3017:127.0.0.1' \
 'https://api.assps.edu.pk:3017/login' 2>/dev/null;then https_ready=yes;break;fi
 sleep 1
done
[[ "$https_ready" == yes ]] || { echo PRIVATE_TLS_NGINX_NOT_READY;tail -8 "$CONFROOT/nginx-error.log";exit 3; }
CONNECT_ISOLATED_QA=yes CONNECT_BROWSER_TOOLING_ROOT="$TOOLS" \
 node "$(cd "$(dirname "$0")" && pwd)/test-connect-private-firstlogin-passwordchange-chromium-20261015.cjs"
echo PRIVATE_HTTPS_NGINX_NEXT_SHUTDOWN_ARMED
