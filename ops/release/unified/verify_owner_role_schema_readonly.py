#!/usr/bin/env python3
import subprocess,csv,io,json
QUERY="SELECT pg_get_constraintdef(oid) AS definition,convalidated AS validated FROM pg_constraint WHERE conrelid='public.users'::regclass AND conname='users_role_check'"
def inspect(*,runner=None):
 run=runner or subprocess.run
 try:
  p=run(['runuser','-u','postgres','--','psql','-X','--csv','-p','5432','-d','apexos','-v','ON_ERROR_STOP=1','-c',QUERY],capture_output=True,text=True,timeout=12)
  if p.returncode:raise RuntimeError('DB_QUERY_ERROR')
  rows=list(csv.DictReader(io.StringIO(p.stdout)))
  if len(rows)!=1:raise ValueError('CONSTRAINT_NOT_FOUND')
  ok="'owner'" in str(rows[0]['definition']) and rows[0]['validated']=='t'
  return {'pass':ok,'owner_allowed_by_schema':ok,'read_only':True,
    'original_accounts_modified':False}
 except (OSError,RuntimeError,ValueError,subprocess.TimeoutExpired) as e:
  return {'pass':False,'read_only':True,'error_type':type(e).__name__}
if __name__=='__main__':
 result=inspect()
 print(json.dumps(result,sort_keys=True))
 raise SystemExit(0 if result['pass'] else 3)
