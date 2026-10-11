#!/usr/bin/env python3
"""Explicit-approval disposable PostgreSQL V2/rollback rehearsal.

Plan mode is read-only source inspection. --run-clone must be invoked by an
independently authorized DBA on the VPS; NEVER target production or override
host safety controls. Secret values live in process memory and stdin only.
"""
import argparse
import json
import os
import secrets
import subprocess
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parent
REPO=ROOT.parents[2]
CLONE='assps_backup_restore_check_20261011'
PORT='55432'
FILES={
 'schema':'01-additive-schema-policies.sql',
 'login':'04-provision-isolated-login.sql',
 'actor':'02-isolated-signed-acceptance.sql',
 'login_rollback':'05-backout-isolated-login.sql',
 'schema_rollback':'03-additive-security-rollback.sql',
}

def checked_source(kind):
    src=(ROOT/FILES[kind]).read_text()
    if kind!='actor' and 'ASSPS_TARGET_DATABASE' not in src:
        raise ValueError('Migration target guard missing: '+kind)
    return src

def db(sql,variables=None):
    # The root process reads protected source, then sends it to the local
    # postgres process through an anonymous pipe. No -f /root, -v secrets,
    # shell expansion or privileged production connection is used.
    variables=variables or {}
    allowed={'CORE_SIGNING_KEY','ASSPS_SIGNED_LOGIN_PASSWORD','ASSPS_TARGET_DATABASE'}
    if not set(variables)<=allowed:raise ValueError('Unexpected variable')
    prefix=[]
    for name,value in variables.items():
        if name=='ASSPS_TARGET_DATABASE':
            if value!=CLONE:raise ValueError('Non-disposable database refused')
        elif len(value)!=64 or any(c not in '0123456789abcdef' for c in value):
            raise ValueError('Protected secret format invalid')
        prefix.append('\\set '+name+' '+value)
    cmd=['runuser','-u','postgres','--','psql','-X','-A','-t',
         '-v','ON_ERROR_STOP=1','-p',PORT,'-d',CLONE]
    payload='\n'.join(prefix)+'\n'+sql+'\n'
    safe_env={k:v for k,v in os.environ.items() if k not in
              ('DB_PASSWORD','PGPASSWORD','CORE_SIGNING_KEY','ASSPS_SIGNED_LOGIN_PASSWORD',
               'ASSPS_CLONE_DB_PASSWORD','ASSPS_CLONE_SIGNING_KEY')}
    result=subprocess.run(cmd,input=payload,text=True,capture_output=True,
                          timeout=80,cwd=str(REPO),env=safe_env)
    if result.returncode:
        # Do not echo server SQL/secret values even for an unexpected failure.
        raise RuntimeError('Isolated PostgreSQL phase failed, rc='+str(result.returncode))
    return result.stdout.strip()

def snapshot():
    sql="""SELECT current_database()||'|'||current_setting('port');
SELECT (SELECT count(*) FROM pg_policies WHERE schemaname='public')::text||'|'||
(SELECT count(*) FROM pg_namespace WHERE nspname='core_security')::text||'|'||
(SELECT count(*) FROM pg_roles WHERE rolname='assps_marks_signed_runtime')::text||'|'||
(SELECT count(*) FROM pg_roles WHERE rolname='assps_marks_signed_login')::text;"""
    lines=[line for line in db(sql).splitlines() if line]
    if len(lines)!=2 or lines[0]!=CLONE+'|'+PORT:
        raise RuntimeError('Clone identity proof failed')
    return lines[1]

def phase(name,variables=None):
    db(checked_source(name),variables)
    print('CLONE_PHASE_PASS '+name,flush=True)

def plan(execution=False):
    for name in FILES:
        checked_source(name)
    print('SOURCE_GUARDS_PRESENT_PASS',flush=True)
    print('CLONE_ONLY='+CLONE+':'+PORT,flush=True)
    print('AUTHORIZED_DISPOSABLE_EXECUTION_REQUESTED' if execution else 'PLAN_ONLY; NO_DATABASE_CONNECTION_OR_MUTATION',flush=True)

