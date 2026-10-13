#!/usr/bin/env python3
"""READ-ONLY exact archive ACL/owner recovery attestation on isolated QA.

Compares every base-table/sequence ACL, function ACL, schema ACL and DEFAULT
ACL (canonical order), plus global role and object ownership. No school rows,
source secrets, mutations, production privilege escalation or LOGIN tests.
"""
import json
import re
import subprocess
import sys

SOURCE=('5432','apexos')
TARGET=('55432','assps_core_acl_replay_qa_20261013')
OWNER='apexos_user'
PAPER='apex_paper_owner'
FAMILIES=('relation_acl','function_acl','schema_acl','default_acl')
EXPECTED_COUNTS={'legacy_public_tables':80,'legacy_migration_tables':11,
 'legacy_public_sequences':72,'legacy_public_indexes':275,
 'legacy_toast_tables':74,'legacy_toast_indexes':74,
 'legacy_functions':6,'legacy_schemas':2,
 'paper_relations':14,'paper_functions':3,'rls_policies':368,
 'exam_result_rows':2}

def run(target,sql):
    port,db=target
    p=subprocess.run(['runuser','-u','postgres','--','psql','-X','-At',
       '-v','ON_ERROR_STOP=1','-p',port,'-d',db,'-c',sql],
       text=True,capture_output=True,timeout=18)
    if p.returncode:raise RuntimeError('Exact owner/ACL catalog query unavailable')
    return [x.strip() for x in p.stdout.strip().splitlines() if x.strip()]

CATALOG_SQL="""
SELECT 'relation_acl|'||md5(string_agg(n.nspname||'.'||c.relname||'|'||c.relkind::text||'|'||
 coalesce((SELECT string_agg(a::text,',' ORDER BY a::text) FROM unnest(c.relacl)a),'NULL'),
 E'\\n' ORDER BY n.nspname,c.relname,c.relkind::text))
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname IN ('public','migration_backups') AND c.relkind IN ('r','S');
SELECT 'function_acl|'||md5(string_agg(n.nspname||'.'||p.proname||'|'||
 coalesce((SELECT string_agg(a::text,',' ORDER BY a::text) FROM unnest(p.proacl)a),'NULL'),
 E'\\n' ORDER BY n.nspname,p.proname))
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public';
SELECT 'schema_acl|'||md5(string_agg(n.nspname||'|'||
 coalesce((SELECT string_agg(a::text,',' ORDER BY a::text) FROM unnest(n.nspacl)a),'NULL'),
 E'\\n' ORDER BY n.nspname)) FROM pg_namespace n
 WHERE n.nspname IN ('public','migration_backups','core_security');
SELECT 'default_acl|'||md5(string_agg(r.rolname||'|'||COALESCE(n.nspname,'')||'|'||
 a.defaclobjtype::text||'|'||
 coalesce((SELECT string_agg(x::text,',' ORDER BY x::text) FROM unnest(a.defaclacl)x),'NULL'),
 E'\\n' ORDER BY r.rolname,n.nspname,a.defaclobjtype::text))
 FROM pg_default_acl a JOIN pg_roles r ON r.oid=a.defaclrole
 LEFT JOIN pg_namespace n ON n.oid=a.defaclnamespace;
"""

