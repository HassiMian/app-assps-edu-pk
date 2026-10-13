#!/usr/bin/env python3
"""Read-only fail-closed production signed runtime pre-cutover gate.
This tool NEVER migrates, provisions secrets, restarts services, or deploys.
"""
import hashlib,os,subprocess,sys
from pathlib import Path
BACKUP=Path('/root/assps-release-backups/firstterm-20261011T073058Z/apexos.dump')
SHA=Path('/root/assps-release-backups/firstterm-20261011T073058Z/sha256.txt')
def sql(statement):
 p=subprocess.run(['runuser','-u','postgres','--','psql','-X','-A','-t','-v','ON_ERROR_STOP=1',
 '-p','5432','-d','apexos','-c',statement],capture_output=True,text=True,timeout=15)
 if p.returncode:raise RuntimeError('production read-only catalog unavailable')
 return p.stdout.strip()
def main():
 passed=[]
 def check(name,condition):
  print(name+'='+('PASS' if condition else 'FAIL'),flush=True)
  passed.append(bool(condition))
 backup_ok=False
 if BACKUP.is_file() and SHA.is_file():
  real=hashlib.sha256(BACKUP.read_bytes()).hexdigest()
  backup_ok=real in SHA.read_text() and (BACKUP.stat().st_mode&0o077)==0
 check('RECOVERY_BACKUP_HASH_AND_PERMISSIONS',backup_ok)
 check('PRODUCTION_DATABASE_IDENTITY',sql("SELECT current_database()||'|'||current_setting('port')")=='apexos|5432')
 check('PRODUCTION_PROTECTED_FORCE_RLS_77',sql("SELECT count(*) FROM pg_class c WHERE c.relnamespace='public'::regnamespace AND c.relkind='r' AND c.relforcerowsecurity")=='78')
 check('PRODUCTION_LEGACY_POLICY_214',sql("SELECT count(*) FROM pg_policies WHERE schemaname='public' AND policyname NOT IN ('core_signed_tenant_guard','core_signed_tenant_allow')")=='214')
 check('SEPARATE_STUDENT_MOVEMENT_AUDIT_RLS',sql("SELECT (c.relforcerowsecurity AND (SELECT count(*) FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='student_class_movement_audit' AND p.policyname IN ('assps_audit_tenant_allow','assps_audit_tenant_guard'))=2)::int FROM pg_class c WHERE c.oid='public.student_class_movement_audit'::regclass")=='1')
 check('SIGNED_RESTRICTIVE_POLICIES_77',sql("SELECT count(*) FROM pg_policies WHERE policyname='core_signed_tenant_guard' AND permissive='RESTRICTIVE' AND 'assps_marks_signed_runtime'=ANY(roles) AND roles <@ ARRAY['assps_marks_signed_runtime','assps_core_green_runtime']::name[]")=='77')
 check('SIGNED_PERMISSIVE_POLICIES_77',sql("SELECT count(*) FROM pg_policies WHERE policyname='core_signed_tenant_allow' AND roles=ARRAY['assps_marks_signed_runtime']::name[]")=='77')
 check('SIGNED_PROTECTED_SCHEMA',sql("SELECT count(*) FROM pg_namespace WHERE nspname='core_security'")=='1')
 check('SIGNED_RESTRICTED_RUNTIME',sql("SELECT count(*) FROM pg_roles WHERE rolname='assps_marks_signed_runtime' AND NOT rolcanlogin AND NOT rolbypassrls AND NOT rolsuper")=='1')
 check('SIGNED_LOGIN_NONBYPASS',sql("SELECT count(*) FROM pg_roles WHERE rolname='assps_marks_signed_login' AND rolcanlogin AND NOT rolbypassrls AND NOT rolsuper")=='1')
 if sql("SELECT count(*) FROM pg_roles WHERE rolname='assps_marks_signed_runtime'")=='1':
  check('SIGNED_ROLE_NO_PRIVILEGED_PARENT',sql("SELECT count(*) FROM pg_auth_members a JOIN pg_roles r ON a.member=r.oid WHERE r.rolname='assps_marks_signed_runtime'")=='0')
  check('UNPROTECTED_PUBLIC_TABLES_DENIED',sql("SELECT count(*) FROM pg_class c WHERE c.relnamespace='public'::regnamespace AND c.relkind='r' AND NOT c.relforcerowsecurity AND (has_table_privilege('assps_marks_signed_runtime',c.oid,'SELECT') OR has_table_privilege('assps_marks_signed_runtime',c.oid,'INSERT') OR has_table_privilege('assps_marks_signed_runtime',c.oid,'UPDATE') OR has_table_privilege('assps_marks_signed_runtime',c.oid,'DELETE'))")=='0')
 else:
  check('SIGNED_ROLE_NO_PRIVILEGED_PARENT',False)
  check('UNPROTECTED_PUBLIC_TABLES_DENIED',False)
 # A live physical browser acceptance is separate and cannot be self-certified here.
 print('SECURITY_PRECUTOVER='+('PASS' if all(passed) else 'FAIL'))
 print('RELEASE_CERTIFIED=FALSE; GENUINE_BACKEND_AUTH_AND_BROWSER_ACCEPTANCE_STILL_MANDATORY')
 return 0 if all(passed) else 2
if __name__=='__main__':
 try:sys.exit(main())
 except Exception as exc:print('READONLY_CUTOVER_NO_GO '+str(exc),file=sys.stderr);sys.exit(2)
