#!/usr/bin/env python3
"""Read-only authoritative guard of a private *hardened* recovery candidate.

This is candidate database security evidence only. It checks exact Core table,
sequence, helper ACL, signed RLS and actual unsigned denial conditions.
No application user LOGIN, live cutover, academic data writes or credentials.
"""
import json
from pathlib import Path
import re
import subprocess
import sys

HERE=Path(__file__).resolve().parent
MANIFEST=HERE/'assps-core-restore-sequence-acl-reference-20261012.json'
PORT='55432'
DB='assps_core_signed_recovery_candidate_20261012'
SAFE_ROLES=('apex_app_runtime','assps_marks_signed_runtime')
PROTECTED_NONEMPTY_FAMILIES=('students','attendance','fee_challans',
   'fee_payment_transactions','users','employees','exam_results','exams')


def query(sql):
    p=subprocess.run(['runuser','-u','postgres','--','psql','-X','-At',
         '-v','ON_ERROR_STOP=1','-p',PORT,'-d',DB,'-c',sql],
         text=True,capture_output=True,timeout=15)
    if p.returncode:raise RuntimeError('Hardened candidate read-only SQL failed')
    return p.stdout.strip().splitlines()


def inspect():
    if query("SELECT current_database()||'|'||current_setting('port')")!=[DB+'|'+PORT]:
        raise RuntimeError('Refusing wrong database/port')
    role_rows=query("""SELECT rolname||'|'||rolcanlogin::int||'|'||rolbypassrls::int||'|'||rolsuper::int
                   FROM pg_roles WHERE rolname IN ('apex_app_runtime','assps_marks_signed_runtime')
                   ORDER BY rolname""")
    safe=role_rows==['apex_app_runtime|0|0|0','assps_marks_signed_runtime|0|0|0']
    access=subprocess.run(['runuser','-u','postgres','--','psql','-X','-At','-v','ON_ERROR_STOP=1',
       '-p',PORT,'-d','postgres','-c',
       "SELECT has_database_privilege('public',oid,'CONNECT')::int||'|'||"
       "has_database_privilege('public',oid,'TEMP')::int FROM pg_database "
       "WHERE datname='assps_core_signed_recovery_candidate_20261012'"],
       capture_output=True,text=True,timeout=12)
    public_blocked=access.returncode==0 and access.stdout.strip()=='0|0'
    policy_row=query("""SELECT count(*)||'|'||
      count(*) FILTER(WHERE 'apex_app_runtime'=ANY(roles)
        AND 'assps_marks_signed_runtime'=ANY(roles) AND permissive='RESTRICTIVE'
        AND coalesce(with_check,'')=coalesce(qual,''))||'|'||
      count(*) FILTER(WHERE qual IN ('core_security.signed_school_allowed(id)',
         'core_security.signed_school_allowed(school_id)'))||'|'||
      count(*) FILTER(WHERE qual='core_security.signed_tenant_key_allowed((tenant_id)::text)')
      FROM pg_policies WHERE schemaname='public' AND policyname='core_signed_tenant_guard'""")
    if len(policy_row)!=1:raise RuntimeError('RLS policy catalog missing')
    n,dual,schools,tenant=map(int,policy_row[0].split('|'))
    tables=query("""WITH rel AS (SELECT c.oid,c.relname FROM pg_class c
      JOIN pg_namespace ns ON ns.oid=c.relnamespace WHERE ns.nspname='public'
      AND c.relkind='r' AND c.relforcerowsecurity
      AND c.relname NOT IN ('student_class_movement_audit','paper_documents','paper_revisions'))
      SELECT count(*)||'|'||
      count(*) FILTER(WHERE has_table_privilege('apex_app_runtime',oid,'SELECT')
        AND has_table_privilege('apex_app_runtime',oid,'INSERT')
        AND has_table_privilege('apex_app_runtime',oid,'UPDATE')
        AND has_table_privilege('apex_app_runtime',oid,'DELETE'))||'|'||
      count(*) FILTER(WHERE has_table_privilege('assps_marks_signed_runtime',oid,'SELECT')
        AND has_table_privilege('assps_marks_signed_runtime',oid,'INSERT')
        AND has_table_privilege('assps_marks_signed_runtime',oid,'UPDATE')
        AND has_table_privilege('assps_marks_signed_runtime',oid,'DELETE')) FROM rel""")
    if len(tables)!=1:raise RuntimeError('Scoped table catalog missing')
    total,app,marks=map(int,tables[0].split('|'))
    seq_sql="""SELECT c.relname,
      has_sequence_privilege('apex_app_runtime',c.oid,'USAGE')::int,
      has_sequence_privilege('apex_app_runtime',c.oid,'SELECT')::int,
      has_sequence_privilege('assps_marks_signed_runtime',c.oid,'USAGE')::int,
      has_sequence_privilege('assps_marks_signed_runtime',c.oid,'SELECT')::int
      FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace
      WHERE ns.nspname='public' AND c.relkind='S' ORDER BY c.relname"""
    sequences=[]
    for item in query(seq_sql):
        cols=item.split('|')
        if len(cols)!=5 or not re.fullmatch(r'[a-z_][a-z0-9_]*',cols[0]) or any(c not in ('0','1') for c in cols[1:]):
            raise RuntimeError('Unknown sequence grant metadata')
        sequences.append(dict(zip(['sequence','app_usage','app_read','marks_usage','marks_read'],
                                  [cols[0],*(x=='1' for x in cols[1:])])))
    metadata=json.loads(MANIFEST.read_text())
    sequence_matches=(metadata['references']==sequences and len(sequences)==78)
    helper_rows=query("""SELECT r.rolname||'|'||p.proname||'|'||
       has_function_privilege(r.rolname,p.oid,'EXECUTE')::int
       FROM pg_roles r CROSS JOIN pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
       WHERE r.rolname IN ('apex_app_runtime','assps_marks_signed_runtime')
       AND n.nspname='core_security' ORDER BY r.rolname,p.proname""")
    expected_helpers=[
      'apex_app_runtime|signed_school_allowed|0',
      'apex_app_runtime|signed_tenant_key_allowed|0',
      'apex_app_runtime|valid_signed_context|0',
      'assps_marks_signed_runtime|signed_school_allowed|1',
      'assps_marks_signed_runtime|signed_tenant_key_allowed|1',
      'assps_marks_signed_runtime|valid_signed_context|0',
    ]
    # Hardened application runtime requires schema + signed helper access; this
    # differs deliberately from faithful/restored original where app policy is absent.
    expected_helpers[0]='apex_app_runtime|signed_school_allowed|1'
    expected_helpers[1]='apex_app_runtime|signed_tenant_key_allowed|1'
    schema=query("""SELECT has_schema_privilege('apex_app_runtime','core_security','USAGE')::int
       ||'|'||has_schema_privilege('assps_marks_signed_runtime','core_security','USAGE')::int""")
    paper=query("""SELECT count(*) FILTER(WHERE
       has_table_privilege('apex_app_runtime',c.oid,'SELECT')
       OR has_table_privilege('apex_app_runtime',c.oid,'INSERT')
       OR has_table_privilege('assps_marks_signed_runtime',c.oid,'SELECT')
       OR has_table_privilege('assps_marks_signed_runtime',c.oid,'INSERT'))
       FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
       WHERE n.nspname='public' AND c.relname IN ('paper_documents','paper_revisions')""")
    # Prevent a false PASS on empty fixtures: require all eight Core-owned
    # families to have nonempty synthetic/restored baselines before denial.
    nonempty_counts=query('SELECT '+"||'|'||".join(
        f'(SELECT count(*) FROM public.{table})' for table in PROTECTED_NONEMPTY_FAMILIES))
    nonempty=(len(nonempty_counts)==1 and len(nonempty_counts[0].split('|'))==len(PROTECTED_NONEMPTY_FAMILIES)
              and all(int(x)>0 for x in nonempty_counts[0].split('|')))
    denied={}
    family_denied={}
    for role in SAFE_ROLES:
        response=query("BEGIN TRANSACTION READ ONLY; SET LOCAL ROLE "+role+"; "
          "SELECT 'unsigned'||'|'||count(*) FROM public.students; "
          "SELECT set_config('app.rls_enabled','true',true), "
            "set_config('app.tenant_id','1',true), "
            "set_config('app.tenant_key','assps',true), "
            "set_config('app.is_super_admin','true',true); "
          "SELECT 'forged'||'|'||count(*) FROM public.students; ROLLBACK;")
        denied[role]=('unsigned|0' in response and 'forged|0' in response and
                      response.count('ROLLBACK')==1)
        # Separately test actual non-empty financial, academic, attendance,
        # user and roster tables with manipulated unsigned privileged flags.
        family_sql=('BEGIN TRANSACTION READ ONLY; SET LOCAL ROLE '+role+'; '
           "SELECT set_config('app.rls_enabled','true',true),"
           "set_config('app.tenant_id','1',true),"
           "set_config('app.tenant_key','assps',true),"
           "set_config('app.is_super_admin','true',true); "+
           ' '.join(f"SELECT '{name}'||'|'||count(*) FROM public.{name};"
                    for name in PROTECTED_NONEMPTY_FAMILIES)+' ROLLBACK;')
        rows=query(family_sql)
        family_denied[role]=(rows.count('ROLLBACK')==1 and
            all(name+'|0' in rows for name in PROTECTED_NONEMPTY_FAMILIES))
    return dict(nonempty_core_families=nonempty,
      forged_denied_eight_app=family_denied[SAFE_ROLES[0]],
      forged_denied_eight_marks=family_denied[SAFE_ROLES[1]],
      database_public_access_revoked=public_blocked,roles_safe=safe,rls_policy_count=n,signed_dual_with_check=dual,
      signed_school_count=schools,signed_tenant_key_count=tenant,
      core_tables=total,core_app_crud=app,core_marks_crud=marks,
      sequence_reference_exact=sequence_matches,sequence_count=len(sequences),
      signed_helpers_limited=helper_rows==expected_helpers,
      signing_schema_both_accessible=schema==['1|1'],
      protected_paper_grant_count=int(paper[0]),
      unsigned_denied_app=denied[SAFE_ROLES[0]],
      unsigned_denied_marks=denied[SAFE_ROLES[1]])


