#!/usr/bin/env python3
"""ASSPS: fail-closed READ-ONLY live backend signed runtime identity audit."""
from pathlib import Path
import re, subprocess, sys

ENV=Path('/var/www/apex-backend/.env')
SOURCE_ENV=Path('/var/www/apex-backend/src/.env')
REQUIRED=('DB_ENFORCE_LEAST_PRIVILEGE_LOGIN','DB_AUTH_USE_SIGNED_TENANT_CONTEXT','DB_SIGNED_TENANT_RLS_ENABLED')
def parse_env(path):
    if not path.is_file():raise RuntimeError('MISSING_LIVE_BACKEND_ENV')
    selected={}
    allowed={'DB_USER','DB_RUNTIME_ROLE','DB_PORT','DB_HOST','DB_NAME',*REQUIRED}
    for line in path.read_text(errors='replace').splitlines():
        if '=' not in line:continue
        k,v=line.strip().split('=',1)
        if k in allowed:selected[k]=v.strip().strip('\"\'')
    return selected
def inspect_role(role,database):
    if not re.fullmatch('[A-Za-z_][A-Za-z0-9_]*',role):
        raise RuntimeError('UNSAFE_DB_LOGIN_NAME')
    query="SELECT rolcanlogin::int||'|'||rolbypassrls::int||'|'||rolsuper::int FROM pg_roles WHERE rolname='"+role+"'"
    p=subprocess.run(['runuser','-u','postgres','--','psql','-X','-A','-t','-v','ON_ERROR_STOP=1',
     '-p','5432','-d',database,'-c',query],text=True,capture_output=True,timeout=12)
    if p.returncode:raise RuntimeError('READ_ONLY_DB_ROLE_CATALOG_UNAVAILABLE '+p.stderr[-170:])
    return p.stdout.strip()
def main():
    a=parse_env(ENV)
    b=parse_env(SOURCE_ENV)
    relevant=('DB_USER','DB_RUNTIME_ROLE','DB_PORT','DB_HOST','DB_NAME',*REQUIRED)
    if any(a.get(k)!=b.get(k) for k in relevant):
        raise RuntimeError('LIVE_RUNTIME_ENV_COPY_MISMATCH')
    login=a.get('DB_USER','')
    if not login:raise RuntimeError('DB_USER_NOT_EXPLICIT')
    database=a.get('DB_NAME','')
    if not re.fullmatch('[A-Za-z_][A-Za-z0-9_]*',database):
        raise RuntimeError('PRODUCTION_DATABASE_NAME_INVALID')
    if a.get('DB_HOST') not in ('localhost','127.0.0.1') or a.get('DB_PORT')!='5432':
        raise RuntimeError('PRODUCTION_DB_ENDPOINT_UNEXPECTED')
    props=inspect_role(login,database)
    print('PRODUCTION_RUNTIME_DB_USER='+login,flush=True)
    print('PRODUCTION_RUNTIME_DB_ROLE_FLAGS='+props,flush=True)
    for name in REQUIRED:print('PRODUCTION_RUNTIME_'+name+'='+a.get(name,'NOT_CONFIGURED'),flush=True)
    print('PRODUCTION_RUNTIME_DB_RUNTIME_ROLE='+a.get('DB_RUNTIME_ROLE','NOT_CONFIGURED'),flush=True)
    if props!='1|0|0':
        raise RuntimeError('PRODUCTION_DB_LOGIN_NOT_LEAST_PRIVILEGE_NONBYPASS')
    if any(a.get(name)!='true' for name in REQUIRED):
        raise RuntimeError('PRODUCTION_SIGNED_TENANT_FLAGS_NOT_ALL_ENABLED')
    if a.get('DB_RUNTIME_ROLE')!='apex_app_runtime':
        raise RuntimeError('PRODUCTION_RUNTIME_ROLE_NOT_AUTHORIZED')
    print('PRODUCTION_SIGNED_RUNTIME_IDENTITY_PREFLIGHT_PASS',flush=True)
if __name__=='__main__':
    try:main()
    except Exception as exc:
        print('PRODUCTION_SIGNED_RUNTIME_NOT_CERTIFIED '+str(exc),file=sys.stderr)
        sys.exit(2)
