#!/usr/bin/env python3
"""Reconcile archived legacy OBJECT OWNERS on isolated PG55432 only.

Never creates/reuses production credentials, LOGIN/BYPASSRLS or privileged
membership. Target legacy owner is an existing NOLOGIN/NOBYPASS placeholder;
source PG5432 is used READ ONLY for exact object-type inventory.
"""
import argparse
import json
import re
import subprocess
import sys

SOURCE=('5432','apexos')
TARGET=('55432','assps_core_acl_replay_qa_20261013')
SCHEMAS=('migration_backups','public')
OWNER='apexos_user'
IDENT=re.compile(r'[a-z_][a-z0-9_]*\Z')
EXPECTED_TABLES=91
EXPECTED_SEQUENCES=72
EXPECTED_FUNCTIONS=6

def query(target,statement):
    port,db=target
    p=subprocess.run(['runuser','-u','postgres','--','psql','-X','-At',
       '-v','ON_ERROR_STOP=1','-p',port,'-d',db,'-c',statement],
       capture_output=True,text=True,timeout=20)
    if p.returncode:raise RuntimeError('Required PostgreSQL metadata unavailable')
    return [line for line in p.stdout.strip().splitlines() if line]

def metadata(target):
    port,db=target
    if query(target,"SELECT current_database()||'|'||current_setting('port')")!=[db+'|'+port]:
        raise RuntimeError('Unexpected database target identity')
    relations=query(target,"""SELECT n.nspname||'|'||c.relname||'|'||
      c.relkind::text||'|'||r.rolname FROM pg_class c
      JOIN pg_namespace n ON n.oid=c.relnamespace
      JOIN pg_roles r ON c.relowner=r.oid
      WHERE n.nspname IN ('public','migration_backups')
       AND c.relkind IN ('r','S') ORDER BY n.nspname,c.relname""")
    entries={}
    for line in relations:
        parts=line.split('|')
        if len(parts)!=4 or any(not IDENT.fullmatch(x) for x in (parts[0],parts[1])):
            raise RuntimeError('Invalid object identifier in catalog')
        key=(parts[0],parts[1],parts[2])
        if key in entries:raise RuntimeError('Duplicate relation metadata')
        entries[key]=parts[3]
    functions=query(target,"""SELECT n.nspname||'|'||p.proname||'|'||
      pg_get_function_identity_arguments(p.oid)||'|'||r.rolname FROM pg_proc p
      JOIN pg_namespace n ON n.oid=p.pronamespace
      JOIN pg_roles r ON r.oid=p.proowner
      WHERE n.nspname='public' AND p.proname IN (
       'guard_print_job_binding_mutation','reject_assessment_immutable_mutation',
       'reject_assessment_result_revision_mutation',
       'reject_curriculum_immutable_mutation','reject_question_revision_mutation',
       'reject_roster_snapshot_mutation') ORDER BY p.proname""")
    funcs={}
    for line in functions:
        parts=line.split('|')
        if len(parts)!=4 or parts[0]!='public' or not IDENT.fullmatch(parts[1]) or parts[2]!='':
            raise RuntimeError('Unexpected signed Core owner function signature')
        funcs[parts[1]]=parts[3]
    schemas=query(target,"""SELECT n.nspname||'|'||r.rolname FROM pg_namespace n
      JOIN pg_roles r ON r.oid=n.nspowner
      WHERE n.nspname IN ('public','migration_backups') ORDER BY n.nspname""")
    dbowner=query(target,"SELECT r.rolname FROM pg_database d JOIN pg_roles r ON r.oid=d.datdba WHERE d.datname=current_database()")
    return entries,funcs,dict(s.split('|') for s in schemas),dbowner[0]

