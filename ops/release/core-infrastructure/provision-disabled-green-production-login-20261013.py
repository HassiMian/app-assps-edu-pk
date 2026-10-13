#!/usr/bin/env python3
"""Provision dormant least-privileged green DB login; fail closed, never restart PM2."""
import json,os,secrets,subprocess,sys
from pathlib import Path
DB='apexos';PORT='5432';LOGIN='assps_core_green_login';RUNTIME='assps_core_green_runtime'
FILE=Path('/etc/assps/security/core-green-login-20261013.env')
def psql(statement,params=None):
  c=['sudo','-u','postgres','psql','-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-p',PORT,'-d',DB]
  x=subprocess.run(c,input=statement,text=True,capture_output=True,timeout=22)
  if x.returncode:raise RuntimeError('production role operation rejected (details privately suppressed)')
  return x.stdout.strip()
def main():
  assert os.geteuid()==0
  assert psql('SELECT current_database()||\':\'||current_setting(\'port\');')==DB+':'+PORT
  assert psql(f"SELECT count(*) FROM pg_roles WHERE rolname='{LOGIN}';")=='0','LOGIN_EXISTS'
  assert psql(f"SELECT count(*) FROM pg_roles WHERE rolname='{RUNTIME}' AND NOT rolcanlogin AND NOT rolbypassrls AND NOT rolsuper;")=='1','GREEN_RUNTIME_NOT_READY'
  assert psql("SELECT count(*) FROM pg_policies WHERE policyname='core_signed_tenant_guard' AND 'assps_core_green_runtime'=ANY(roles);")=='77','GREEN_77_NOT_READY'
  assert psql("SELECT count(*) FROM pg_policies WHERE policyname='core_signed_tenant_guard' AND 'apex_app_runtime'=ANY(roles);")=='0','LEGACY_CHANGED'
  assert psql("SELECT has_table_privilege('assps_core_green_runtime','public.paper_documents','SELECT');")=='f','PAPER_GRANT_PRESENT'
  assert not FILE.exists(),'SECRET_FILE_ALREADY_EXISTS'
  assert psql("SELECT count(*) FROM pg_stat_activity WHERE datname='apexos' AND usename='assps_core_green_login';")=='0'
  pwd=secrets.token_hex(32)
  # Store once, owner-only, off-repo, never in stdout. The login is deliberately unused by active services.
  FILE.parent.mkdir(mode=0o700,parents=True,exist_ok=True);os.chmod(FILE.parent,0o700)
  fd=os.open(FILE,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
  try:
    with os.fdopen(fd,'w') as out:
      out.write('DB_HOST=127.0.0.1\nDB_PORT=5432\nDB_NAME=apexos\nDB_USER='+LOGIN+'\nDB_PASSWORD='+pwd+'\nDB_RUNTIME_ROLE='+RUNTIME+'\nDB_ENFORCE_LEAST_PRIVILEGE_LOGIN=true\nDB_AUTH_USE_SIGNED_TENANT_CONTEXT=true\nDB_SIGNED_TENANT_RLS_ENABLED=true\n')
    psql(f"""BEGIN;
      DO $$BEGIN IF current_database()<>'{DB}' OR current_setting('port')<>'{PORT}' THEN RAISE EXCEPTION 'LIVE_TARGET_REQUIRED'; END IF;
      IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='{LOGIN}') THEN RAISE EXCEPTION 'ALREADY_EXISTS'; END IF; END$$;
      CREATE ROLE {LOGIN} LOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD '{pwd}';
      GRANT {RUNTIME} TO {LOGIN} WITH INHERIT FALSE, SET TRUE;
      GRANT CONNECT ON DATABASE {DB} TO {LOGIN};
      COMMIT;""")
  except Exception:
    FILE.unlink(missing_ok=True)
    raise
  # Validate login by actual password-auth localhost PostgreSQL connection (only aggregate boolean facts).
  env=dict(os.environ);env['PGPASSWORD']=pwd
  def run_login(sql):
    c=['psql','-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-h','127.0.0.1','-p',PORT,'-U',LOGIN,'-d',DB,'-c',sql]
    return subprocess.run(c,capture_output=True,text=True,env=env,timeout=10)
  rolefacts=run_login("SELECT current_user,rolcanlogin,rolbypassrls,rolsuper,rolinherit FROM pg_roles WHERE rolname=current_user;")
  if rolefacts.returncode or rolefacts.stdout.strip()!=LOGIN+'|t|f|f|f':raise RuntimeError('restricted live credential cannot authenticate safely')
  forged=run_login("BEGIN; SET LOCAL ROLE assps_core_green_runtime; SELECT set_config('app.rls_enabled','true',true),set_config('app.tenant_id','1',true),set_config('app.is_super_admin','true',true); SELECT count(*) FROM public.students; ROLLBACK;")
  if forged.returncode or (not forged.stdout.splitlines() or forged.stdout.splitlines()[-1].strip()!='0'):
    # Independently verified below; never promote if this fails.
    raise RuntimeError('unsigned production role denial not verified')
  privileged=run_login('SET ROLE apexos_user;')
  paper=run_login('SET ROLE apex_paper_owner;')
  if privileged.returncode==0 or paper.returncode==0:raise RuntimeError('privileged role escalation possible')
  print(json.dumps({'status':'PASS_DORMANT_PRODUCTION_RESTRICTED_LOGIN_ONLY', 'login_nonbypass':True,
    'unsigned_forged_students_visible':0,'privileged_role_switch_denied':True,
    'active_services_switched':False,'authorized_staff_http_accepted':False,'legacy_bypass_still_active':True,
    'secret_storage':'root_only_external_file','production_user_records_modified':False}))
if __name__=='__main__':
  try: main()
  except Exception as e:
    print(json.dumps({'status':'HOLD','reason':str(e)[:150]}));sys.exit(2)
