#!/usr/bin/env python3
"""Read-only role/RLS test on production and a disposable restore.

Never provisions grants/roles, authenticates school users, or mutates data.
Only counts rows using privileged operator and a non-BYPASS PostgreSQL role.
"""
import argparse
import json
import subprocess
import sys

DATABASES={'production':(5432,'apexos'),
           'clone':(55432,'assps_gate_sec_restore_test_20261012')}
ROLES=('apex_app_runtime','assps_marks_signed_runtime')
TABLES=('students','attendance','fee_challans','employees')


def sql_query(port, database, sql):
    argv=['runuser','-u','postgres','--','psql','-X','-A','-t',
          '-v','ON_ERROR_STOP=1','-p',str(port),'-d',database,'-c',sql]
    result=subprocess.run(argv,capture_output=True,text=True,timeout=16)
    if result.returncode:
        raise RuntimeError('Bounded read-only SQL query failed')
    return result.stdout.strip().splitlines()


def classify(table_rows, *, granted, rls, forced, actual, role_bypass, role_super):
    if role_bypass or role_super or not rls or not forced:
        return 'HOLD_SECURITY'
    if table_rows <= 0:
        return 'UNPROVEN_EMPTY_BASELINE'
    if not granted:
        return 'HOLD_GRANT_GAP'
    if actual != 0:
        return 'HOLD_UNSIGNED_ROWS_VISIBLE'
    return 'PASS_UNSIGNED_DENY'


def audited_role_count(port, db, role, table):
    statement=("BEGIN TRANSACTION READ ONLY; "
               f'SET LOCAL ROLE "{role}"; '
               f"SELECT current_user, row_security_active('public.{table}'::regclass); "
               f'SELECT count(*) FROM public."{table}"; ROLLBACK;')
    lines=sql_query(port, db, statement)
    if len(lines)!=5 or lines[0]!='BEGIN' or lines[1]!='SET' or lines[2]!=f'{role}|t' or lines[4]!='ROLLBACK':
        raise RuntimeError('Role test did not demonstrate active row security')
    return int(lines[3])


def audit_one(target):
    port,db=DATABASES[target]
    identity=sql_query(port,db,"SELECT current_database()||'|'||current_setting('port')")
    if identity!=[f'{db}|{port}']:
        raise RuntimeError('Database or port identity mismatch')
    reports=[]
    for role in ROLES:
        role_state=sql_query(port,db, f"SELECT rolcanlogin::int,rolbypassrls::int,rolsuper::int FROM pg_roles WHERE rolname='{role}'")
        if len(role_state)!=1: raise RuntimeError('Required runtime role missing')
        login,bypass,superuser=[x=='1' for x in role_state[0].split('|')]
        for table in TABLES:
            facts=sql_query(port,db,
              f"SELECT (SELECT count(*) FROM public.\"{table}\")::text||'|'||"
              f"has_table_privilege('{role}','public.{table}','SELECT')::int||'|'||"
              f"c.relrowsecurity::int||'|'||c.relforcerowsecurity::int "
              f"FROM pg_class c WHERE c.oid='public.{table}'::regclass")
            if len(facts)!=1:raise RuntimeError('Protected table catalog unavailable')
            count,grant,rls,forced=facts[0].split('|')
            permitted=grant=='1'
            actual=audited_role_count(port,db,role,table) if permitted and not bypass and not superuser else None
            status=classify(int(count),granted=permitted,rls=rls=='1',forced=forced=='1',
                            actual=actual,role_bypass=bypass,role_super=superuser)
            reports.append({'role':role,'table':table,'status':status,'grant_select':permitted,
                            'rls_active':rls=='1' and forced=='1', 'unsigned_visible_rows':actual})
    return reports


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--json',action='store_true')
    args=parser.parse_args()
    reports={}
    try:
        for name in DATABASES:reports[name]=audit_one(name)
    except (RuntimeError, subprocess.TimeoutExpired, ValueError) as error:
        print('RLS_AUDIT_HOLD '+type(error).__name__,file=sys.stderr)
        return 2
    gaps=sum(r['status']!='PASS_UNSIGNED_DENY' for rows in reports.values() for r in rows)
    verdict='PASS' if gaps==0 else 'HOLD'
    if args.json: print(json.dumps({'verdict':verdict,'read_only':True,'checks':reports},indent=2))
    else:
        for db,rows in reports.items():
            for row in rows:
                print(db,row['role'],row['table'],row['status'])
        print('UNSIGNED_RLS_AUDIT='+verdict+' GAP_COUNT='+str(gaps))
        print('NO_LIVE_DATA_MUTATIONS=TRUE')
    return 0 if verdict=='PASS' else 2


if __name__=='__main__':sys.exit(main())
