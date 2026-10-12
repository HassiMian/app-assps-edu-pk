#!/usr/bin/env python3
"""Read-only access-grant parity gate for a completed isolated backup restore.

The restore was executed with --no-acl, so equal data/policies cannot justify
asserting an application-ready failover/rollback. No database writes occur.
"""
import json
import subprocess
import sys

PROD=('5432','apexos')
RESTORED=('55432','assps_core_restore_verified_20261012')
ROLES=('apex_app_runtime','assps_marks_signed_runtime')
OPS=('SELECT','INSERT','UPDATE','DELETE')

def psql(port,db,sql):
    p=subprocess.run(['runuser','-u','postgres','--','psql','-X','-At','-v','ON_ERROR_STOP=1',
             '-p',port,'-d',db,'-c',sql],capture_output=True,text=True,timeout=12)
    if p.returncode:raise RuntimeError('ACL catalog query failed')
    return p.stdout.strip()

def inventory(target):
    port,db=target
    identity=psql(port,db,"SELECT current_database()||'|'||current_setting('port')")
    if identity!=db+'|'+port:raise RuntimeError('Unexpected database identity')
    filters="c.relname NOT IN ('paper_documents','paper_revisions','student_class_movement_audit')"
    columns=[]
    keys=[]
    for role in ROLES:
        for operation in OPS:
            key=role+'_'+operation.lower()
            keys.append(key)
            columns.append(f"count(*) FILTER (WHERE has_table_privilege('{role}',c.oid,'{operation}'))")
    sql=("SELECT count(*)||'|'||"+"||'|'||".join(columns)+
         " FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace "
         " WHERE n.nspname='public' AND c.relkind='r' AND c.relforcerowsecurity AND "+filters)
    fields=psql(port,db,sql).split('|')
    if len(fields)!=len(keys)+1:raise RuntimeError('Unexpected ACL columns')
    return {'protected_core_relations':int(fields[0]),**dict(zip(keys,map(int,fields[1:])))}

def assess(prod,restore):
    issues=[]
    if prod.get('protected_core_relations')!=75:issues.append('production_scope_drift')
    if restore.get('protected_core_relations')!=75:issues.append('restore_scope_drift')
    for role in ROLES:
        for operation in OPS:
            key=role+'_'+operation.lower()
            if prod.get(key)!=restore.get(key):issues.append('grant_count_difference:'+key)
            if prod.get(key)!=75:issues.append('production_grant_baseline_unexpected:'+key)
    return {'status':'PASS_ROLE_GRANT_PARITY_ONLY' if not issues else 'HOLD',
            'issues':issues,'read_only':True,'restored_data_verified_separately':True,
            'authenticated_route_acceptance':False,'production_rollback_certified':False}

def main():
    try:
        source=inventory(PROD)
        restored=inventory(RESTORED)
        result=assess(source,restored)
    except (RuntimeError,ValueError,subprocess.TimeoutExpired,OSError) as error:
        source={};restored={}
        result={'status':'HOLD','issues':['catalog_error:'+type(error).__name__],
                'read_only':True,'production_rollback_certified':False}
    print(json.dumps({'live_role_grants':source,'restore_role_grants':restored,**result},sort_keys=True))
    return 0 if result['status']=='PASS_ROLE_GRANT_PARITY_ONLY' else 2
if __name__=='__main__':sys.exit(main())
