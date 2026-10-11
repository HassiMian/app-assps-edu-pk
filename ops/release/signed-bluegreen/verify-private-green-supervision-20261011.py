#!/usr/bin/env python3
"""Read-only live supervision proof; NEVER a school-user browser acceptance."""
import json
import os
import stat
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

BASE=Path(__file__).resolve().parent
WORKTREE=BASE.parents[2]
GREEN_NAME='assps-marks-green'
GREEN_CONFIG=Path('/root/.assps-green-credentials.env')

def command(args,timeout=14):
 p=subprocess.run(args,capture_output=True,text=True,timeout=timeout)
 if p.returncode:raise RuntimeError('read-only process inspection failed')
 return p.stdout

def require(ok,marker):
 if not ok:raise RuntimeError(marker)
 print(marker+'=PASS')

def request(url):
 try:
  with urllib.request.urlopen(url,timeout=6) as r:return r.status,r.read(1024)
 except urllib.error.HTTPError as e:return e.code,b''

def main():
 state=json.loads(command(['pm2','jlist']))
 get=lambda name:[x for x in state if x.get('name')==name]
 for name in (GREEN_NAME,'apex-backend','apex-connect'):
  group=get(name)
  require(len(group)==1 and group[0]['pm2_env'].get('status')=='online','PM2_'+name.upper().replace('-','_')+'_ONLINE')
 green=get(GREEN_NAME)[0]
 pid=int(green['pid'])
 require(pid>0 and (Path('/proc')/str(pid)/'cwd').resolve()==WORKTREE/'al-siddique-backend','GREEN_SOURCE_AND_PROCESS_CWD')
 require(os.geteuid()==0 and GREEN_CONFIG.stat().st_uid==0 and stat.S_IMODE(GREEN_CONFIG.stat().st_mode)==0o600,'PROTECTED_GREEN_ENV_0600_ROOT')
 require(command(['systemctl','is-enabled','pm2-root']).strip()=='enabled','PM2_ROOT_STARTUP_ENABLED')
 saved=json.loads(Path('/root/.pm2/dump.pm2').read_text())
 require(any(x.get('name')==GREEN_NAME for x in saved),'GREEN_PERSISTED_IN_PM2_MANIFEST')
 sockets=command(['ss','-ltnp'])
 require('127.0.0.1:5091' in sockets and '0.0.0.0:5091' not in sockets and '[::]:5091' not in sockets,'GREEN_LOOPBACK_ONLY')
 health,body=request('http://127.0.0.1:5091/health/ready')
 try:obj=json.loads(body)
 except Exception:obj={}
 require(health==200 and obj.get('database')=='ok' and obj.get('status')=='ready','GREEN_DATABASE_HEALTH_READY')
 require(request('http://127.0.0.1:5091/api/exams/results')[0]==401,'GREEN_ANONYMOUS_RESULTS_DENIED')
 nginx=command(['nginx','-T'])
 require('127.0.0.1:5091' not in nginx,'PUBLIC_INGRESS_STILL_OLD')
 require('proxy_pass http://127.0.0.1:5000;' in Path('/etc/nginx/sites-enabled/apex-app-ssl').read_text(),'APP_LEGACY_API_UPSTREAM_PRESERVED')
 require('proxy_pass http://127.0.0.1:3000;' in Path('/etc/nginx/sites-enabled/apex-api-ssl').read_text(),'CONNECT_VHOST_PRESERVED')
 # Use independent public HTTP probes, not Python urllib's ambient proxy.
 # Require three actual consecutive successful app/API pairs: never waive a
 # transient public timeout when certifying release stability.
 for attempt in range(1,4):
  for hostname,url in [('APP','https://app.assps.edu.pk'),('API','https://api.assps.edu.pk/health')]:
   code=command(['curl','-sS','--max-time','8','-o','/dev/null','-w','%{http_code}',url],11).strip()
   require(code=='200',f'PUBLIC_{hostname}_HTTP200_PROBE_{attempt}')
 print('BOTH_PUBLIC_HOSTS_HEALTH_200=PASS')
 print('PRIVATE_GREEN_SUPERVISED_READONLY_GATE_PASS')
 print('REAL_PRINCIPAL_TEACHER_BROWSER_ACCEPTANCE_STILL_REQUIRED')
 print('NO_DATABASE_WRITE_NO_NGINX_RELOAD_NO_PUBLIC_CUTOVER')
 return 0
if __name__=='__main__':
 try:sys.exit(main())
 except Exception as e:
  print('PRIVATE_GREEN_SUPERVISION_NO_GO '+type(e).__name__,file=sys.stderr)
  sys.exit(2)
