#!/usr/bin/env python3
"""Read-only production signed-RLS migration prerequisites. Does not deploy/migrate."""
from pathlib import Path
import subprocess,sys
ROOT=Path('/var/www/apex-backend/.env')
names=('DB_USER','DB_NAME','DB_RUNTIME_ROLE','DB_ENFORCE_LEAST_PRIVILEGE_LOGIN',
       'DB_AUTH_USE_SIGNED_TENANT_CONTEXT','DB_SIGNED_TENANT_RLS_ENABLED')
def sql(text):
 p=subprocess.run(['runuser','-u','postgres','--','psql','-X','-A','-t',
  '-v','ON_ERROR_STOP=1','-p','5432','-d','apexos','-c',text],
  capture_output=True,text=True,timeout=12)
 if p.returncode:raise RuntimeError('production read-only catalog query not available')
 return p.stdout.strip()
def main():
 conf={}
 for line in ROOT.read_text(errors='replace').splitlines():
  if '=' in line:
   k,v=line.strip().split('=',1)
   if k in names:conf[k]=v.strip().strip('"')
 if conf.get('DB_NAME')!='apexos':
  raise RuntimeError('production database changed, refuse assumptions')
 role=conf.get('DB_USER','')
 if not role.isidentifier():raise RuntimeError('DB_USER invalid or missing')
 role_flags=sql("SELECT rolcanlogin::int||'|'||rolbypassrls::int||'|'||rolsuper::int FROM pg_roles WHERE rolname='"+role+"'")
 schema=sql("SELECT COUNT(*) FROM pg_namespace WHERE nspname='core_security'")
 funcs=sql("SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='core_security'")
 required=('signed_school_allowed','signed_tenant_key_allowed','valid_signed_context')
 print('PRODUCTION_LOGIN_ROLE='+role+' login|bypass|super='+role_flags)
 print('PRODUCTION_SIGNED_SCHEMA_COUNT='+schema+' FUNCTIONS='+funcs)
 for flag in names[3:]:print('PRODUCTION_'+flag+'='+conf.get(flag,'NOT_CONFIGURED'))
 print('REQUIRED_FUNCTIONS='+','.join(required))
 if role_flags!='1|0|0' or schema!='1' or int(funcs)<len(required) or any(conf.get(k)!='true' for k in names[3:]):
  print('PRODUCTION_SIGNED_MIGRATION_PREREQUISITES_NO_GO',flush=True)
  return 2
 print('CATALOG_PRECONDITIONS_PASS_BUT_JWT_ROLE_E2E_STILL_REQUIRED')
 return 0
if __name__=='__main__':
 try:sys.exit(main())
 except Exception as e:
  print('NO_GO '+str(e),file=sys.stderr)
  sys.exit(2)
