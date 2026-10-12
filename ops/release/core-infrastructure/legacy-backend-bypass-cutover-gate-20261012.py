#!/usr/bin/env python3
"""Read-only fail-closed check of the deployed legacy PostgreSQL LOGIN role.
No credential printing, grants, database changes, restarts or release promotion.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ENV=Path('/var/www/apex-backend/.env')

def parse_role(text):
    matches=re.findall(r'^\s*DB_USER\s*=\s*[\"\']?([^\"\'\s#]+)',text,re.M)
    if len(matches)!=1 or not re.fullmatch(r'[A-Za-z_][A-Za-z0-9_]*',matches[0]):
        raise ValueError('Ambiguous or invalid deployed DB_USER')
    return matches[0]

def classify(role, bypass, superuser, login):
    issues=[]
    if role=='postgres': issues.append('administrative_login_not_permitted')
    if not login: issues.append('database_login_missing')
    if bypass or superuser: issues.append('deployed_login_bypasses_rls')
    return {'status':'HOLD' if issues else 'PROVISIONAL_LOGIN_CHECK_ONLY',
            'issues':issues,'read_only':True,'not_release_certification':True}

def main():
    try:
        role=parse_role(ENV.read_text())
        cmd=['runuser','-u','postgres','--','psql','-X','-A','-t','-v','ON_ERROR_STOP=1',
             '-p','5432','-d','apexos','-c',
             "SELECT rolcanlogin::int||'|'||rolbypassrls::int||'|'||rolsuper::int "
             f"FROM pg_roles WHERE rolname='{role}'"]
        p=subprocess.run(cmd,capture_output=True,text=True,timeout=10)
        if p.returncode or not re.fullmatch(r'[01]\|[01]\|[01]',p.stdout.strip()):
            raise RuntimeError('Database role inventory unavailable')
        login,bypass,superuser=(v=='1' for v in p.stdout.strip().split('|'))
        result=classify(role,bypass,superuser,login)
    except (RuntimeError,OSError,ValueError,subprocess.TimeoutExpired) as err:
        result={'status':'HOLD','issues':['inspection_failed:'+type(err).__name__],
                'read_only':True,'not_release_certification':True}
    print(json.dumps(result,sort_keys=True))
    return 2 if result['status']=='HOLD' else 0
if __name__=='__main__':sys.exit(main())
