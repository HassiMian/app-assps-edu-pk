#!/usr/bin/env python3
"""Read-only production cutover assessment. Never mutates DB/roles/config."""
import subprocess,sys
from pathlib import Path
PROD='apexos'; PORT='5432'
def sql(q):
 p=subprocess.run(['runuser','-u','postgres','--','psql','-X','-A','-t','-v','ON_ERROR_STOP=1','-p',PORT,'-d',PROD,'-c',q],capture_output=True,text=True,timeout=15)
 if p.returncode: raise RuntimeError('catalog read failed')
 return p.stdout.strip()
def main():
 facts={
 'db':sql('SELECT current_database()'),
 'protected':sql("SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND c.relforcerowsecurity"),
 'policies':sql("SELECT count(*) FROM pg_policies WHERE schemaname='public'"),
 'signed_guards':sql("SELECT count(*) FROM pg_policies WHERE schemaname='public' AND policyname='core_signed_tenant_guard'"),
 'legacy_login':sql("SELECT rolcanlogin::int||'|'||rolbypassrls::int FROM pg_roles WHERE rolname='apexos_user'"),
 'signed_role':sql("SELECT count(*) FROM pg_roles WHERE rolname='assps_signed_shadow_runtime'"),
 'signed_schema':sql("SELECT count(*) FROM pg_namespace WHERE nspname='core_security'"),
 'paper_memberships':sql("SELECT count(*) FROM pg_auth_members a JOIN pg_roles r ON a.member=r.oid JOIN pg_roles m ON a.roleid=m.oid WHERE r.rolname='apexos_user' AND m.rolname LIKE 'apex_paper_%'"),
 }
 for k,v in facts.items():print(k.upper()+'='+v)
 expected={'db':'apexos','protected':'77','policies':'212','signed_guards':'0','legacy_login':'1|1','signed_schema':'0','paper_memberships':'2'}
 stable=all(facts[k]==v for k,v in expected.items())
 print('BASELINE='+('MATCH' if stable else 'DRIFT_ABORT'))
 print('PRODUCTION_MIGRATION_ALLOWED=FALSE; LIVE_ROLE_SWITCH_REQUIRES_REVIEWED_REVERSIBLE_DDL_AND_REAL_ACTOR_ACCEPTANCE')
 return 2 if not stable else 0
if __name__=='__main__':
 try:sys.exit(main())
 except Exception as e:print('FAIL_CLOSED='+str(e),file=sys.stderr);sys.exit(2)