def choose(source,target):
    src_rels,src_funcs,src_schemas,src_dbowner=source
    dst_rels,dst_funcs,dst_schemas,dst_dbowner=target
    issues=[]
    if src_rels.keys()!=dst_rels.keys():issues.append('public_and_migration_relation_identifiers_differ')
    if src_funcs.keys()!=dst_funcs.keys():issues.append('core_function_set_differs')
    if src_dbowner!=OWNER:issues.append('production_database_owner_drift')
    owned_tables=sorted(k for k,v in src_rels.items() if v==OWNER and k[2]=='r')
    owned_sequences=sorted(k for k,v in src_rels.items() if v==OWNER and k[2]=='S')
    owned_funcs=sorted(k for k,v in src_funcs.items() if v==OWNER)
    if len(owned_tables)!=EXPECTED_TABLES:issues.append('legacy_table_inventory_drift')
    if len(owned_sequences)!=EXPECTED_SEQUENCES:issues.append('legacy_sequence_inventory_drift')
    if len(owned_funcs)!=EXPECTED_FUNCTIONS:issues.append('legacy_function_inventory_drift')
    if set(src_schemas)!={'migration_backups','public'} or any(v!=OWNER for v in src_schemas.values()):
        issues.append('legacy_schema_owner_source_mismatch')
    for k in owned_tables+owned_sequences:
        if dst_rels.get(k) not in ('postgres','pg_database_owner',OWNER):
            issues.append('nonlegacy_owner_conflict:'+k[1])
    for f in owned_funcs:
        if dst_funcs.get(f) not in ('postgres',OWNER):issues.append('nonlegacy_function_conflict:'+f)
    for schema in SCHEMAS:
        if dst_schemas.get(schema) not in ('postgres','pg_database_owner',OWNER):
            issues.append('schema_owner_conflict:'+schema)
    if dst_dbowner not in ('postgres',OWNER):issues.append('unexpected_target_database_owner')
    return dict(issues=issues,owned_tables=owned_tables,
                owned_sequences=owned_sequences,owned_functions=owned_funcs)

def plan_sql(selection):
    def q(name):
        if not IDENT.fullmatch(name):raise ValueError('Unsafe metadata object identifier')
        return '"'+name+'"'
    out=['BEGIN;',
         "DO $check$ BEGIN IF current_database()<>'assps_core_acl_replay_qa_20261013'",
         "OR current_setting('port')<>'55432' OR current_user<>'postgres'",
         "THEN RAISE EXCEPTION 'REFUSE_NON_ISOLATED_GLOBAL_OWNER_MAPPING'; END IF;",
         "IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='apexos_user'",
         " AND NOT rolcanlogin AND NOT rolbypassrls AND NOT rolsuper AND NOT rolinherit)",
         "THEN RAISE EXCEPTION 'LEGACY_QA_NOLOGIN_OWNER_REQUIRED'; END IF; END $check$;"]
    for schema,name,kind in selection['owned_tables']:
        out.append(f'ALTER TABLE {q(schema)}.{q(name)} OWNER TO apexos_user;')
    for schema,name,kind in selection['owned_sequences']:
        out.append(f'ALTER SEQUENCE {q(schema)}.{q(name)} OWNER TO apexos_user;')
    for func in selection['owned_functions']:
        out.append('ALTER FUNCTION public.'+q(func)+'() OWNER TO apexos_user;')
    for schema in SCHEMAS:
        out.append('ALTER SCHEMA '+q(schema)+' OWNER TO apexos_user;')
    out.append('ALTER DATABASE assps_core_acl_replay_qa_20261013 OWNER TO apexos_user;')
    out.append('COMMIT;')
    return '\n'.join(out)+'\n'

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--apply-qa-only',action='store_true')
    opts=p.parse_args()
    try:
        src=metadata(SOURCE);dst=metadata(TARGET)
        criteria=choose(src,dst)
        if criteria['issues']:raise RuntimeError('Source/clone object reconciliation preflight HOLD')
        role=query(('55432','postgres'),"""SELECT rolname||'|'||rolcanlogin::int||'|'||
          rolbypassrls::int||'|'||rolsuper::int||'|'||rolinherit::int FROM pg_roles
          WHERE rolname='apexos_user'""")
        if role!=['apexos_user|0|0|0|0']:
            raise RuntimeError('Target safe global role not assured')
        if not opts.apply_qa_only:
            print(json.dumps({'status':'PASS_PRIVATE_QA_PREFLIGHT_ONLY',
             'tables':len(criteria['owned_tables']),
             'sequences':len(criteria['owned_sequences']),
             'functions':len(criteria['owned_functions']),
             'schema_count':len(SCHEMAS),'production_db_writes':False},sort_keys=True))
            return 0
        statement=plan_sql(criteria)
        p=subprocess.run(['runuser','-u','postgres','--','psql','-X',
          '-v','ON_ERROR_STOP=1','-p',TARGET[0],'-d',TARGET[1]],
          input=statement,capture_output=True,text=True,timeout=40)
        if p.returncode:raise RuntimeError('Transactional QA object ownership mapping rejected')
        print(json.dumps({'status':'APPLIED_ONLY_DISPOSABLE_QA',
          'tables':len(criteria['owned_tables']),
          'sequences':len(criteria['owned_sequences']),
          'functions':len(criteria['owned_functions']),
          'production_db_writes':False},sort_keys=True))
        return 0
    except (ValueError,OSError,RuntimeError,subprocess.TimeoutExpired,IndexError) as exc:
        print(json.dumps({'status':'HOLD','error_type':type(exc).__name__,
                          'production_db_writes':False},sort_keys=True))
        return 2
if __name__=='__main__':sys.exit(main())