def snapshot(target):
    port,db=target
    if run(target,"SELECT current_database()||'|'||current_setting('port')")!=[db+'|'+port]:
        raise RuntimeError('Unexpected production or isolated clone identity')
    items={}
    for line in run(target,CATALOG_SQL):
        key,digest=line.split('|')
        if key not in FAMILIES or not re.fullmatch(r'[0-9a-f]{32}',digest):
            raise RuntimeError('Invalid ACL canonical digest')
        items[key]=digest
    if set(items)!=set(FAMILIES):raise RuntimeError('Missing ACL family')
    counts_query="""SELECT
    (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND c.relkind='r' AND c.relowner='apexos_user'::regrole),
    (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='migration_backups' AND c.relkind='r' AND c.relowner='apexos_user'::regrole),
    (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND c.relkind='S' AND c.relowner='apexos_user'::regrole),
    (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND c.relkind='i' AND c.relowner='apexos_user'::regrole),
    (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='pg_toast' AND c.relkind='t' AND c.relowner='apexos_user'::regrole),
    (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='pg_toast' AND c.relkind='i' AND c.relowner='apexos_user'::regrole),
    (SELECT count(*) FROM pg_proc WHERE proowner='apexos_user'::regrole),
    (SELECT count(*) FROM pg_namespace WHERE nspowner='apexos_user'::regrole
     AND nspname IN ('public','migration_backups')),
    (SELECT count(*) FROM pg_class WHERE relowner='apex_paper_owner'::regrole),
    (SELECT count(*) FROM pg_proc WHERE proowner='apex_paper_owner'::regrole),
    (SELECT count(*) FROM pg_policies),
    (SELECT count(*) FROM public.exam_results)
    """
    rows=run(target,counts_query)
    if len(rows)!=1:raise RuntimeError('Invalid object-owner snapshot')
    numbers=rows[0].split('|')
    if len(numbers)!=len(EXPECTED_COUNTS):raise RuntimeError('Invalid object-owner dimensions')
    owners=dict(zip(EXPECTED_COUNTS,map(int,numbers)))
    dbrole=run(target,"""SELECT r.rolname FROM pg_database d JOIN pg_roles r
      ON r.oid=d.datdba WHERE d.datname=current_database()""")
    role_state=run(target,"""SELECT rolname||'|'||rolcanlogin::int||'|'||
      rolbypassrls::int||'|'||rolsuper::int FROM pg_roles
      WHERE rolname IN ('apexos_user','apex_paper_owner') ORDER BY rolname""")
    return {'acl_digests':items,'ownership_counts':owners,
            'database_owner':dbrole[0],'global_owner_roles':role_state}


def evaluate(original,recovery):
    issues=[]
    for family in FAMILIES:
        if original.get('acl_digests',{}).get(family)!=recovery.get('acl_digests',{}).get(family):
            issues.append('ACL_FAMILY_MISMATCH:'+family)
    for field,expected in EXPECTED_COUNTS.items():
        if original.get('ownership_counts',{}).get(field)!=expected:
            issues.append('SOURCE_OBJECT_DRIFT:'+field)
        if recovery.get('ownership_counts',{}).get(field)!=expected:
            issues.append('RECOVERY_OBJECT_DRIFT:'+field)
    if original.get('database_owner')!=OWNER or recovery.get('database_owner')!=OWNER:
        issues.append('DATABASE_OWNER_INCONSISTENT')
    if original.get('global_owner_roles')!=[
      'apex_paper_owner|0|0|0','apexos_user|1|1|0']:
        issues.append('SOURCE_GLOBAL_ROLE_REFERENCE_DRIFT')
    if recovery.get('global_owner_roles')!=[
      'apex_paper_owner|0|0|0','apexos_user|0|0|0']:
        issues.append('RECOVERY_GLOBALS_MUST_REMAIN_NOLOGIN_NOBYPASS')
    return {'status':'PASS_PRIVATE_ACL_OWNER_RECOVERY_ONLY' if not issues else 'HOLD',
        'issues':issues,'read_only':True,
        'privileged_legacy_login_recreated':False,
        'paper_owner_independent_acceptance_required':True,
        'authentic_staff_http_acceptance':False,
        'live_cutover_certified':False}

def main():
    try:
        original=snapshot(SOURCE)
        recovery=snapshot(TARGET)
        result=evaluate(original,recovery)
    except (OSError,RuntimeError,ValueError,KeyError,subprocess.TimeoutExpired,IndexError) as exc:
        original={};recovery={}
        result={'status':'HOLD','issues':['CATALOG_INSPECTION_'+type(exc).__name__],
                'read_only':True,'live_cutover_certified':False}
    print(json.dumps({'source_acls':original.get('acl_digests',{}),
         'recovered_acls':recovery.get('acl_digests',{}),
         'object_counts':recovery.get('ownership_counts',{}),**result},sort_keys=True))
    return 0 if result['status']=='PASS_PRIVATE_ACL_OWNER_RECOVERY_ONLY' else 2
if __name__=='__main__':sys.exit(main())
