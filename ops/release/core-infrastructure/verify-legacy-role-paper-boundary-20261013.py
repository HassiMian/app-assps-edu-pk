#!/usr/bin/env python3
"""Read-only production Core/Paper legacy role cutover preflight.

A privileged deployed login cannot be replaced or have BYPASSRLS removed
without signed routing, Paper-owner access review and authenticated regression.
This gate never issues ALTER ROLE, GRANT, REVOKE, restarts or production writes.
"""
import json
import subprocess
import sys

SOURCE=('5432','apexos')
TEST_CLUSTER=('55432','postgres')

def read(port,db,sql):
    p=subprocess.run(['runuser','-u','postgres','--','psql','-X','-At',
       '-v','ON_ERROR_STOP=1','-p',port,'-d',db,'-c',sql],
       capture_output=True,text=True,timeout=12)
    if p.returncode:raise RuntimeError('Cannot inspect signed role catalog')
    return p.stdout.strip().splitlines()

def assess(role_data, paper_owner, paper_function_owner, legacy_memberships,
           restore_paper_exists, restore_legacy_exists, signed_app_guard_count):
    issues=[]
    if role_data.get('legacy_canlogin') is not False:
        issues.append('LEGACY_DEPLOYED_LOGIN_STILL_ENABLED')
    if role_data.get('legacy_bypassrls') is not False:
        issues.append('LEGACY_DEPLOYED_LOGIN_STILL_BYPASSES_RLS')
    if role_data.get('paper_owner_nologin') is not True:
        issues.append('PRODUCTION_PAPER_OWNER_ROLE_NOT_SAFE')
    if paper_owner<1 or paper_function_owner<1:
        issues.append('PROTECTED_PAPER_OWNER_OBJECTS_MISSING')
    if 'apex_paper_owner' in legacy_memberships or 'apex_app_runtime' in legacy_memberships:
        issues.append('LEGACY_LOGIN_STILL_INHERITS_CORE_OR_PAPER_ROLES')
    if not restore_paper_exists:
        issues.append('QA_GLOBAL_PAPER_OWNER_MAPPING_MISSING')
    if not restore_legacy_exists:
        issues.append('QA_GLOBAL_LEGACY_ACL_OWNER_MAPPING_MISSING')
    if signed_app_guard_count!=77:
        issues.append('LIVE_SIGNED_APP_POLICY_GUARDS_NOT_COMPLETE')
    return {'verdict':'ROLE_CATALOG_PRECHECK_ONLY' if not issues else 'HOLD',
            'issues':issues,'read_only':True,
            'paper_studio_owner_signoff_required':True,
            'authenticated_teacher_acceptance_required':True,
            'full_cutover_certified':False}

def inspect():
    p,db=SOURCE
    if read(p,db,"SELECT current_database()||'|'||current_setting('port')")!=['apexos|5432']:
        raise RuntimeError('Unexpected production PostgreSQL source')
    rows=read(p,db,"""SELECT rolname,rolcanlogin::int,rolbypassrls::int,rolsuper::int
       FROM pg_roles WHERE rolname IN ('apexos_user','apex_paper_owner')
       ORDER BY rolname""")
    role={}
    for row in rows:
        name,login,bypass,superuser=row.split('|')
        role[name]=(login=='1',bypass=='1',superuser=='1')
    if set(role)!={'apexos_user','apex_paper_owner'}:
        raise RuntimeError('Production Core/Paper owner roles missing')
    metadata={'legacy_canlogin':role['apexos_user'][0],
              'legacy_bypassrls':role['apexos_user'][1],
              'paper_owner_nologin':not role['apex_paper_owner'][0]
                and not role['apex_paper_owner'][1] and not role['apex_paper_owner'][2]}
    memberships=read(p,db,"""SELECT parent.rolname FROM pg_auth_members m
       JOIN pg_roles parent ON parent.oid=m.roleid
       JOIN pg_roles member ON member.oid=m.member
       WHERE member.rolname='apexos_user' ORDER BY parent.rolname""")
    ownership=read(p,db,"""SELECT
      (SELECT count(*) FROM pg_class WHERE relowner=(SELECT oid FROM pg_roles
       WHERE rolname='apex_paper_owner'))||'|'||
      (SELECT count(*) FROM pg_proc WHERE proowner=(SELECT oid FROM pg_roles
       WHERE rolname='apex_paper_owner'))""")
    if len(ownership)!=1:raise RuntimeError('Protected Paper object ownership unavailable')
    object_rel,object_funcs=(int(v) for v in ownership[0].split('|'))
    policy=read(p,db,"""SELECT count(*) FROM pg_policies WHERE schemaname='public'
      AND policyname='core_signed_tenant_guard' AND permissive='RESTRICTIVE'
      AND 'apex_app_runtime'=ANY(roles)""")
    globals_rows=read(*TEST_CLUSTER,"""SELECT rolname FROM pg_roles
      WHERE rolname IN ('apexos_user','apex_paper_owner') ORDER BY rolname""")
    return {'role':metadata,'paper_owned_relations':object_rel,
      'paper_owned_functions':object_funcs,'legacy_role_memberships':memberships,
      'qa_paper_owner_present':'apex_paper_owner' in globals_rows,
      'qa_legacy_owner_present':'apexos_user' in globals_rows,
      'live_signed_app_guards':int(policy[0])}

def main():
    try:
        facts=inspect()
        result=assess(facts['role'],facts['paper_owned_relations'],
           facts['paper_owned_functions'],facts['legacy_role_memberships'],
           facts['qa_paper_owner_present'],facts['qa_legacy_owner_present'],
           facts['live_signed_app_guards'])
    except (RuntimeError,ValueError,IndexError,OSError,subprocess.TimeoutExpired) as err:
        facts={};result={'verdict':'HOLD','issues':['inspection_'+type(err).__name__],
                'read_only':True,'full_cutover_certified':False}
    print(json.dumps({'facts':facts,**result},sort_keys=True))
    return 0 if result['verdict']=='ROLE_CATALOG_PRECHECK_ONLY' else 2
if __name__=='__main__':sys.exit(main())
