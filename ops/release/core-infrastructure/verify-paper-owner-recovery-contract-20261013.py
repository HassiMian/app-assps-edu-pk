#!/usr/bin/env python3
"""Read-only Paper owner recovery inventory; does NOT provision roles.

The restored database may have identical objects but incorrect owners/grants.
A production-safe substitute for apex_paper_owner must be separately approved
by Paper Studio Master; never create a BYPASSRLS LOGIN for legacy ACL fidelity.
"""
import json
import subprocess
import sys

PROD=('5432','apexos')
CLONE=('55432','assps_core_restore_verified_20261012')
OWNER='apex_paper_owner'
REQ_TABLES=('paper_documents','paper_revisions')
REQ_FUNCTIONS=('paper_canonical_document_no_delete_v6f1',
               'paper_canonical_revision_immutable_v6f1',
               'paper_canonical_write_guard_v6f1')


def query(port, db, sql):
    p=subprocess.run(['runuser','-u','postgres','--','psql','-X','-At',
       '-v','ON_ERROR_STOP=1','-p',port,'-d',db,'-c',sql],
       capture_output=True,text=True,timeout=15)
    if p.returncode:raise RuntimeError('Protected Paper recovery catalog unavailable')
    return [line for line in p.stdout.strip().splitlines() if line]


def facts(database):
    port,db=database
    if query(port,db,"SELECT current_database()||'|'||current_setting('port')")!=[db+'|'+port]:
        raise RuntimeError('Unexpected database or PostgreSQL cluster')
    rows=query(port,db,"""SELECT c.relname||'|'||r.rolname||'|'||
      c.relrowsecurity::int||'|'||c.relforcerowsecurity::int
      FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace
      JOIN pg_roles r ON c.relowner=r.oid
      WHERE ns.nspname='public' AND c.relkind='r'
        AND c.relname IN ('paper_documents','paper_revisions') ORDER BY c.relname""")
    tables={}
    for row in rows:
        name,owner,rls,force=row.split('|')
        tables[name]={'owner':owner,'rls_enabled':rls=='1','force_rls':force=='1'}
    funcs=query(port,db,"""SELECT p.proname||'|'||r.rolname||'|'||
      md5(pg_get_functiondef(p.oid)) FROM pg_proc p
      JOIN pg_namespace ns ON ns.oid=p.pronamespace
      JOIN pg_roles r ON r.oid=p.proowner
      WHERE ns.nspname='public' AND p.proname IN (
      'paper_canonical_document_no_delete_v6f1',
      'paper_canonical_revision_immutable_v6f1',
      'paper_canonical_write_guard_v6f1') ORDER BY p.proname""")
    functions={}
    for row in funcs:
        name,owner,definition_md5=row.split('|')
        functions[name]={'owner':owner,'function_md5':definition_md5}
    owner_roles=query(port,db,"""SELECT rolname||'|'||rolcanlogin::int||'|'||
      rolbypassrls::int||'|'||rolsuper::int FROM pg_roles
      WHERE rolname='apex_paper_owner'""")
    return {'tables':tables,'functions':functions,'owner_role':owner_roles,
            'safe_database':db,'db_port':port}


def evaluate(source,restore):
    issues=[]
    if set(source['tables'])!=set(REQ_TABLES):issues.append('source_paper_tables_missing')
    if set(restore['tables'])!=set(REQ_TABLES):issues.append('restore_paper_tables_missing')
    if set(source['functions'])!=set(REQ_FUNCTIONS):issues.append('source_paper_functions_missing')
    if set(restore['functions'])!=set(REQ_FUNCTIONS):issues.append('restore_paper_functions_missing')
    for table in REQ_TABLES:
        a=source['tables'].get(table)
        b=restore['tables'].get(table)
        if not a or a.get('owner')!=OWNER:issues.append('source_table_owner:'+table)
        if not b or b.get('owner')!=OWNER:issues.append('restore_table_owner:'+table)
        if a and b and (a['rls_enabled']!=b['rls_enabled'] or a['force_rls']!=b['force_rls']):
            issues.append('paper_rls_structure_drift:'+table)
    for name in REQ_FUNCTIONS:
        a=source['functions'].get(name)
        b=restore['functions'].get(name)
        if not a or a.get('owner')!=OWNER:issues.append('source_function_owner:'+name)
        if not b or b.get('owner')!=OWNER:issues.append('restore_function_owner:'+name)
        if a and b and a['function_md5']!=b['function_md5']:
            issues.append('paper_guard_function_drift:'+name)
    if source['owner_role']!=[OWNER+'|0|0|0']:
        issues.append('source_paper_owner_role_privilege_drift')
    if restore['owner_role']!=[OWNER+'|0|0|0']:
        issues.append('restore_paper_owner_safe_global_role_missing')
    return {'status':'PAPER_RECOVERY_SOURCE_PARITY_ONLY' if not issues else 'HOLD',
            'issues':issues,'read_only':True,
            'separate_paper_owner_acceptance_required':True,
            'full_backend_release_certified':False}


def main():
    try:
        p=facts(PROD);q=facts(CLONE)
        decision=evaluate(p,q)
    except (RuntimeError,ValueError,KeyError,subprocess.TimeoutExpired,OSError) as error:
        p={};q={}
        decision={'status':'HOLD','issues':['catalog_inspection_error:'+type(error).__name__],
                  'read_only':True,'full_backend_release_certified':False}
    # Aggregate metadata only: never show paper or school contents.
    print(json.dumps({'prod_paper_objects':list(p.get('tables',{})),
         'prod_paper_guard_functions':list(p.get('functions',{})),
         'restored_paper_tables':list(q.get('tables',{})),
         'restored_paper_functions':list(q.get('functions',{})),**decision},sort_keys=True))
    return 0 if decision['status']=='PAPER_RECOVERY_SOURCE_PARITY_ONLY' else 2
if __name__=='__main__':sys.exit(main())
