#!/usr/bin/env python3
"""Read/ROLLBACK-only blue-green signed PostgreSQL acceptance; synthetic actor/database ONLY."""
from pathlib import Path
import subprocess,sys
ROOT=Path(__file__).resolve().parent/'fixtures'
DB='assps_core_bluegreen_rbac_rehearsal_20261011'
def psql(sql,timeout=18):
    p=subprocess.run(['runuser','-u','postgres','--','psql','-X','-A','-t','-v','ON_ERROR_STOP=1','-p','55432','-d',DB],
                     input=sql,text=True,capture_output=True,timeout=timeout)
    if p.returncode:
        raise RuntimeError('Isolated role/tenant SQL acceptance failed: '+p.stderr[-190:])
    return p.stdout+'\n'+p.stderr
def main():
    inspect=psql("""SELECT current_database(),current_setting('port');
SELECT count(*) FROM pg_policies WHERE policyname='core_signed_tenant_guard'
AND roles=ARRAY['assps_signed_shadow_runtime']::name[];
SELECT rolcanlogin::int,rolbypassrls::int FROM pg_roles WHERE rolname='assps_signed_shadow_runtime';
SELECT pg_has_role('assps_signed_shadow_runtime','apex_app_runtime','USAGE')::int;
""")
    facts=inspect.strip().splitlines()
    if facts[:4] != [DB+'|55432','77','0|0','1']:
        raise RuntimeError('Synthetic-only signed role catalog mismatch: '+repr(facts[:4]))
    scenarios=[
      ('bluegreen-old-unsigned-runtime-20261011.sql','OLD_RUNTIME_STILL_WORKS_WITHOUT_SIGNED_GUARD'),
      ('bluegreen-new-signed-runtime-20261011.sql','SIGNED_MARKS_REAL_PG_TENANT_SPOOF_DENIED_PASS'),
      ('bluegreen-new-unsigned-denial-20261011.sql','UNSIGNED_NEW_ROLE_FORGED_GUC_DENIED_PASS'),
    ]
    for filename,expected in scenarios:
        result=psql((ROOT/filename).read_text())
        if expected not in result or 'ROLLBACK' not in result:
            raise RuntimeError('Scenario evidence incomplete '+filename)
        print('BLUEGREEN_DISPOSABLE_ROLE_ACCEPTANCE_PASS '+filename)
    print('BLUEGREEN_OLD_RUNTIME_AVAILABLE_NEW_SIGNED_RUNTIME_ENFORCED_PASS')
    print('NO_PRODUCTION_LOGIN_ROLE_SQL_OR_SCHOOL_RECORDS_CHANGED')
if __name__=='__main__':
    try:main()
    except Exception as exc:
        print('BLUEGREEN_REHEARSAL_NO_GO '+str(exc),file=sys.stderr)
        sys.exit(2)
