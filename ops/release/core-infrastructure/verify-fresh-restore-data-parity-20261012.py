#!/usr/bin/env python3
"""Compare production snapshot and isolated real restore by aggregate and RLS digest.

This is a read-only, privacy-preserving RECOVERY verifier. It does not change
production or show student identities. It is NOT a full release/rollback proof.
"""
import json
import subprocess
import sys

SOURCE=('5432','apexos')
RESTORE=('55432','assps_core_restore_verified_20261012')
EXPECTED={'rls_policies':368,'public_tables':88,'force_rls_tables':78}
COUNT_TABLES=('students','attendance','fee_challans','fee_payment_transactions','exam_results')


def psql(port, database, sql):
    command=['runuser','-u','postgres','--','psql','-X','-At','-v','ON_ERROR_STOP=1',
             '-p',port,'-d',database,'-c',sql]
    result=subprocess.run(command, text=True,capture_output=True,timeout=15)
    if result.returncode:raise RuntimeError('Isolated parity query unavailable')
    return result.stdout.strip()


def catalog(port,database):
    expected_db='apexos' if port=='5432' else 'assps_core_restore_verified_20261012'
    identity=psql(port,database,"SELECT current_database()||'|'||current_setting('port')")
    if identity!=f'{expected_db}|{port}': raise RuntimeError('Unexpected PostgreSQL database identity')
    counts_sql="SELECT "+"||'|'||".join(f"(SELECT count(*) FROM public.\"{table}\")" for table in COUNT_TABLES)+"||'|'||"+"||'|'||".join([
      "(SELECT count(*) FROM pg_policies)",
      "(SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r')",
      "(SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND c.relforcerowsecurity)"
    ])
    parts=psql(port,database,counts_sql).split('|')
    if len(parts)!=8:raise RuntimeError('Aggregate count schema drift')
    keys=(*COUNT_TABLES,*EXPECTED)
    facts=dict(zip(keys,map(int,parts)))
    digest_sql="""
      SELECT md5(string_agg(schemaname||'|'||tablename||'|'||policyname||'|'||
       permissive||'|'||cmd||'|'||array_to_string(roles,',')||'|'||
       coalesce(qual,'')||'|'||coalesce(with_check,''), E'\\n'
       ORDER BY schemaname,tablename,policyname)) FROM pg_policies
    """
    digest=psql(port,database,digest_sql)
    if len(digest)!=32 or any(c not in '0123456789abcdef' for c in digest):
        raise RuntimeError('RLS catalogue fingerprint missing')
    facts['policy_digest']=digest
    return facts


def assess(source, restore):
    missing=[]
    for key in (*COUNT_TABLES,*EXPECTED,'policy_digest'):
        if source.get(key)!=restore.get(key):missing.append('mismatch:'+key)
    for key,expected in EXPECTED.items():
        if source.get(key)!=expected or restore.get(key)!=expected:
            missing.append('protected_catalog_expected:'+key)
    for key in ('students','attendance','fee_challans'):
        if not isinstance(source.get(key),int) or source.get(key)<=0:
            missing.append('empty_or_invalid_source:'+key)
    return {'status':'PASS_RESTORE_PARITY_ONLY' if not missing else 'HOLD',
            'issues':missing,'read_only':True,'new_production_writes':False,
            'real_backend_cutover_verified':False,'production_rollback_drill':False}


def main():
    try:
        original=catalog(*SOURCE);restored=catalog(*RESTORE)
        verdict=assess(original,restored)
    except (RuntimeError,ValueError,subprocess.TimeoutExpired,OSError) as error:
        original={};restored={}
        verdict={'status':'HOLD','issues':['inspection_error:'+type(error).__name__],
                 'read_only':True,'real_backend_cutover_verified':False,
                 'production_rollback_drill':False}
    print(json.dumps({'source':original,'restored':restored,**verdict},sort_keys=True))
    return 0 if verdict['status']=='PASS_RESTORE_PARITY_ONLY' else 2
if __name__=='__main__':sys.exit(main())
