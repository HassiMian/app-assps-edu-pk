#!/usr/bin/env python3
"""Ephemeral credentials for the ABSOLUTELY ISOLATED signed-RLS clone only."""
import argparse, fcntl, os, pathlib, re, secrets, subprocess, sys

DB = 'assps_core_signed_p7_20261008'
ROLE = 'assps_core_test_login'
PORT = '55432'
TESTS = {
  'db': 'saas-core-signed-context-real-db.test.js',
  'assessment': 'saas-core-phase7-signed-http-clone.test.js',
  'paper': 'saas-core-phase8-paper-documents-signed-http.test.js',
  'marks': '/root/workspace/assps-core-firstterm-signed-http-clone-20261010/al-siddique-backend/src/tests/saas-core-marks-signed-http-clone.test.js',
}
ROOT=pathlib.Path('/root/workspace/assps-core-marks-teacher-assignment-security-20261010')
PG=['runuser','-u','postgres','--','psql','-X','-A','-t','-v','ON_ERROR_STOP=1','-p',PORT,'-d',DB]
def sql(query):
    p=subprocess.run(PG, input=query+'\n', text=True, capture_output=True,timeout=12)
    if p.returncode:
        raise RuntimeError('DISPOSABLE_PG_QUERY_FAILED '+str(p.returncode)+' '+p.stderr[:220])
    return p.stdout.strip()
