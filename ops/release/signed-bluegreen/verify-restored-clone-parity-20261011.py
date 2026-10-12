#!/usr/bin/env python3
"""Read-only production-versus-restore exact policy/table parity; no school data."""
import hashlib
import subprocess
import sys

LIVE=('5432','apexos')
CLONE=('55432','assps_backup_restore_check_20261011')
TABLES="""SELECT c.relname||'|'||string_agg(a.attname||':'||format_type(a.atttypid,a.atttypmod)||':'||a.attnotnull::text,',' ORDER BY a.attnum)
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a
 ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
WHERE n.nspname='public' AND c.relkind='r' AND c.relforcerowsecurity AND c.relname<>'student_class_movement_audit'
GROUP BY c.relname ORDER BY c.relname"""
POLICIES="""SELECT schemaname||'.'||tablename||'|'||policyname||'|'||permissive||'|'||cmd||'|'||
array_to_string(roles,',')||'|'||coalesce(qual,'')||'|'||coalesce(with_check,'')
FROM pg_policies WHERE schemaname='public' AND policyname NOT IN
('core_signed_tenant_guard','core_signed_tenant_allow','assps_audit_tenant_allow','assps_audit_tenant_guard') ORDER BY 1"""

def read(target,statement):
    port,name=target
    p=subprocess.run(['runuser','-u','postgres','--','psql','-X','-A','-t',
        '-v','ON_ERROR_STOP=1','-p',port,'-d',name,'-c',statement],
        capture_output=True,text=True,timeout=22)
    if p.returncode:raise RuntimeError('read-only catalog unavailable: '+name)
    return p.stdout.strip().splitlines()

def assert_restore_security_baseline(read_func, clone):
    """A database restore cannot remove cluster-global PostgreSQL roles.

    Validate absence of database-local V2 artifacts separately from the safety
    of roles already present in a shared disposable restore *cluster*.
    """
    no_local_v2="""SELECT (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND policyname IN
    ('core_signed_tenant_guard','core_signed_tenant_allow'))::text||'|'||
    (SELECT count(*) FROM pg_namespace WHERE nspname='core_security')::text"""
    if read_func(clone,no_local_v2)!=['0|0']:
        raise RuntimeError('restored database contains V2-local policies or schema')
    print('RESTORED_CLONE_V2_DATABASE_LOCAL_BASELINE_EMPTY_PASS')
    unsafe_global_roles="""SELECT count(*) FROM pg_roles WHERE rolname IN
    ('assps_marks_signed_runtime','assps_marks_signed_login')
    AND (rolbypassrls OR rolsuper OR (rolname='assps_marks_signed_runtime' AND rolcanlogin))"""
    if read_func(clone,unsafe_global_roles)!=['0']:
        raise RuntimeError('shared restore cluster has unsafe signed role')
    print('RESTORED_CLONE_SHARED_CLUSTER_GLOBAL_SIGNED_ROLES_SAFE_PASS')


def main():
    for target in (LIVE,CLONE):
        if read(target,"SELECT current_database()||'|'||current_setting('port')||'|'||current_user")!=[target[1]+'|'+target[0]+'|postgres']:
            raise RuntimeError('Database identity/operator mismatch')
    original,restored=read(LIVE,TABLES),read(CLONE,TABLES)
    if len(original)!=77 or original!=restored:
        raise RuntimeError('protected table structure drift')
    print('RESTORED_CLONE_77_PROTECTED_TABLE_STRUCTURES_MATCH_PASS')
    original,restored=read(LIVE,POLICIES),read(CLONE,POLICIES)
    if len(original)!=212 or original!=restored:
        raise RuntimeError('212 original RLS policies differ')
    print('RESTORED_CLONE_212_LEGACY_POLICIES_EXACT_MATCH_PASS')
    assert_restore_security_baseline(read, CLONE)
    print('POLICY_SIGNATURE_SHA256='+hashlib.sha256('\n'.join(original).encode()).hexdigest()[:16])
    print('READ_ONLY_NO_PRODUCTION_MUTATIONS')

if __name__=='__main__':
    try:main()
    except Exception as error:
        print('RESTORED_CLONE_PARITY_NO_GO '+str(error),file=sys.stderr)
        sys.exit(2)
