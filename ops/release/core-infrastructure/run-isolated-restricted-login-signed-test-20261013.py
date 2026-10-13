#!/usr/bin/env python3
"""Fail-closed ephemeral PostgreSQL 55432 restricted-login exercise; never touches live 5432."""
import os, secrets, subprocess, sys, json
from pathlib import Path
DB='assps_core_cutover_login_qa_20261013'
SRC='assps_core_unified_security_recovery_20261013'
ROLE='assps_core_cutover_qa_login_20261013'
ROOT=Path(__file__).resolve().parents[3]
TEST=Path(__file__).with_name('verify-isolated-restricted-login-signed-path-20261013.cjs')
def sql(database, statement, *, fetch=False):
    cmd=['sudo','-u','postgres','psql','-X','-q','-v','ON_ERROR_STOP=1','-p','55432','-d',database,'-A','-t']
    p=subprocess.run(cmd,input=statement,text=True,capture_output=True,timeout=60)
    if p.returncode: raise RuntimeError('isolated psql operation failed (details redacted)')
    return p.stdout.strip() if fetch else None

def main():
    port=sql('postgres','SHOW port;',fetch=True)
    assert port=='55432', 'invalid isolated cluster port'
    assert sql('postgres',f"SELECT count(*) FROM pg_database WHERE datname='{DB}'",fetch=True)=='0', 'QA target already exists'
    assert sql('postgres',f"SELECT count(*) FROM pg_roles WHERE rolname='{ROLE}'",fetch=True)=='0', 'QA role already exists'
    assert sql('postgres',f"SELECT count(*) FROM pg_database WHERE datname='{SRC}'",fetch=True)=='1', 'source recovery clone missing'
    db_created=False; role_created=False
    passwd=secrets.token_hex(32); synthetic_key=secrets.token_hex(32)
    try:
        sql('postgres',f'CREATE DATABASE {DB} WITH TEMPLATE {SRC};'); db_created=True
        sql('postgres',f"CREATE ROLE {ROLE} LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '{passwd}';");role_created=True
        sql('postgres',f'GRANT apex_app_runtime TO {ROLE}; GRANT CONNECT ON DATABASE {DB} TO {ROLE};')
        sql(DB,f"UPDATE core_security.signing_key SET secret='{synthetic_key}' WHERE singleton = true;")
        # Synthetic staff exists only in disposable QA clone; original school records untouched.
        sql(DB, """INSERT INTO public.users(id,school_id,name,email,password,role,is_active,tenant_id)
          SELECT v.id,s.id,v.fullname,v.email,'disabled-qa-fixture',v.role,true,s.tenant_id
          FROM (VALUES
            (9001001,1,'QA Principal A','qa-principal-a@example.invalid','principal'),
            (9001002,1,'QA Teacher A','qa-teacher-a@example.invalid','teacher'),
            (9002001,2,'QA Principal B','qa-principal-b@example.invalid','principal')
          ) AS v(id,school_id,fullname,email,role)
          JOIN public.schools s ON s.id=v.school_id;""")
        env=dict(os.environ)
        env.update({'NODE_ENV':'production','NODE_PATH':'/var/www/apex-backend/node_modules',
          'DB_HOST':'127.0.0.1','DB_PORT':'55432','DB_NAME':DB,'DB_USER':ROLE,
          'DB_PASSWORD':passwd,'DB_STARTUP_PROBE':'false','DB_RUNTIME_ROLE':'apex_app_runtime',
          'DB_ENFORCE_LEAST_PRIVILEGE_LOGIN':'true','DB_AUTH_USE_SIGNED_TENANT_CONTEXT':'true',
          'DB_SIGNED_TENANT_RLS_ENABLED':'true','DB_SIGNED_TENANT_HMAC_KEY':synthetic_key,
          'JWT_SECRET':'synthetic-qa-jwt-not-production','DB_POOL_MAX':'2', 'DB_POOL_IDLE_TIMEOUT':'30000','DB_POOL_CONNECTION_TIMEOUT':'2000'})
        r=subprocess.run(['node',str(TEST)],cwd=str(ROOT),env=env,capture_output=True,text=True,timeout=65)
        print(r.stdout[-1500:].strip())
        if r.returncode:
            # Only error codes are safe to share; never reveal DSNs, SQL or signing material.
            print(json.dumps({'status':'HOLD','node_exit':r.returncode,'safe_error':r.stderr[-550:].replace(passwd,'[REDACTED]').replace(synthetic_key,'[REDACTED]')}))
            return 2
        http_test=TEST.with_name('verify-isolated-restricted-login-jwt-http-20261013.cjs')
        h=subprocess.run(['node',str(http_test)],cwd=str(ROOT),env=env,capture_output=True,text=True,timeout=65)
        print(h.stdout[-1500:].strip())
        if h.returncode:
            print(json.dumps({'status':'HOLD_HTTP','node_exit':h.returncode,
                'safe_error':h.stderr[-800:].replace(passwd,'[REDACTED]').replace(synthetic_key,'[REDACTED]')}))
            return 2
        return 0
    finally:
        cleanup_errors=[]
        if db_created:
            try: sql('postgres',f'DROP DATABASE {DB} WITH (FORCE);')
            except Exception: cleanup_errors.append('test_database')
        if role_created:
            try: sql('postgres',f'DROP ROLE {ROLE};')
            except Exception: cleanup_errors.append('test_login')
        if cleanup_errors:
            raise RuntimeError('QA cleanup incomplete: '+','.join(cleanup_errors))
        print('QA_CLEANUP_PASS (disposable database and login absent)')
if __name__=='__main__':
    try: sys.exit(main())
    except Exception as e:
        print(json.dumps({'status':'HOLD','reason':str(e)[:100]}))
        sys.exit(2)
