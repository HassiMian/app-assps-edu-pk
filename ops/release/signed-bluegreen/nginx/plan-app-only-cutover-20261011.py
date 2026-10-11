#!/usr/bin/env python3
"""Read-only app.assps.edu.pk Marks-only cutover/rollback plan generator.

Writes a disposable *candidate* Nginx configuration under /tmp, never
modifies /etc/nginx, public routing, PM2 or PostgreSQL. Requires operator-owned
release certification before any later manual cutover.
"""
from pathlib import Path
import subprocess
import hashlib
import sys

BASE=Path(__file__).resolve().parent
APP=Path('/etc/nginx/sites-enabled/apex-app-ssl')
API=Path('/etc/nginx/sites-enabled/apex-api-ssl')
STAGE=Path('/var/www/assps-firstterm-promo-reviewed-64220e11')
OUT=Path('/tmp/assps-firstterm-app-only-nginx-dryrun-20261011.conf')

def expect(cond,msg):
 if not cond:raise RuntimeError(msg)

def main():
 app=APP.read_text()
 api=API.read_text()
 marks=(BASE/'assps-marks-only-locations.conf').read_text()
 maps=(BASE/'assps-marks-http-maps.conf').read_text()
 expect(app.count('root /var/www/apex-os;')==1,'Live app frontend root drift')
 expect(app.count('proxy_pass http://127.0.0.1:5000;')==1,'Existing app API upstream drift')
 expect(api.count('proxy_pass http://127.0.0.1:3000;')==1,'Connect API upstream drift')
 expect('5091' not in app and '5091' not in api,'Public ingress already contains green routing')
 expect('ONLY inside `app.assps.edu.pk`' in marks,'App-only ownership boundary missing')
 expect('app.assps.edu.pk http://127.0.0.1:5000;' in maps,'App host fallback changed')
 expect((STAGE/'index.html').is_file(),'Compiled frontend not staged')
 expected=app.replace('root /var/www/apex-os;',f'root {STAGE};').replace(
  '    location /api/ {','    # Marks-only routing; all other app API calls stay on original :5000\n'
  f'    include {BASE}/assps-marks-only-locations.conf;\n\n    location /api/ {{')
 expect(expected!=app,'No app changes generated')
 # The synthetic Nginx parser checks the actual ENTIRE current app server +
 # actual Connect server, with only the app candidate edited. No SSL bind.
 config='events {worker_connections 128;}\nhttp {\n include /etc/nginx/mime.types;\n'+maps+'\n'+expected+'\n'+api+'\n}\n'
 OUT.write_text(config)
 test=subprocess.run(['nginx','-t','-c',str(OUT)],capture_output=True,text=True,timeout=12)
 expect(test.returncode==0,'App-only synthetic Nginx configuration failed syntax validation')
 # Do not print any Nginx config body: there may be unrelated protected URLs.
 print('APP_ONLY_NGINX_SYNTHETIC_FULL_SERVER_PARSE_PASS')
 print('ORIGINAL_API_CONNECT_VHOST_UNCHANGED_SHA256='+hashlib.sha256(api.encode()).hexdigest()[:16])
 print('OLD_APP_FRONTEND_AND_API_HOST_UNCHANGED')
 print('CANDIDATE_PREVIEW_ROOT='+str(STAGE))
 print('PUBLIC_ROUTE_MUTATION=NONE; ROLLBACK=RESTORE_ORIGINAL_APP_ONLY')
 return 0
if __name__=='__main__':
 try:sys.exit(main())
 except Exception as e:
  print('APP_ONLY_CUTOVER_PLAN_NO_GO '+type(e).__name__,file=sys.stderr)
  sys.exit(2)
