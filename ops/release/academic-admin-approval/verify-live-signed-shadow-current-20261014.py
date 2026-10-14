#!/usr/bin/env python3
"""Read-only actual production green RLS shadow gate. NOT full release acceptance."""
import json,subprocess,urllib.request,sys

def pg(q):
 p=subprocess.run(['sudo','-u','postgres','psql','-X','-q','-v','ON_ERROR_STOP=1','-A','-t','-p','5432','-d','apexos','-c',q],text=True,capture_output=True,timeout=12)
 if p.returncode:raise RuntimeError('read-only production catalog unavailable')
 return p.stdout.strip()
def count(q):return int(pg('SELECT '+q+';'))
def http(url):
 with urllib.request.urlopen(url,timeout=6) as r:return r.status

def run():
 facts={}
 facts['marks_signed_guards']=count("count(*) FROM pg_policies WHERE schemaname='public' AND policyname='core_signed_tenant_guard' AND permissive='RESTRICTIVE' AND 'assps_marks_signed_runtime'=ANY(roles)")
 facts['green_signed_guards']=count("count(*) FROM pg_policies WHERE schemaname='public' AND policyname='core_signed_tenant_guard' AND permissive='RESTRICTIVE' AND 'assps_core_green_runtime'=ANY(roles) AND coalesce(qual,'')=coalesce(with_check,'')")
 facts['legacy_app_signed_guards']=count("count(*) FROM pg_policies WHERE schemaname='public' AND policyname='core_signed_tenant_guard' AND 'apex_app_runtime'=ANY(roles)")
 facts['school_signed_guard_count']=count("count(*) FROM pg_policies WHERE schemaname='public' AND policyname='core_signed_tenant_guard' AND qual IN ('core_security.signed_school_allowed(id)','core_security.signed_school_allowed(school_id)')")
 facts['tenant_signed_guard_count']=count("count(*) FROM pg_policies WHERE schemaname='public' AND policyname='core_signed_tenant_guard' AND qual='core_security.signed_tenant_key_allowed((tenant_id)::text)'")
 facts['green_runtime_safe']=pg("SELECT NOT rolcanlogin AND NOT rolbypassrls AND NOT rolsuper FROM pg_roles WHERE rolname='assps_core_green_runtime'")=='t'
 facts['green_login_safe']=pg("SELECT rolcanlogin AND NOT rolbypassrls AND NOT rolsuper AND NOT rolinherit FROM pg_roles WHERE rolname='assps_core_green_login'")=='t'
 facts['green_inherits_core']=pg("SELECT pg_has_role('assps_core_green_runtime','apex_app_runtime','MEMBER')")=='t'
 facts['green_signed_helpers']=pg("SELECT has_schema_privilege('assps_core_green_runtime','core_security','USAGE') AND has_function_privilege('assps_core_green_runtime','core_security.signed_school_allowed(integer)','EXECUTE') AND has_function_privilege('assps_core_green_runtime','core_security.signed_tenant_key_allowed(text)','EXECUTE')")=='t'
 facts['green_paper_privileges_absent']=pg("SELECT NOT (has_table_privilege('assps_core_green_runtime','public.paper_documents','SELECT') OR has_table_privilege('assps_core_green_runtime','public.paper_revisions','SELECT'))")=='t'
 facts['green_signing_key_private']=pg("SELECT NOT has_table_privilege('assps_core_green_runtime','core_security.signing_key','SELECT')")=='t'
 facts['paper_owner_relations']=count("count(*) FROM pg_class WHERE relowner='apex_paper_owner'::regrole")
 facts['paper_owner_functions']=count("count(*) FROM pg_proc WHERE proowner='apex_paper_owner'::regrole")
 facts['active_green_logins']=count("count(*) FROM pg_stat_activity WHERE datname='apexos' AND usename='assps_core_green_login'")
 facts['legacy_bypass_eliminated']=pg("SELECT rolcanlogin AND NOT rolbypassrls FROM pg_roles WHERE rolname='apexos_user'")=='t'
 facts['backend_http']=http('http://127.0.0.1:5000/health')
 facts['marks_http']=http('http://127.0.0.1:5091/health')
 expected={'marks_signed_guards':77,'green_signed_guards':77,'legacy_app_signed_guards':0,
  'school_signed_guard_count':73,'tenant_signed_guard_count':4,'green_runtime_safe':True,
  'green_login_safe':True,'green_inherits_core':True,'green_signed_helpers':True,
  'green_paper_privileges_absent':True,'green_signing_key_private':True,
  'paper_owner_relations':14,'paper_owner_functions':3,'active_green_logins':0,
  'legacy_bypass_eliminated':True,'backend_http':200,'marks_http':200}
 issues=[k for k,v in expected.items() if facts.get(k)!=v]
 print(json.dumps({'status':'PASS_RESTRICTED_SHADOW_NOT_TRAFFIC' if not issues else 'HOLD',
  'facts':facts,'issues':issues,'authenticated_real_staff':False,
  'prod_app_switched':False,'production_release_certified':False},sort_keys=True))
 return 0 if not issues else 2
if __name__=='__main__':
 try:sys.exit(run())
 except Exception as e:
  print(json.dumps({'status':'HOLD','reason':str(e)[:130]}));sys.exit(2)
