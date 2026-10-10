#!/usr/bin/env python3
"""Read-only official Phase-6 synthetic fixtures, NEVER connect to production."""
import subprocess,sys
DB='assps_core_signed_p7_20261008'
SQL="""
SELECT current_database()||'|'||current_setting('port')||'|'||current_user;
SELECT 'assessment|'||COUNT(*) FROM assessment_result_records WHERE result_id IN ('CORE-P6-RESULT-A','CORE-P6-RESULT-B');
SELECT 'assignment|'||COUNT(*) FROM teacher_class_assignments WHERE source='phase6-synthetic' AND school_id=900001;
SELECT 'users|'||COUNT(*) FROM users WHERE email IN ('core-admin@example.invalid','core-unassigned@example.invalid','core-student@example.invalid') AND school_id=900001;
SELECT 'attendance|'||COUNT(*) FROM attendance WHERE school_id IN (900001,900002) AND date=DATE '2026-10-08';
SELECT 'papers|'||COUNT(*) FROM paper_vault WHERE school_id IN (900001,900002) AND name LIKE 'P6 Synthetic Paper %';
SELECT 'signed_guards|'||COUNT(*) FROM pg_policies WHERE schemaname='public' AND policyname='core_signed_tenant_guard';
"""
def main():
 p=subprocess.run(['runuser','-u','postgres','--','psql','-X','-A','-t','-v','ON_ERROR_STOP=1','-p','55432','-d',DB],input=SQL,capture_output=True,text=True,timeout=10)
 if p.returncode:raise RuntimeError('disposable PostgreSQL fixture query unavailable')
 rows=p.stdout.strip().splitlines()
 if not rows or rows[0]!=DB+'|55432|postgres':raise RuntimeError('clone identity mismatch; refusing acceptance')
 observed=dict(r.split('|',1) for r in rows[1:])
 expected={'assessment':'2','assignment':'1','users':'3','attendance':'2','papers':'2','signed_guards':'77'}
 if observed!=expected:raise RuntimeError('official synthetic fixture mismatch: '+repr(observed))
 print('OFFICIAL_PHASE6_SIGNED_CLONE_FIXTURES_PASS assessment=2 assignment=1 test_users=3 attendance=2 papers=2 signed_guards=77')
if __name__=='__main__':
 try:main()
 except Exception as e:
  print('OFFICIAL_PHASE6_SIGNED_CLONE_FIXTURES_NO_GO '+str(e),file=sys.stderr)
  sys.exit(2)
