#!/usr/bin/env python3
"""Read-only exact policy/grant verifier for a Core-owned nonproduction RLS rehearsal.
No DDL, tenant secrets, student identities, writes, deployment, or scheduling.
"""
import json
import subprocess
import sys

CLONE_DB='assps_core_rls_guard_qa_20261012'
CORE_TABLES=('students','attendance','fee_challans','employees')
CLONE_PORT='55432'
PROD_PORT='5432'

def query(port,db,statement):
    argv=['runuser','-u','postgres','--','psql','-X','-A','-t','-v','ON_ERROR_STOP=1',
          '-p',port,'-d',db,'-c',statement]
    p=subprocess.run(argv,text=True,capture_output=True,timeout=15)
    if p.returncode: raise RuntimeError('Postgres role/policy catalog unavailable')
    return p.stdout.strip().splitlines()


def evaluate(rows, prod_guard_count):
    problems=[]
    if prod_guard_count!=4:
        problems.append('production_scope_not_unmodified')
    if len(rows)!=len(CORE_TABLES):
        problems.append('clone_table_scope_count_wrong')
    for entry in rows:
        if entry['table'] not in CORE_TABLES:
            problems.append('unexpected_relation')
        if not entry['forced'] or not entry['enabled']:
            problems.append('missing_force_rls:'+entry['table'])
        if not entry['restricted'] or not entry['signed_marks_preserved'] or not entry['app_runtime_scoped']:
            problems.append('restrictive_signed_guard_missing:'+entry['table'])
        if not entry['app_select']:
            problems.append('clone_app_runtime_select_missing:'+entry['table'])
        if entry['app_bypass'] or entry['app_login'] or entry['app_super']:
            problems.append('unsafe_clone_app_runtime_role')
    return {'verdict':'PASS' if not problems else 'HOLD','issues':problems,'clone_only':True,'read_only':True}


def main():
    try:
        id_rows=query(CLONE_PORT,CLONE_DB,"SELECT current_database()||'|'||current_setting('port')")
        if id_rows!=[CLONE_DB+'|'+CLONE_PORT]:raise RuntimeError('Wrong clone identity')
        identity=query(CLONE_PORT,CLONE_DB,
          "SELECT rolcanlogin::int||'|'||rolbypassrls::int||'|'||rolsuper::int "
          "FROM pg_roles WHERE rolname='apex_app_runtime'")
        if identity!=['0|0|0']:raise RuntimeError('Unsafe app runtime role')
        prod=query(PROD_PORT,'apexos',
          "SELECT count(*) FROM pg_policies WHERE schemaname='public' "
          "AND tablename=ANY(ARRAY['students','attendance','fee_challans','employees']) "
          "AND policyname='core_signed_tenant_guard' "
          "AND roles=ARRAY['assps_marks_signed_runtime']::name[]")
        catalog=query(CLONE_PORT,CLONE_DB,
          "SELECT c.relname||'|'||c.relrowsecurity::int||'|'||c.relforcerowsecurity::int||'|'||"
          "(p.permissive='RESTRICTIVE')::int||'|'||"
          "('assps_marks_signed_runtime'=ANY(p.roles))::int||'|'||"
          "('apex_app_runtime'=ANY(p.roles))::int||'|'||"
          "has_table_privilege('apex_app_runtime',c.oid,'SELECT')::int "
          "FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace "
          "JOIN pg_policies p ON p.schemaname=n.nspname AND p.tablename=c.relname "
          "WHERE n.nspname='public' AND c.relname=ANY(ARRAY['students','attendance','fee_challans','employees']) "
          "AND p.policyname='core_signed_tenant_guard' ORDER BY c.relname")
        rows=[]
        for line in catalog:
            parts=line.split('|')
            if len(parts)!=7:raise RuntimeError('Malformed policy catalog row')
            table,enabled,forced,restricted,signed,app,grant=parts
            rows.append(dict(table=table,enabled=enabled=='1',forced=forced=='1',
                             restricted=restricted=='1',signed_marks_preserved=signed=='1',
                             app_runtime_scoped=app=='1',app_select=grant=='1',
                             app_bypass=False,app_login=False,app_super=False))
        outcome=evaluate(rows,int(prod[0]))
    except (RuntimeError,ValueError,IndexError,subprocess.TimeoutExpired) as err:
        outcome={'verdict':'HOLD','issues':['catalog_inspection_failed:'+type(err).__name__],
                 'clone_only':True,'read_only':True}
    print(json.dumps(outcome,sort_keys=True))
    return 0 if outcome['verdict']=='PASS' else 2

if __name__=='__main__':sys.exit(main())
