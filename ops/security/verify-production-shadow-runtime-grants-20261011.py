#!/usr/bin/env python3
"""Read-only production/shadow app runtime privilege parity; no school rows read."""
import subprocess,sys
PROD=('5432','apexos')
SHADOW=('55432','assps_core_signed_migration_rehearsal_20261010')
TABLE_QUERY="""SELECT c.relname||'|'||
has_table_privilege('apex_app_runtime',c.oid,'SELECT')::int||
has_table_privilege('apex_app_runtime',c.oid,'INSERT')::int||
has_table_privilege('apex_app_runtime',c.oid,'UPDATE')::int||
has_table_privilege('apex_app_runtime',c.oid,'DELETE')::int
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='r' AND c.relforcerowsecurity
ORDER BY c.relname"""
SEQ_QUERY="""SELECT c.relname||'|'||
has_sequence_privilege('apex_app_runtime',c.oid,'USAGE')::int||
has_sequence_privilege('apex_app_runtime',c.oid,'SELECT')::int||
has_sequence_privilege('apex_app_runtime',c.oid,'UPDATE')::int
FROM pg_class c WHERE c.relkind='S' AND c.relnamespace='public'::regnamespace
ORDER BY c.relname"""
def run(db,query):
    port,name=db
    p=subprocess.run(['runuser','-u','postgres','--','psql','-X','-A','-t','-v','ON_ERROR_STOP=1',
                      '-p',port,'-d',name,'-c',query],capture_output=True,text=True,timeout=12)
    if p.returncode:raise RuntimeError('Read-only privilege query failed')
    return p.stdout.strip().splitlines()
def main():
    for title,query,size in [('TABLE',TABLE_QUERY,77),('SEQUENCE',SEQ_QUERY,77)]:
        prod,shadow=run(PROD,query),run(SHADOW,query)
        if len(prod)!=size or prod!=shadow:
            raise RuntimeError(title+' privilege mismatch with production baseline')
        print('ASSPS_SHADOW_RUNTIME_'+title+'_PERMISSION_PARITY_PASS '+str(size)+'/'+str(size))
    t=run(PROD,TABLE_QUERY)
    if sum(x.endswith('|1111') for x in t)!=75 or        sorted(x.split('|')[0] for x in t if x.endswith('|0000'))!=['paper_documents','paper_revisions']:
        raise RuntimeError('Production protected Paper table privilege exceptions changed')
    s=run(PROD,SEQ_QUERY)
    if sum(x.endswith('|111') for x in s)!=73 or sum(x.endswith('|000') for x in s)!=4:
        raise RuntimeError('Production sequence privilege classifications changed')
    print('ASSPS_RUNTIME_GRANT_EXCEPTIONS_PASS table_75full_2paperrestricted sequence_73full_4restricted')
if __name__=='__main__':
    try: main()
    except Exception as exc:
        print('ASSPS_SHADOW_RUNTIME_GRANTS_NO_GO '+str(exc),file=sys.stderr)
        sys.exit(2)