def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('suite',choices=TESTS.keys())
    args=parser.parse_args()
    if os.geteuid()!=0:
        raise RuntimeError('root required for isolated postgres peer admin')
    lock=pathlib.Path('/run/lock/assps-core-signed-clone-20261010.lock')
    fd=os.open(str(lock),os.O_RDWR|os.O_CREAT,0o600)
    try: fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB)
    except BlockingIOError: raise RuntimeError('Another signed clone test is active; no credential rotation.')
    try:
        meta=sql("SELECT current_database()||'|'||current_setting('port')||'|'||current_user")
        if meta!=DB+'|'+PORT+'|postgres':
            raise RuntimeError('DISPOSABLE_DB_IDENTITY_MISMATCH')
        role=sql("SELECT rolcanlogin::int||'|'||rolbypassrls::int||'|'||rolsuper::int FROM pg_roles WHERE rolname='"+ROLE+"'")
        if role!='1|0|0': raise RuntimeError('DISPOSABLE_ROLE_SAFETY_MISMATCH')
        active=sql("SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND usename='"+ROLE+"'")
        if active!='0': raise RuntimeError('DISPOSABLE_LOGIN_HAS_ACTIVE_SESSIONS')
        original=sql("SELECT coalesce(rolpassword,'') FROM pg_authid WHERE rolname='"+ROLE+"'")
        if original and not re.fullmatch(r'SCRAM-SHA-256\$.*',original):
            raise RuntimeError('Unexpected existing login credential format')
        key=sql("SELECT secret FROM core_security.signing_key WHERE singleton")
        if not re.fullmatch(r'[a-f0-9]{64}',key):
            raise RuntimeError('Invalid disposable signed clone key')
        password=secrets.token_urlsafe(42)
        assert re.fullmatch(r'[A-Za-z0-9_-]{30,}',password)
        if original:
            # Do not replace a pre-existing credential (even if this is an isolated clone).
            raise RuntimeError('A disposable login credential already exists; leave it untouched')
        sql("ALTER ROLE "+ROLE+" PASSWORD '"+password+"'")
        temporary_legacy_role=False
        temporary_grants=False
        grant_tables=()
        assessment_tables=('assessment_releases','assessment_result_records','assessment_result_revisions','teacher_class_assignments')
        try:
            if args.suite=='assessment':
                # Production runtime SELECT grants were independently inspected.
                # Disposable clone lacks these grants: temporary exact-scope
                # parity only, never broad ALL TABLES or production privileges.
                for table in assessment_tables:
                    exists=sql("SELECT has_table_privilege('apex_app_runtime','public."+table+"','SELECT')::int")
                    if exists!='0': raise RuntimeError('Unexpected existing clone grant '+table)
                sql('GRANT SELECT ON TABLE '+','.join('public.'+t for t in assessment_tables)+' TO apex_app_runtime')
                grant_tables=assessment_tables
                temporary_grants=True
            if args.suite=='marks':
                expected='7ee2055afc667d2ab5c15e35177683f79323bd96'
                checkout='/root/workspace/assps-core-firstterm-signed-http-clone-20261010'
                sha=subprocess.run(['git','rev-parse','HEAD'],cwd=checkout,capture_output=True,text=True,timeout=8)
                if sha.returncode or sha.stdout.strip()!=expected:
                    raise RuntimeError('SIGNED_MARKS_HTTP_TEST_SOURCE_SHA_CHANGED')
                mark_tables=('exams','exam_results','teacher_class_assignments','grade_settings')
                for table in mark_tables:
                    existing=sql("SELECT has_table_privilege('apex_app_runtime','public."+table+"','SELECT')::int")
                    if existing!='0': raise RuntimeError('Unexpected pre-existing clone marks grant '+table)
                sql('GRANT SELECT ON TABLE '+','.join('public.'+t for t in mark_tables)+' TO apex_app_runtime')
                grant_tables=mark_tables
                temporary_grants=True
            if args.suite=='db':
                # Actual production has a legacy BYPASS role. The disposable clone
                # does not; materialize an equivalent NOLOGIN negative target ONLY
                # here to prove restricted login cannot SET ROLE to BYPASSRLS.
                if sql("SELECT count(*) FROM pg_roles WHERE rolname='apexos_user'")!='0':
                    raise RuntimeError('Clone legacy role unexpectedly already exists')
                sql('CREATE ROLE apexos_user NOLOGIN BYPASSRLS')
                temporary_legacy_role=True
            env=os.environ.copy()
            env.update({
                'DB_HOST':'127.0.0.1','DB_PORT':PORT,'DB_NAME':DB,'DB_USER':ROLE,
                'DB_RUNTIME_ROLE':'apex_app_runtime','DB_PASSWORD':password,
                'CORE_SIGNED_TEST_KEY':key,'CORE_SIGNED_TEST_MODE':'phase7-isolated-only',
                'DB_ENFORCE_LEAST_PRIVILEGE_LOGIN':'true',
                'DB_AUTH_USE_SIGNED_TENANT_CONTEXT':'true',
                'DB_SIGNED_TENANT_RLS_ENABLED':'true',
                'DB_SIGNED_TENANT_HMAC_KEY':key,
                'JWT_SECRET':'isolated-synthetic-signing-key-only',
                'DB_STARTUP_PROBE':'false','NODE_ENV':'test',
                'NODE_PATH':str(ROOT/'al-siddique-backend/src/node_modules'),
            })
            check=subprocess.run(['sh',str(ROOT/'ops/security/check-signed-rls-harness.sh')],env=env,text=True,capture_output=True,timeout=10)
            if check.returncode:
                raise RuntimeError('DISPOSABLE_SIGNED_PREFLIGHT_FAIL '+check.stderr[:300])
            print('SIGNED_DISPOSABLE_PREFLIGHT_PASS restricted login, 127.0.0.1:55432, no production DB',flush=True)
            test_path=TESTS[args.suite] if args.suite=='marks' else 'tests/'+TESTS[args.suite]
            completed=subprocess.run(['node','--test',test_path],
                 cwd=str(ROOT/'al-siddique-backend/src'),env=env,text=True,capture_output=True,timeout=27)
            lines=completed.stdout.splitlines()
            for line in lines:
                if (line.startswith(('# pass ','# fail ','# tests ','# duration_ms','not ok','ok ','# suites')) or
                  ('error:' in line.lower() and len(line)<150)):
                    print(line[:180],flush=True)
            if completed.returncode:
                print('ISOLATED_TEST_FAILED_EXIT '+str(completed.returncode),flush=True)
                for index,line in enumerate(lines):
                    if line.startswith('not ok '):
                        for diagnostic in lines[index+1:index+20]:
                            if any(bad in diagnostic.lower() for bad in ('password','jwt','secret','token','bearer')): continue
                            print(diagnostic[:180],flush=True)
                        break
                print(completed.stderr[-350:],flush=True)
                return 1
            print('ISOLATED_TEST_SUITE_PASS '+args.suite,flush=True)
            return 0
        finally:
            if temporary_grants:
                sql('REVOKE SELECT ON TABLE '+','.join('public.'+t for t in grant_tables)+' FROM apex_app_runtime')
                print('DISPOSABLE_'+args.suite.upper()+'_CLONE_ONLY_GRANTS_REVOKED',flush=True)
            if temporary_legacy_role:
                sql('DROP ROLE apexos_user')
                print('TEMPORARY_CLONE_ONLY_LEGACY_BYPASS_NEGATIVE_TARGET_DROPPED',flush=True)
            sql('ALTER ROLE '+ROLE+' PASSWORD NULL')
            if sql("SELECT (rolpassword IS NULL)::int FROM pg_authid WHERE rolname='"+ROLE+"'")!='1':
                raise RuntimeError('CRITICAL_TEST_ROLE_CREDENTIAL_RESTORE_FAILED')
            print('ISOLATED_LOGIN_PASSWORD_RESET_TO_ORIGINAL_NULL; NO_SECRET_PERSISTED',flush=True)
    finally:
        os.close(fd)
if __name__=='__main__':
    try: sys.exit(main())
    except Exception as exc:
        print('DISPOSABLE_HARNESS_ERROR '+str(exc)[:600],file=sys.stderr)
        sys.exit(2)
