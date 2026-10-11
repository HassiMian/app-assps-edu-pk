#!/usr/bin/env python3
"""Fail-closed private reviewed Promote/Marks green PM2 entrypoint; no credentials in Git/argv.

--inspect is read-only and does not reveal secret values. Service launch without
--inspect must be separately approved by release authority. Source/worktree and
protected env are pinned; legacy PM2 and Nginx are NEVER managed here.
"""
import argparse
import os
import re
import stat
import sys
from pathlib import Path

SOURCE=Path(__file__).resolve().parents[3]/'al-siddique-backend'
CONFIG=Path('/root/.assps-green-credentials.env')
REQUIRED={
 'NODE_ENV':'production', 'PORT':'5091', 'DB_HOST':'127.0.0.1',
 'DB_PORT':'5432','DB_NAME':'apexos','DB_USER':'assps_marks_signed_login',
 'DB_RUNTIME_ROLE':'assps_marks_signed_runtime',
 'DB_SIGNED_TENANT_RLS_ENABLED':'true',
 'DB_AUTH_USE_SIGNED_TENANT_CONTEXT':'true',
 'DB_ENFORCE_LEAST_PRIVILEGE_LOGIN':'true',
 'AUTO_MIGRATE_ON_BOOT':'false',
}
SECRETS=('JWT_SECRET','DB_PASSWORD','DB_SIGNED_TENANT_HMAC_KEY')

def load():
 if os.geteuid()!=0:raise RuntimeError('Operator root permission required')
 metadata=CONFIG.stat()
 if metadata.st_uid!=0 or stat.S_IMODE(metadata.st_mode)!=0o600:
  raise RuntimeError('Green credentials owner/mode mismatch')
 env={}
 for line in CONFIG.read_text().splitlines():
  if not line or line.startswith('#'):continue
  if '=' not in line:raise RuntimeError('Malformed protected configuration')
  k,v=line.split('=',1)
  if not re.fullmatch(r'[A-Za-z_][A-Za-z0-9_]*',k):raise RuntimeError('Malformed configuration name')
  if k in env:raise RuntimeError('Duplicate protected configuration key')
  env[k]=v
 for k,expected in REQUIRED.items():
  if env.get(k)!=expected:raise RuntimeError('Green security configuration mismatch at '+k)
 if not env.get('JWT_SECRET') or len(env.get('JWT_SECRET',''))<24:
  raise RuntimeError('Production JWT signing configuration missing')
 if len(env.get('DB_SIGNED_TENANT_HMAC_KEY',''))<64 or len(env.get('DB_PASSWORD',''))<32:
  raise RuntimeError('Signed database or HMAC secret incomplete')
 if SOURCE.resolve().name!='al-siddique-backend' or not (SOURCE/'src/server.js').is_file():
  raise RuntimeError('Backend source worktree mismatch')
 return env

def main():
 p=argparse.ArgumentParser()
 p.add_argument('--inspect',action='store_true')
 args=p.parse_args()
 env=load()
 if args.inspect:
  print('PROTECTED_GREEN_CONFIG_OWNER_MODE_PASS')
  print('GREEN_REVIEWED_SIGNED_RUNTIME_ENV_CONTRACT_PASS')
  print('GREEN_REVIEWED_LOCALHOST_5091_ONLY_PASS')
  print('GREEN_SRC_SERVER_EXISTS_PASS')
  print('NO_SERVICE_RESTART_OR_PRODUCTION_MUTATION')
  return 0
 # Any launch is a separately authorized operator activity. No SQL or Nginx
 # operations occur in this script; it replaces only the PRIVATE Node service.
 os.chdir(SOURCE)
 # The protected production-mark credentials file remains immutable. Only
 # listener port differs; keep production database, role and signed HMAC.
 env['PORT']='5091'
 env['HOST']='127.0.0.1'
 os.execvpe('/usr/bin/node',['node','src/server.js'],env)
if __name__=='__main__':
 try:sys.exit(main())
 except Exception as exc:
  print('GREEN_SUPERVISOR_ABORT '+type(exc).__name__,file=sys.stderr)
  sys.exit(2)
