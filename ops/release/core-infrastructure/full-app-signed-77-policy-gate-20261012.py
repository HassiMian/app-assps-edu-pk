#!/usr/bin/env python3
"""Fail-closed READ ONLY catalog verification of 77 protected app RLS tables.

Does not prove authenticated application route acceptance or authorize rollout.
"""
import argparse
import json
import subprocess
import sys

TARGETS = {'production': ('5432','apexos'),
           'baseline_clone': ('55432','assps_gate_sec_restore_test_20261012'),
           'guarded_combined_clone': ('55432','assps_core_rls_guard_qa_20261012')}
REQUIRED = 77

def verdict(f):
    issues=[]
    for key,desired in [('protected_tables',77),('enabled_force',77),
                        ('signed_app_guards',77),('school_signed_guards',73),
                        ('tenant_signed_guards',4),('signed_marks_preserved',77)]:
        if f.get(key)!=desired:issues.append(f'{key}_expected_{desired}')
    for key in ('app_nonbypass','app_nosuper','app_no_login','signing_schema_access',
                'signed_school_helper_access','signed_tenant_helper_access'):
        if f.get(key) is not True: issues.append(f'{key}_required')
    return {'status':'PASS_CLONE_POLICY_CATALOG_ONLY' if not issues else 'HOLD',
            'issues':issues,'read_only':True,'not_release_certification':True}

def query(port,db,sql):
    cmd=['runuser','-u','postgres','--','psql','-X','-A','-t','-v','ON_ERROR_STOP=1',
         '-p',port,'-d',db,'-c',sql]
    process=subprocess.run(cmd,capture_output=True,text=True,timeout=15)
    if process.returncode:raise RuntimeError('Bounded catalog query failed')
    return process.stdout.strip()

def inspect(target):
    port,db=TARGETS[target]
    sql=f"""
    WITH protected AS (
      SELECT c.oid,c.relname,c.relrowsecurity,c.relforcerowsecurity
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind='r' AND c.relname<>'student_class_movement_audit'
        AND c.relforcerowsecurity
    ), policies AS (
      SELECT pr.relname, pr.relrowsecurity,pr.relforcerowsecurity,
        p.policyname, p.permissive, p.roles,coalesce(p.qual,'') AS qual
      FROM protected pr LEFT JOIN pg_policies p
      ON p.schemaname='public' AND p.tablename=pr.relname
    )
    SELECT current_database()||'|'||current_setting('port')||'|'||
       (SELECT count(*) FROM protected)||'|'||
       (SELECT count(*) FROM protected WHERE relrowsecurity AND relforcerowsecurity)||'|'||
       (SELECT count(DISTINCT relname) FROM policies
         WHERE policyname='core_signed_tenant_guard' AND permissive='RESTRICTIVE'
           AND 'apex_app_runtime'=ANY(roles)
           AND qual IN ('core_security.signed_school_allowed(school_id)',
                        'core_security.signed_school_allowed(id)',
                        'core_security.signed_tenant_key_allowed((tenant_id)::text)'))||'|'||
       (SELECT count(*) FROM policies WHERE policyname='core_signed_tenant_guard'
         AND permissive='RESTRICTIVE' AND 'apex_app_runtime'=ANY(roles)
         AND qual IN ('core_security.signed_school_allowed(school_id)',
                       'core_security.signed_school_allowed(id)'))||'|'||
       (SELECT count(*) FROM policies WHERE policyname='core_signed_tenant_guard'
         AND permissive='RESTRICTIVE' AND 'apex_app_runtime'=ANY(roles)
         AND qual='core_security.signed_tenant_key_allowed((tenant_id)::text)')||'|'||
       (SELECT count(DISTINCT relname) FROM policies WHERE policyname='core_signed_tenant_guard'
         AND permissive='RESTRICTIVE' AND 'assps_marks_signed_runtime'=ANY(roles))||'|'||
       (SELECT concat((NOT rolbypassrls)::int,(NOT rolsuper)::int,(NOT rolcanlogin)::int)
          FROM pg_roles WHERE rolname='apex_app_runtime')||'|'||
       has_schema_privilege('apex_app_runtime','core_security','USAGE')::int||'|'||
       has_function_privilege('apex_app_runtime','core_security.signed_school_allowed(integer)','EXECUTE')::int||'|'||
       has_function_privilege('apex_app_runtime','core_security.signed_tenant_key_allowed(text)','EXECUTE')::int
    """
    parts=query(port,db,sql).split('|')
    if len(parts)!=12 or parts[0]!=db or parts[1]!=port:
        raise RuntimeError('Database identity or catalog format mismatch')
    if len(parts[8])!=3:raise RuntimeError('Unexpected restricted runtime role state')
    return dict(protected_tables=int(parts[2]),enabled_force=int(parts[3]),
        signed_app_guards=int(parts[4]),school_signed_guards=int(parts[5]),
        tenant_signed_guards=int(parts[6]),signed_marks_preserved=int(parts[7]),
        app_nonbypass=parts[8][0]=='1',app_nosuper=parts[8][1]=='1',
        app_no_login=parts[8][2]=='1',signing_schema_access=parts[9]=='1',
        signed_school_helper_access=parts[10]=='1',signed_tenant_helper_access=parts[11]=='1')

def main():
    a=argparse.ArgumentParser(description=__doc__)
    a.add_argument('--target',choices=TARGETS,default='production')
    args=a.parse_args()
    try:
        facts=inspect(args.target)
        result=verdict(facts)
        if args.target!='guarded_combined_clone' and result['status']=='PASS_CLONE_POLICY_CATALOG_ONLY':
            result={'status':'HOLD','issues':['non_clone_full_release_needs_authenticated_acceptance'],
                    'read_only':True,'not_release_certification':True}
    except (RuntimeError,ValueError,subprocess.TimeoutExpired) as err:
        facts={};result={'status':'HOLD','issues':['inspection_failed:'+type(err).__name__],
                         'read_only':True,'not_release_certification':True}
    print(json.dumps({'target':args.target,'catalog':facts,**result},sort_keys=True))
    return 0 if result['status']=='PASS_CLONE_POLICY_CATALOG_ONLY' else 2
if __name__=='__main__':sys.exit(main())