def authenticated(key,password):
    school=db('SELECT min(id)::text FROM public.schools WHERE id>0;')
    if not school.isdigit() or int(school)<1:raise RuntimeError('No validated isolated school')
    fixture=json.dumps({'database':CLONE,'port':PORT,'user':'assps_marks_signed_login',
                        'password':password,'signingKey':key,'schoolId':school})
    child_env={k:v for k,v in os.environ.items() if k not in
               ('DB_PASSWORD','CORE_SIGNING_KEY','ASSPS_SIGNED_LOGIN_PASSWORD')}
    child_env['ASSPS_CLONE_INPUT_STDIN']='1'
    result=subprocess.run(['node',str(ROOT/'test-restricted-login-20261011.cjs')],
                          input=fixture,text=True,capture_output=True,timeout=45,
                          cwd=str(REPO),env=child_env)
    markers=['RESTRICTED_SCRAM_DATABASE_LOGIN_PASS',
             'REAL_PASSWORD_LOGIN_SIGNED_OWN_SCHOOL_PASS',
             'REAL_PASSWORD_LOGIN_TENANT_SPOOF_DENIED_PASS',
             'REAL_PASSWORD_LOGIN_UNSIGNED_SCOPE_DENIED_PASS']
    if result.returncode or any(x not in result.stdout for x in markers):
        raise RuntimeError('Authenticated isolated tenant acceptance failed')
    print('CLONE_REAL_SCRAM_AND_SIGNED_TENANT_ACCEPTANCE_PASS',flush=True)

def release_fixture():
    # This function intentionally refuses to run unless the real authorized
    # operator explicitly opted into isolated writes on the verified VPS.
    if os.geteuid()!=0:raise RuntimeError('Local authorized VPS DBA identity required')
    if REPO.name!='assps-core-firstterm-production-rc-20261011':
        raise RuntimeError('Refuse unexpected release candidate worktree')
    # Actual read-only *definition parity* is mandatory, not only 212 policy
    # names/counts: no replay onto a drifted restored production copy.
    review=subprocess.run([sys.executable,str(ROOT/'verify-restored-clone-parity-20261011.py')],
                          capture_output=True,text=True,timeout=50,cwd=str(REPO))
    if review.returncode or 'RESTORED_CLONE_212_LEGACY_POLICIES_EXACT_MATCH_PASS' not in review.stdout:
        raise RuntimeError('Clone-versus-live policy/schema signature validation failed')
    print('EXACT_CLONE_VS_LIVE_SCHEMA_AND_POLICY_PARITY_PASS',flush=True)
    if snapshot()!='212|0|0|0':
        raise RuntimeError('Refuse clone catalog drift; do not alter existing test state')
    print('CLONE_ORIGINAL_CATALOG_212_CONFIRMED',flush=True)
    utility=ROOT/'reconcile-isolated-grants-20261011.py'
    subprocess.run([sys.executable,str(utility)],check=True,timeout=45,
                   cwd=str(REPO))
    key=secrets.token_hex(32)
    password=secrets.token_hex(32)
    phase_error=None
    try:
        phase('schema',{'CORE_SIGNING_KEY':key,'ASSPS_TARGET_DATABASE':CLONE})
        if snapshot()!='366|1|1|0':
            raise RuntimeError('New restricted policy/schema catalog drift')
        phase('login',{'ASSPS_SIGNED_LOGIN_PASSWORD':password,
                       'ASSPS_TARGET_DATABASE':CLONE})
        if snapshot()!='366|1|1|1':
            raise RuntimeError('New restricted login catalog drift')
        phase('actor')
        authenticated(key,password)
    except Exception as exc:
        phase_error=exc
    finally:
        try:
            state=snapshot()
            if state=='366|1|1|1':
                phase('login_rollback',{'ASSPS_TARGET_DATABASE':CLONE})
                state=snapshot()
            if state=='366|1|1|0':
                phase('schema_rollback',{'ASSPS_TARGET_DATABASE':CLONE})
            if snapshot()!='212|0|0|0':
                raise RuntimeError('Rollback incomplete: manual DBA recovery required')
            print('CLONE_FULL_ROLLBACK_TO_212_POLICY_BASELINE_PASS',flush=True)
        except Exception as failure:
            print('CLONE_ROLLBACK_BLOCKED '+type(failure).__name__,file=sys.stderr,flush=True)
            return 2
    if phase_error:
        print('CLONE_ACCEPTANCE_BLOCKED '+type(phase_error).__name__,file=sys.stderr,flush=True)
        return 2
    print('V2_REHEARSAL_AND_ROLLBACK_PASS_DISPOSABLE_ONLY',flush=True)
    print('PRODUCTION_SQL=NOT_EXECUTED; RELEASE_CERTIFIED=FALSE',flush=True)
    return 0

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run-clone',action='store_true',help='Execute isolated clone DDL+login+acceptance+rollback')
    parser.add_argument('--confirmed-independent-dba-authorization',action='store_true',
                        help='Operator assertion; flag does not confer administrator authorization')
    args=parser.parse_args()
    plan(args.run_clone)
    if not args.run_clone:
        return 0
    if not args.confirmed_independent_dba_authorization:
        raise RuntimeError('Independent DBA approval not acknowledged')
    return release_fixture()

if __name__=='__main__':
    try:sys.exit(main())
    except Exception as error:
        print('CLONE_EXECUTION_REFUSED '+type(error).__name__,file=sys.stderr,flush=True)
        sys.exit(2)
