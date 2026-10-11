#!/usr/bin/env python3
"""Read-only tenant and privilege release gate for class movement auditing."""
import subprocess
import sys

def query(sql):
 p=subprocess.run(['runuser','-u','postgres','--','psql','-X','-A','-t',
  '-v','ON_ERROR_STOP=1','-p','5432','-d','apexos','-c',sql],
  capture_output=True,text=True,timeout=16)
 if p.returncode:raise RuntimeError('PostgreSQL audit catalog check unavailable')
 return p.stdout.strip()

def main():
 def require(name,condition):
  print(name+('=PASS' if condition else '=FAIL'))
  if not condition:raise RuntimeError(name)
 require('LIVE_DATABASE_IDENTITY',query("SELECT current_database()||'|'||current_setting('port')")=='apexos|5432')
 require('PRESERVED_11_COHORT_AUDIT_RECORDS',query("SELECT count(*) FROM public.student_class_movement_audit WHERE school_id=1")=='11')
 require('AUDIT_TABLE_ENABLED_FORCE_RLS',query("SELECT (relrowsecurity AND relforcerowsecurity)::int FROM pg_class WHERE oid='public.student_class_movement_audit'::regclass")=='1')
 require('EXACT_SIGNED_AUDIT_INSERT_ALLOW_AND_GUARD',query("SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='student_class_movement_audit' AND policyname IN ('assps_audit_tenant_allow','assps_audit_tenant_guard') AND roles=ARRAY['assps_marks_signed_runtime']::name[] AND cmd='INSERT' AND with_check='core_security.signed_school_allowed(school_id)'")=='2')
 require('AUDIT_RUNTIME_INSERT_ONLY',query("SELECT (has_table_privilege('assps_marks_signed_runtime','public.student_class_movement_audit','INSERT') AND NOT has_table_privilege('assps_marks_signed_runtime','public.student_class_movement_audit','SELECT') AND NOT has_table_privilege('assps_marks_signed_runtime','public.student_class_movement_audit','UPDATE') AND NOT has_table_privilege('assps_marks_signed_runtime','public.student_class_movement_audit','DELETE'))::int")=='1')
 require('UNPROTECTED_TABLES_NOT_EXPOSED',query("SELECT count(*) FROM pg_class c WHERE c.relnamespace='public'::regnamespace AND c.relkind='r' AND NOT c.relforcerowsecurity AND (has_table_privilege('assps_marks_signed_runtime',c.oid,'SELECT') OR has_table_privilege('assps_marks_signed_runtime',c.oid,'INSERT') OR has_table_privilege('assps_marks_signed_runtime',c.oid,'UPDATE') OR has_table_privilege('assps_marks_signed_runtime',c.oid,'DELETE'))")=='0')
 require('ORIGINAL_SIGNED_GUARDS_77_EACH',query("SELECT (SELECT count(*) FROM pg_policies WHERE policyname='core_signed_tenant_guard')||'|'||(SELECT count(*) FROM pg_policies WHERE policyname='core_signed_tenant_allow')")=='77|77')
 print('STUDENT_MOVEMENT_AUDIT_PRODUCTION_SECURITY_READY')
if __name__=='__main__':
 try:main()
 except Exception as exc:
  print('STUDENT_MOVEMENT_AUDIT_NO_GO '+str(exc),file=sys.stderr)
  sys.exit(2)
