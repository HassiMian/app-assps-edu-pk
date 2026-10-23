#!/usr/bin/env python3
"""Read-only negative RLS proof: signed runtime without a signed actor sees NO
School1 or School2 result rows. Does not forge JWT/signature or certify
authorized positive same-school access.
"""
import json,subprocess
SQL="""BEGIN TRANSACTION READ ONLY;
SET LOCAL ROLE assps_marks_signed_runtime;
SELECT 'school1|'||COUNT(*) FROM public.exam_results WHERE school_id=1 AND exam_id=9;
SELECT 'school2|'||COUNT(*) FROM public.exam_results WHERE school_id=2;
ROLLBACK;"""
def inspect(*,runner=None):
    run=runner or subprocess.run
    try:
        p=run(['runuser','-u','postgres','--','psql','-X','-p','5432','-d','apexos',
          '-At','-v','ON_ERROR_STOP=1','-c',SQL],capture_output=True,text=True,timeout=16)
        if p.returncode:return {'pass':False,'read_only':True,'code':'UNSIGNED_ROLE_QUERY_REJECTED'}
        counts={}
        for line in p.stdout.splitlines():
            if '|' not in line:continue
            name,value=line.split('|',1)
            if name not in ('school1','school2') or not value.isdigit() or name in counts:
                return {'pass':False,'read_only':True,'code':'INVALID_QUERY_AGGREGATE'}
            counts[name]=int(value)
        if set(counts)!={'school1','school2'}:
            return {'pass':False,'read_only':True,'code':'MISSING_QUERY_AGGREGATE'}
        return {'pass':counts['school1']==0 and counts['school2']==0,
          'read_only':True,'unsigned_school1_rows':counts['school1'],
          'unsigned_school2_rows':counts['school2'],
          'authenticated_signed_school_allow_proven':False}
    except (OSError,subprocess.TimeoutExpired):
        return {'pass':False,'read_only':True,'code':'NO_RELIABLE_NEGATIVE_PROOF'}
if __name__=='__main__':
    x=inspect()
    print(json.dumps(x,sort_keys=True))
    raise SystemExit(0 if x['pass'] else 3)
