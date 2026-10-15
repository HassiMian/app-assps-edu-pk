#!/usr/bin/env python3
"""Actual PRODUCTION worker connection acceptance; no school-data writes.
Does not claim the old running Blue backend is a deployed signed worker service.
"""
import hashlib,json,os,pathlib,re,subprocess,sys
CREDS=pathlib.Path('/etc/assps/ai-worker-credentials.env')
SRC=pathlib.Path(__file__).resolve().parents[3]/'al-siddique-backend/src'
CANARY=pathlib.Path('/root/assps-release-candidates/apex-backend-worker-live-reconciled-verified-20261015/src')
LIVE=pathlib.Path('/var/www/apex-backend/src')
FILES=['services/ai/aiQueueWorkerDatabase.js','services/ai/paperAiQueue.js','routes/opsRoutes.js']
SIX=['admin_block_audit_log','ai_jobs','ai_queue_events','ai_queue_state','campuses','organizations']

def worker_file_safe(st):
 return (st.st_uid==0 and st.st_mode & 0o077==0 and st.st_size<4096)

def load_env():
 st=CREDS.stat()
 if not worker_file_safe(st):raise ValueError('credential ownership/mode invalid')
 cfg={}
 for row in CREDS.read_text().splitlines():
  if not row or row.startswith('#'):continue
  k,sep,v=row.partition('=')
  if sep!='=' or k not in ('DB_AI_WORKER_HOST','DB_AI_WORKER_PORT','DB_AI_WORKER_NAME','DB_AI_WORKER_USER','DB_AI_WORKER_ROLE','DB_AI_WORKER_PASSWORD') or k in cfg:
   raise ValueError('worker credential schema drift')
  cfg[k]=v
 if set(cfg)!={'DB_AI_WORKER_HOST','DB_AI_WORKER_PORT','DB_AI_WORKER_NAME','DB_AI_WORKER_USER','DB_AI_WORKER_ROLE','DB_AI_WORKER_PASSWORD'}:raise ValueError('incomplete config')
 if (cfg['DB_AI_WORKER_HOST'],cfg['DB_AI_WORKER_PORT'],cfg['DB_AI_WORKER_NAME'],cfg['DB_AI_WORKER_USER'],cfg['DB_AI_WORKER_ROLE'])!=('127.0.0.1','5432','apexos','assps_ai_worker_login','assps_core_ai_worker') or len(cfg['DB_AI_WORKER_PASSWORD'])<45:raise ValueError('reviewed role/db target mismatch')
 return cfg

def cmd(args,env=None,sql=None):
 r=subprocess.run(args,env=env,input=sql,text=True,capture_output=True,timeout=18)
 return r.returncode,r.stdout.strip(),r.stderr.strip()

def source_parity(base):
 return all((base/f).is_file() and (SRC/f).is_file() and hashlib.sha256((base/f).read_bytes()).digest()==hashlib.sha256((SRC/f).read_bytes()).digest() for f in FILES)

def main():
 d={'gate':'ASSPS_CORE_ACTUAL_RESTRICTED_WORKER_20261015','academic_result_rows_mutated':False,'authenticated_staff_or_peer_tenant_certified':False,'production_release_certified':False,'checks':{}}
 c=d['checks']
 try: cfg=load_env();c['root_private_worker_configuration']=True
 except (OSError,ValueError) as e:
  c['root_private_worker_configuration']=False;print(json.dumps(d,indent=2));return 2
 rc,s,_=cmd(['runuser','-u','postgres','--','psql','-XqAt','-d','apexos','-v','ON_ERROR_STOP=1','-c',"SELECT count(*) FROM pg_auth_members a JOIN pg_roles m ON a.member=m.oid JOIN pg_roles p ON a.roleid=p.oid WHERE m.rolname IN ('assps_core_green_runtime','assps_core_green_login') AND p.rolname IN ('apex_app_runtime','assps_core_ai_worker','assps_core_directory_reader','assps_core_audit_writer')"])
 c['no_green_worker_or_parent_membership']=rc==0 and s=='0'
 env=os.environ.copy();env['PGPASSWORD']=cfg['DB_AI_WORKER_PASSWORD'];env['PGCONNECT_TIMEOUT']='5'
 base=['psql','-XqAt','-h','127.0.0.1','-p','5432','-U',cfg['DB_AI_WORKER_USER'],'-d','apexos','-v','ON_ERROR_STOP=1']
 sql="SELECT current_user,pg_has_role(current_user,'assps_core_ai_worker','USAGE'),pg_has_role(current_user,'assps_core_ai_worker','SET'),has_table_privilege(current_user,'public.ai_jobs','SELECT'),has_table_privilege(current_user,'public.organizations','SELECT'),has_table_privilege(current_user,'public.admin_block_audit_log','SELECT')"
 rc,s,_=cmd(base+['-c',sql],env=env)
 c['production_tcp_scram_identity_and_effective_scope']=rc==0 and s=='assps_ai_worker_login|t|f|t|f|f'
 rc,s,e=cmd(base+['-c','SELECT count(*) FROM public.organizations'],env=env)
 c['production_worker_real_global_directory_denial']=rc!=0 and 'permission denied' in e.lower()
 for k in ('PGPASSWORD','DB_AI_WORKER_PASSWORD'):env.pop(k,None)
 c['reviewed_three_source_files_staged_byte_exact']=source_parity(CANARY)
 c['running_backend_three_source_files_deployed_byte_exact']=source_parity(LIVE)
 try:
  s=pathlib.Path('/var/www/apex-connect/.next/BUILD_ID').read_text().strip()
  c['connect_reviewed_build_live']=s=='ONDwxEIZlx5onDIKY7wYf'
 except OSError:c['connect_reviewed_build_live']=False
 actual=all(v for k,v in c.items() if k!='running_backend_three_source_files_deployed_byte_exact' and k!='connect_reviewed_build_live')
 d['technical_worker_candidate_status']='PASS' if actual else 'HOLD'
 d['public_worker_integration_status']='PASS' if actual and c['running_backend_three_source_files_deployed_byte_exact'] else 'HOLD'
 print(json.dumps(d,indent=2,sort_keys=True))
 return 0 if actual else 2
if __name__=='__main__':sys.exit(main())
