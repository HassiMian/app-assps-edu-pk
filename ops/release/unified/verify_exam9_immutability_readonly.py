#!/usr/bin/env python3
"""Read-only immutable source check on authoritative live apexos DB."""
import subprocess,json,csv,io

SQL="""SELECT c.relrowsecurity,c.relforcerowsecurity,
 (SELECT COUNT(*) FROM pg_trigger t WHERE t.tgrelid=c.oid
   AND t.tgname='assps_firstterm_exam9_results_guard' AND t.tgenabled='O') AS row_guard,
 (SELECT COUNT(*) FROM pg_trigger t WHERE t.tgrelid=c.oid
   AND t.tgname='assps_firstterm_exam9_results_truncate_guard' AND t.tgenabled='O') AS truncate_guard
FROM pg_class c WHERE c.oid='public.exam_results'::regclass"""
def inspect(*,runner=None):
 run=runner or subprocess.run
 try:
  process=run(['runuser','-u','postgres','--','psql','-X','--csv','-p','5432','-d','apexos',
               '-v','ON_ERROR_STOP=1','-c',SQL],
              capture_output=True,text=True,timeout=15)
  if process.returncode:raise ValueError('PG_QUERY_FAILED')
  rows=list(csv.DictReader(io.StringIO(process.stdout)))
  if len(rows)!=1:raise ValueError('MISSING_RELATION')
  value=rows[0]
  checks={'force_rls':value['relrowsecurity']=='t' and value['relforcerowsecurity']=='t',
          'firstterm_row_guard':value['row_guard']=='1',
          'firstterm_truncate_guard':value['truncate_guard']=='1'}
  return {'pass':all(checks.values()),'checks':checks,'read_only':True}
 except (ValueError,KeyError,OSError,subprocess.TimeoutExpired) as error:
  return {'pass':False,'read_only':True,'error_type':type(error).__name__}
if __name__=='__main__':
 report=inspect()
 print(json.dumps(report,sort_keys=True))
 raise SystemExit(0 if report['pass'] else 3)
