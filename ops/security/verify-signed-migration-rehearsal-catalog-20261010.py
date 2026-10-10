#!/usr/bin/env python3
"""READ-ONLY signed schema rehearsal proof; exact synthetic database and port."""
import subprocess,sys
DB='assps_core_signed_migration_rehearsal_20261010'
SQL="""
SELECT current_database()||'|'||current_setting('port')||'|'||current_user;
SELECT 'force_rls|'||COUNT(*) FROM pg_class c WHERE c.relnamespace='public'::regnamespace AND c.relkind='r' AND c.relforcerowsecurity;
SELECT 'signed_guards|'||COUNT(*) FROM pg_policies WHERE schemaname='public' AND policyname='core_signed_tenant_guard';
SELECT 'helpers|'||COUNT(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='core_security';
SELECT 'unsigned_denied|'||(NOT core_security.valid_signed_context())::int;
SELECT 'test_artifacts|'||COUNT(*) FROM exams WHERE name IN ('CORE-RLS-MARKS-A','CORE-RLS-MARKS-B');
"""
def main():
 p=subprocess.run(['runuser','-u','postgres','--','psql','-X','-A','-t','-v','ON_ERROR_STOP=1','-p','55432','-d',DB],input=SQL,capture_output=True,text=True,timeout=12)
 if p.returncode:raise RuntimeError('signed rehearsal database unavailable')
 lines=p.stdout.strip().splitlines()
 if not lines or lines[0]!=DB+'|55432|postgres':raise RuntimeError('unexpected database/port/role')
 actual=dict(row.split('|',1) for row in lines[1:])
 expected={'force_rls':'77','signed_guards':'77','helpers':'3','unsigned_denied':'1','test_artifacts':'0'}
 if actual!=expected:raise RuntimeError('shadow signed policy parity mismatch '+str(actual))
 print('SHADOW_SIGNED_SCHEMA_CATALOG_PASS force_rls=77 signed_guards=77 helpers=3 unsigned_denied=true rolled_back_exam_fixtures=0')
if __name__=='__main__':
 try:main()
 except Exception as e:
  print('SHADOW_MIGRATION_REHEARSAL_NO_GO '+str(e),file=sys.stderr)
  sys.exit(2)
