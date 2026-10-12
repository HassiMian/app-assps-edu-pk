#!/usr/bin/env python3
"""Bounded, read-only 77-table signed RLS + CRUD grants release gate.

Checks privilege completeness, signed write WITH CHECK and Paper exclusion.
Does NOT replace authenticated HTTP/DB-login acceptance or authorize deployment.
"""
import argparse
import json
import subprocess
import sys

DBS={'production':(5432,'apexos'),
     'untouched_restore':(55432,'assps_gate_sec_restore_test_20261012'),
     'guarded_clone':(55432,'assps_core_rls_guard_qa_20261012')}


def verdict(f):
    requirements={
      'protected_tables':77,
      'both_runtime_signed_guard':77,
      'signed_guard_with_check':77,
      'app_select':75,
      'app_insert':75,
      'app_update':75,
      'app_delete':75,
      'paper_table_count':2,
      'app_paper_granted':0,
      'marks_select':75,
      'marks_insert':75,
      'marks_update':75,
      'marks_delete':75,
      'marks_paper_granted':0,
      'runtime_roles_safe':2,
    }
    failed=[f'{name}:expected_{expected}:actual_{f.get(name)}' for name,expected in requirements.items()
            if f.get(name)!=expected]
    return {'status':'PASS_ISOLATED_CATALOG_ONLY' if not failed else 'HOLD',
            'issues':failed,'read_only':True,
            'authenticated_route_acceptance':False,'full_production_certified':False}


def sql(port,db,statement):
    p=subprocess.run(['runuser','-u','postgres','--','psql','-X','-A','-t','-F','|',
        '-v','ON_ERROR_STOP=1','-p',str(port),'-d',db,'-c',statement],
        text=True,capture_output=True,timeout=15)
    if p.returncode:raise RuntimeError('Catalog query not available')
    return [line.strip() for line in p.stdout.splitlines() if line.strip()]


def inspect(target):
    port,db=DBS[target]
    if sql(port,db,"SELECT current_database(),current_setting('port')")!=[f'{db}|{port}']:
        raise RuntimeError('Postgres target identity mismatch')
    relation_sql="""
    WITH protected AS (
      SELECT c.oid,c.relname FROM pg_class c
      JOIN pg_namespace ns ON ns.oid=c.relnamespace
      WHERE ns.nspname='public' AND c.relkind='r'
        AND c.relforcerowsecurity AND c.relname<>'student_class_movement_audit'
    )
    SELECT count(*),
      count(*) FILTER(WHERE relname NOT IN ('paper_documents','paper_revisions')
        AND has_table_privilege('apex_app_runtime',oid,'SELECT')),
      count(*) FILTER(WHERE relname NOT IN ('paper_documents','paper_revisions')
        AND has_table_privilege('apex_app_runtime',oid,'INSERT')),
      count(*) FILTER(WHERE relname NOT IN ('paper_documents','paper_revisions')
        AND has_table_privilege('apex_app_runtime',oid,'UPDATE')),
      count(*) FILTER(WHERE relname NOT IN ('paper_documents','paper_revisions')
        AND has_table_privilege('apex_app_runtime',oid,'DELETE')),
      count(*) FILTER(WHERE relname IN ('paper_documents','paper_revisions')),
      count(*) FILTER(WHERE relname IN ('paper_documents','paper_revisions')
        AND (has_table_privilege('apex_app_runtime',oid,'SELECT')
         OR has_table_privilege('apex_app_runtime',oid,'INSERT')
         OR has_table_privilege('apex_app_runtime',oid,'UPDATE')
         OR has_table_privilege('apex_app_runtime',oid,'DELETE'))),
      count(*) FILTER(WHERE relname NOT IN ('paper_documents','paper_revisions') AND has_table_privilege('assps_marks_signed_runtime',oid,'SELECT')),
      count(*) FILTER(WHERE relname NOT IN ('paper_documents','paper_revisions') AND has_table_privilege('assps_marks_signed_runtime',oid,'INSERT')),
      count(*) FILTER(WHERE relname NOT IN ('paper_documents','paper_revisions') AND has_table_privilege('assps_marks_signed_runtime',oid,'UPDATE')),
      count(*) FILTER(WHERE relname NOT IN ('paper_documents','paper_revisions') AND has_table_privilege('assps_marks_signed_runtime',oid,'DELETE')),
      count(*) FILTER(WHERE relname IN ('paper_documents','paper_revisions') AND (
           has_table_privilege('assps_marks_signed_runtime',oid,'SELECT')
        OR has_table_privilege('assps_marks_signed_runtime',oid,'INSERT')
        OR has_table_privilege('assps_marks_signed_runtime',oid,'UPDATE')
        OR has_table_privilege('assps_marks_signed_runtime',oid,'DELETE')))
    FROM protected
    """
    relation_rows=sql(port,db,relation_sql)
    if len(relation_rows)!=1:raise RuntimeError('Invalid protected catalog result')
    values=[int(x) for x in relation_rows[0].split('|')]
    if len(values)!=12:raise RuntimeError('Protected catalog response width drift')
    names=('protected_tables','app_select','app_insert','app_update','app_delete',
           'paper_table_count','app_paper_granted','marks_select','marks_insert',
           'marks_update','marks_delete','marks_paper_granted')
    facts=dict(zip(names,values))
    guard_rows=sql(port,db,"""
     SELECT count(*),
       count(*) FILTER(WHERE coalesce(qual,'')=coalesce(with_check,''))
     FROM pg_policies WHERE schemaname='public'
       AND policyname='core_signed_tenant_guard' AND permissive='RESTRICTIVE'
       AND 'apex_app_runtime'=ANY(roles)
       AND 'assps_marks_signed_runtime'=ANY(roles)
    """)
    if len(guard_rows)!=1 or len(guard_rows[0].split('|'))!=2:
        raise RuntimeError('Signed guard catalog width drift')
    facts['both_runtime_signed_guard'],facts['signed_guard_with_check']=[int(v) for v in guard_rows[0].split('|')]
    roles=sql(port,db,"""
      SELECT count(*) FROM pg_roles
      WHERE rolname IN ('apex_app_runtime','assps_marks_signed_runtime')
        AND NOT rolcanlogin AND NOT rolbypassrls AND NOT rolsuper
    """)
    facts['runtime_roles_safe']=int(roles[0])
    return facts


def main():
    a=argparse.ArgumentParser(description=__doc__)
    a.add_argument('--target',choices=DBS,default='production')
    args=a.parse_args()
    try:
        facts=inspect(args.target)
        result=verdict(facts)
        if args.target!='guarded_clone' and result['status']=='PASS_ISOLATED_CATALOG_ONLY':
            result={**result,'status':'HOLD',
                    'issues':['no_authenticated_release_certification_for_live_target']}
    except (RuntimeError,ValueError,subprocess.TimeoutExpired,IndexError) as ex:
        facts={};result={'status':'HOLD','issues':['inspection_error:'+type(ex).__name__],
                         'read_only':True,'full_production_certified':False}
    print(json.dumps({'target':args.target,'facts':facts,**result},sort_keys=True))
    return 0 if result['status']=='PASS_ISOLATED_CATALOG_ONLY' else 2
if __name__=='__main__':sys.exit(main())
