#!/usr/bin/env python3
"""Restore *restricted* Core grants to an isolated recovery clone only.

Safe development rehearsal, never on live5432. Do not provision or copy
production BYPASSRLS roles, login credentials, student content or secrets.
Reconciles 75 non-Paper Core CRUD tables, 78 public sequences, and restricted
Core signing function ACLs using an exact captured metadata-only snapshot.
"""
import argparse
import json
from pathlib import Path
import re
import subprocess
import sys

HERE=Path(__file__).resolve().parent
REF=HERE/'assps-core-restore-sequence-acl-reference-20261012.json'
CLONE_DB='assps_core_restore_verified_20261012'
PROD_DB='apexos'
PROD_PORT='5432'
CLONE_PORT='55432'
IDENT=re.compile(r'[a-z_][a-z0-9_]*\Z')
ROLE_APP='apex_app_runtime'
ROLE_MARKS='assps_marks_signed_runtime'
ROLE_NAMES=(ROLE_APP,ROLE_MARKS)


def sql(port,db,statement):
    p=subprocess.run(['runuser','-u','postgres','--','psql','-X','-At',
       '-v','ON_ERROR_STOP=1','-p',port,'-d',db,'-c',statement],
       text=True,capture_output=True,timeout=18)
    if p.returncode:raise RuntimeError('Required PostgreSQL catalog read failed')
    return p.stdout.strip().splitlines()


def seqrows(port,db):
    stmt="""SELECT c.relname,
      has_sequence_privilege('apex_app_runtime',c.oid,'USAGE')::int,
      has_sequence_privilege('apex_app_runtime',c.oid,'SELECT')::int,
      has_sequence_privilege('assps_marks_signed_runtime',c.oid,'USAGE')::int,
      has_sequence_privilege('assps_marks_signed_runtime',c.oid,'SELECT')::int
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind='S' ORDER BY c.relname"""
    rows=[]
    for line in sql(port,db,stmt):
        cols=line.split('|')
        if len(cols)!=5 or not IDENT.fullmatch(cols[0]) or any(x not in ('0','1') for x in cols[1:]):
            raise RuntimeError('Unexpected sequence ACL metadata')
        rows.append(dict(zip(('sequence','app_usage','app_read','marks_usage','marks_read'),
                             [cols[0],*(v=='1' for v in cols[1:])])))
    return rows


def scope(port,db):
    stmt="""SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind='r' AND c.relforcerowsecurity
       AND c.relname NOT IN ('student_class_movement_audit','paper_documents','paper_revisions')
      ORDER BY c.relname"""
    names=sql(port,db,stmt)
    if len(names)!=75 or any(not IDENT.fullmatch(n) for n in names):
        raise RuntimeError('Expected exactly 75 protected, non-Paper Core relations')
    return names


def preflight():
    if sql(CLONE_PORT,CLONE_DB,"SELECT current_database()||'|'||current_setting('port')")!=[CLONE_DB+'|55432']:
        raise RuntimeError('Refusing non-isolated PostgreSQL target')
    if sql(PROD_PORT,PROD_DB,"SELECT current_database()||'|'||current_setting('port')")!=[PROD_DB+'|5432']:
        raise RuntimeError('Source database identity changed')
    state=sql(CLONE_PORT,'postgres',"""SELECT rolname||'|'||rolcanlogin::int||'|'||
      rolbypassrls::int||'|'||rolsuper::int FROM pg_roles
      WHERE rolname IN ('apex_app_runtime','assps_marks_signed_runtime') ORDER BY rolname""")
    if state!=['apex_app_runtime|0|0|0','assps_marks_signed_runtime|0|0|0']:
        raise RuntimeError('Non-BYPASS, non-login runtime roles not proven')
    policy=sql(CLONE_PORT,CLONE_DB,"""SELECT count(*) FROM pg_policies
      WHERE schemaname='public' AND policyname='core_signed_tenant_guard'
      AND permissive='RESTRICTIVE' AND 'assps_marks_signed_runtime'=ANY(roles)
      AND NOT 'apex_app_runtime'=ANY(roles)""")
    if policy!=['77']:
        raise RuntimeError('This recovery target must have exactly the original Marks-only 77 restrictive guards')
    if scope(PROD_PORT,PROD_DB)!=scope(CLONE_PORT,CLONE_DB):
        raise RuntimeError('Protected Core table catalog differs from source')
    source_rows=seqrows(PROD_PORT,PROD_DB)
    snapshot=json.loads(REF.read_text())
    if snapshot.get('source_db')!=PROD_DB or snapshot.get('source_port')!=5432 or snapshot.get('safe_test_clone')!=CLONE_DB:
        raise RuntimeError('Frozen grant manifest target mismatch')
    if snapshot.get('references')!=source_rows or len(source_rows)!=78:
        raise RuntimeError('Production sequence permissions differ from approved reference')
    if sorted(r['sequence'] for r in source_rows)!=sorted(r['sequence'] for r in seqrows(CLONE_PORT,CLONE_DB)):
        raise RuntimeError('Restore sequence identifiers differ from verified production')
    table_sql="""WITH r AS (SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind='r' AND c.relforcerowsecurity
      AND c.relname NOT IN ('student_class_movement_audit','paper_documents','paper_revisions'))
      SELECT count(*) FILTER(WHERE has_table_privilege('apex_app_runtime',oid,'SELECT')
        AND has_table_privilege('apex_app_runtime',oid,'INSERT')
        AND has_table_privilege('apex_app_runtime',oid,'UPDATE')
        AND has_table_privilege('apex_app_runtime',oid,'DELETE'))||'|'||
      count(*) FILTER(WHERE has_table_privilege('assps_marks_signed_runtime',oid,'SELECT')
        AND has_table_privilege('assps_marks_signed_runtime',oid,'INSERT')
        AND has_table_privilege('assps_marks_signed_runtime',oid,'UPDATE')
        AND has_table_privilege('assps_marks_signed_runtime',oid,'DELETE')) FROM r"""
    if sql(PROD_PORT,PROD_DB,table_sql)!=['75|75']:
        raise RuntimeError('Source restricted role grant totals unexpected')
    if sql(CLONE_PORT,CLONE_DB,table_sql)!=['0|0']:
        raise RuntimeError('Restore not in expected pre-reconciliation ACL state')
    return source_rows,scope(CLONE_PORT,CLONE_DB)


