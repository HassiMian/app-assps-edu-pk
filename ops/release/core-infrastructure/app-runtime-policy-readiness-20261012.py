#!/usr/bin/env python3
"""Read-only production/clone gate: app runtime must have signed restrictive guards."""
import argparse
import json
import subprocess
import sys

TABLES=('students','attendance','fee_challans','employees')
DATABASES={'production':('5432','apexos'),'clone':('55432','assps_gate_sec_restore_test_20261012')}

def classify(rows):
    by_table={name:[] for name in TABLES}
    for record in rows:
        table,name,permissive,roles,qual=record
        if table in by_table and 'apex_app_runtime' in roles:
            by_table[table].append((name,permissive,qual))
    issues=[]
    for table,policies in by_table.items():
        if not any(mode=='RESTRICTIVE' and 'core_security.signed_school_allowed' in predicate for _,mode,predicate in policies):
            issues.append(table+':missing_signed_restrictive_guard')
    return {'status':'PASS' if not issues else 'HOLD','issues':issues,'tables_checked':len(TABLES), 'read_only':True}

def probe(target):
    port,db=DATABASES[target]
    sql="SELECT tablename,policyname,permissive,array_to_string(roles,','),coalesce(qual,'') FROM pg_policies WHERE schemaname='public' AND tablename IN ('students','attendance','fee_challans','employees') ORDER BY tablename,policyname"
    cmd=['runuser','-u','postgres','--','psql','-X','-t','-A','-F','|','-v','ON_ERROR_STOP=1','-p',port,'-d',db,'-c',sql]
    proc=subprocess.run(cmd,capture_output=True,text=True,timeout=15)
    if proc.returncode:raise RuntimeError('Read-only policy catalog unavailable')
    rows=[]
    for line in proc.stdout.strip().splitlines():
        fields=line.split('|',4)
        if len(fields)!=5:raise RuntimeError('Unexpected policy catalog output')
        rows.append(fields)
    return classify(rows)

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database',choices=DATABASES,default='clone')
    args=parser.parse_args()
    try:results=probe(args.database)
    except Exception as exc:results={'status':'HOLD','issues':['inspection_unavailable:'+type(exc).__name__]}
    print(json.dumps({'database':args.database,**results},sort_keys=True))
    return 0 if results['status']=='PASS' else 2

if __name__=='__main__':sys.exit(main())
