#!/usr/bin/env python3
"""READ-ONLY: 77 table structures, 212 production legacy policies, 77 extra signed shadow policies.
No credentials or private school rows retrieved, no SQL DDL issued.
"""
import subprocess, sys, hashlib

PROD=('5432','apexos')
SHADOW=('55432','assps_core_signed_migration_rehearsal_20261010')
TABLE_SQL="""SELECT c.relname || '|' || string_agg(a.attname || ':' || format_type(a.atttypid,a.atttypmod) || ':' || a.attnotnull::text, ',' ORDER BY a.attnum)
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
WHERE n.nspname='public' AND c.relkind='r' AND c.relforcerowsecurity
GROUP BY c.relname ORDER BY c.relname"""
POLICY_SQL="""SELECT schemaname||'.'||tablename||'|'||policyname||'|'||permissive||'|'||cmd||'|'||array_to_string(roles,',')||'|'||coalesce(qual,'')||'|'||coalesce(with_check,'')
FROM pg_policies WHERE schemaname='public' AND policyname <> 'core_signed_tenant_guard' ORDER BY 1"""
SCHEMA_SQL="""SELECT current_database()||'|'||current_setting('port')||'|'||current_user"""
SIGNED_SQL="""SELECT COUNT(*) FROM pg_policies WHERE schemaname='public' AND policyname='core_signed_tenant_guard'"""
def query(db, statement):
    port,name=db
    p=subprocess.run(['runuser','-u','postgres','--','psql','-X','-A','-t','-v','ON_ERROR_STOP=1','-p',port,'-d',name,'-c',statement],
                     capture_output=True,text=True,timeout=16)
    if p.returncode: raise RuntimeError('Read-only PostgreSQL catalog query unavailable')
    return p.stdout.strip().splitlines()
def main():
    for db in (PROD,SHADOW):
        if query(db,SCHEMA_SQL)!=[db[1]+'|'+db[0]+'|postgres']:
            raise RuntimeError('Database identity/port mismatch')
    a,b=query(PROD,TABLE_SQL),query(SHADOW,TABLE_SQL)
    if len(a)!=77 or a!=b: raise RuntimeError('Protected public table structure differs from production')
    p,q=query(PROD,POLICY_SQL),query(SHADOW,POLICY_SQL)
    if len(p)!=212 or p!=q: raise RuntimeError('Original permissive/restrictive policy SQL differs from production')
    if query(PROD,SIGNED_SQL)!=['0'] or query(SHADOW,SIGNED_SQL)!=['77']:
        raise RuntimeError('Signed policy boundaries not isolated as expected')
    digest=hashlib.sha256(('\n'.join(p)).encode()).hexdigest()[:16]
    print('ASSPS_PROD_SHADOW_SCOPED_SCHEMA_PARITY_PASS protected_tables=77 legacy_policies_exact=212')
    print('ASSPS_PROD_UNMODIFIED_SIGNED_GUARDS=0 SHADOW_SIGNED_GUARDS=77')
    print('POLICY_SIGNATURE_SHA256_PREFIX='+digest)
if __name__=='__main__':
    try:main()
    except Exception as exc:
        print('ASSPS_PROD_SHADOW_SCHEMA_PARITY_NO_GO '+str(exc),file=sys.stderr)
        sys.exit(2)