def evaluate(f):
    expected=dict(nonempty_core_families=True,forged_denied_eight_app=True,
        forged_denied_eight_marks=True,database_public_access_revoked=True,roles_safe=True,rls_policy_count=77,signed_dual_with_check=77,
       signed_school_count=73,signed_tenant_key_count=4,
       core_tables=75,core_app_crud=75,core_marks_crud=75,
       sequence_reference_exact=True,sequence_count=78,
       signed_helpers_limited=True,signing_schema_both_accessible=True,
       protected_paper_grant_count=0,
       unsigned_denied_app=True,unsigned_denied_marks=True)
    issues=[k+'_mismatch' for k,v in expected.items() if f.get(k)!=v]
    return {'status':'PASS_ISOLATED_HARDENED_CANDIDATE_ONLY' if not issues else 'HOLD',
            'issues':issues,'production_unchanged':True,
            'authenticated_login_accepted':False,'production_release_certified':False}


def main():
    try:facts=inspect();result=evaluate(facts)
    except (OSError,ValueError,RuntimeError,subprocess.TimeoutExpired,KeyError) as ex:
        facts={};result={'status':'HOLD','issues':['verification_error:'+type(ex).__name__],
                         'production_unchanged':True,'production_release_certified':False}
    print(json.dumps({'target':DB,'facts':facts,**result},sort_keys=True))
    return 0 if result['status']=='PASS_ISOLATED_HARDENED_CANDIDATE_ONLY' else 2
if __name__=='__main__':sys.exit(main())