def build_sql(sequence_rows,table_names):
    sql_lines=['BEGIN;',
       "DO $guard$ BEGIN IF current_database()<>'assps_core_restore_verified_20261012'",
       "  OR current_setting('port')<>'55432' OR current_user<>'postgres'",
       "  THEN RAISE EXCEPTION 'REFUSING_OUTSIDE_PRIVATE_RECOVERY_CLONE'; END IF;",
       "  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN ('apex_app_runtime','assps_marks_signed_runtime')",
       "  AND (rolcanlogin OR rolbypassrls OR rolsuper)) THEN RAISE EXCEPTION 'UNSAFE_ROLE'; END IF;",
       'END $guard$;',
       'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE '+', '.join('public.'+name for name in table_names)+
           ' TO apex_app_runtime, assps_marks_signed_runtime;',
       'GRANT USAGE ON SCHEMA core_security TO assps_marks_signed_runtime;',
       'REVOKE EXECUTE ON FUNCTION core_security.signed_school_allowed(integer), '+
           'core_security.signed_tenant_key_allowed(text), core_security.valid_signed_context() FROM PUBLIC;',
       'REVOKE EXECUTE ON FUNCTION core_security.signed_school_allowed(integer), '+
           'core_security.signed_tenant_key_allowed(text), core_security.valid_signed_context() FROM apex_app_runtime, assps_marks_signed_runtime;',
       'GRANT EXECUTE ON FUNCTION core_security.signed_school_allowed(integer), '+
           'core_security.signed_tenant_key_allowed(text) TO assps_marks_signed_runtime;']
    for row in sequence_rows:
        for prefix,role in [('app',ROLE_APP),('marks',ROLE_MARKS)]:
            rights=[action for key,action in [('usage','USAGE'),('read','SELECT')] if row[prefix+'_'+key]]
            if rights:sql_lines.append('GRANT '+', '.join(rights)+' ON SEQUENCE public.'+row['sequence']+' TO '+role+';')
    sql_lines.append('COMMIT;')
    return '\n'.join(sql_lines)+'\n'


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply-clone-only',action='store_true')
    args=parser.parse_args()
    try:
        sequences,tables=preflight()
        migration=build_sql(sequences,tables)
        if not args.apply_clone_only:
            print(json.dumps({'status':'PASS_PREFLIGHT_ONLY','target':CLONE_DB,
                 'core_tables':len(tables),'sequence_entries':len(sequences),
                 'contains_school_rows':False,'production_writes':False,
                 'apply_requested':False},sort_keys=True))
            return 0
        cmd=['runuser','-u','postgres','--','psql','-X','-v','ON_ERROR_STOP=1',
             '-p',CLONE_PORT,'-d',CLONE_DB]
        p=subprocess.run(cmd,input=migration,capture_output=True,text=True,timeout=30)
        if p.returncode:raise RuntimeError('Transactional clone-only grant reconciliation failed')
        print(json.dumps({'status':'APPLIED_ISOLATED_CLONE_GRANTS_ONLY','target':CLONE_DB,
             'core_tables':len(tables),'sequence_entries':len(sequences),
             'production_writes':False},sort_keys=True))
        return 0
    except (OSError,ValueError,RuntimeError,subprocess.TimeoutExpired) as err:
        print(json.dumps({'status':'HOLD','issue':type(err).__name__,
             'production_writes':False},sort_keys=True),file=sys.stderr)
        return 2
if __name__=='__main__':sys.exit(main())
