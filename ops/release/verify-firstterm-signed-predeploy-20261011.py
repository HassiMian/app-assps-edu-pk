#!/usr/bin/env python3
"""ASSPS deterministic predeploy evidence gate. NO production writes/deploy/restart.

The four temporary-credential suites execute on the disposable signed PostgreSQL
127.0.0.1:55432 database ONLY. The production probes are read-only.
"""
import subprocess
import sys
from pathlib import Path

ROOT = Path('/root/workspace/assps-core-marks-teacher-assignment-security-20261010')
RUNNER = ROOT / 'ops/security/run-isolated-signed-actor-acceptance-20261010.py'
SHADOW = ROOT / 'ops/security/verify-signed-migration-rehearsal-catalog-20261010.py'
PROD = ROOT / 'ops/release/verify-prod-signed-runtime-identity-20261010.py'
NGINX = ROOT / 'ops/security/check-nginx-private-uploads.sh'
SUITES = ('assessment-next', 'paper-next', 'marks-next', 'db-next')
EXPECTED_SOURCE = '16b18e093795eb15e9b188276b2d1e31f7b53262'
DB = 'assps_core_signed_p7_20261008'


def run(command, timeout=60):
    try:
        return subprocess.run(command, capture_output=True, text=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        return None


def verify_clone_cleanup():
    # Do not print pg_authid or pg credentials; inspect only a safe boolean.
    query = ("SELECT (rolpassword IS NULL)::int FROM pg_authid "
             "WHERE rolname='assps_core_test_login'; "
             "SELECT COUNT(*) FROM pg_roles WHERE rolname='apexos_user';")
    proc = run(['runuser', '-u', 'postgres', '--', 'psql', '-X', '-A', '-t',
                '-v', 'ON_ERROR_STOP=1', '-h', '/var/run/postgresql',
                '-p', '55432', '-d', DB, '-c', query], timeout=15)
    return proc is not None and proc.returncode == 0 and proc.stdout.strip().splitlines() == ['1', '0']


def main():
    if not RUNNER.is_file() or not SHADOW.is_file() or not PROD.is_file():
        print('PREDEPLOY_INVALID_TRUSTED_SOURCE', flush=True)
        return 2
    repo = run(['git', '-C', str(ROOT), 'rev-parse', 'HEAD'], timeout=8)
    if repo is None or repo.returncode or repo.stdout.strip() != EXPECTED_SOURCE:
        print('PREDEPLOY_REVIEW_SOURCE_CHANGED_ABORT', flush=True)
        return 2
    print('ASSPS_PREDEPLOY_PROBE_READ_ONLY_PRODUCTION_AND_DISPOSABLE_CLONE', flush=True)
    statuses = {}
    for label, args in (
        ('LIVE_NGINX', ['bash', str(NGINX), '/etc/nginx/sites-enabled']),
        ('SHADOW_SIGNED_SCHEMA', ['python3', str(SHADOW)]),
    ):
        proc = run(args, timeout=25)
        statuses[label] = proc is not None and proc.returncode == 0
        print(label + ('_PASS' if statuses[label] else '_FAIL'), flush=True)

    for suite in SUITES:
        proc = run(['python3', str(RUNNER), suite], timeout=85)
        ok = bool(proc and proc.returncode == 0 and
                  'ISOLATED_TEST_SUITE_PASS ' + suite in proc.stdout and
                  'ISOLATED_LOGIN_PASSWORD_RESET_TO_ORIGINAL_NULL' in proc.stdout)
        clean = verify_clone_cleanup()
        statuses['SIGNED_' + suite] = ok and clean
        print('SIGNED_' + suite.upper().replace('-', '_') + ('_PASS' if ok and clean else '_FAIL') +
              ' CREDENTIAL_CLEAN=' + str(clean), flush=True)
        if not clean:
            print('CRITICAL_DISPOSABLE_ROLE_CLEANUP_GATE_FAILED; STOP', flush=True)
            break

    prod = run(['python3', str(PROD)], timeout=25)
    prod_ok = bool(prod and prod.returncode == 0 and
                   'PRODUCTION_SIGNED_RUNTIME_IDENTITY_PREFLIGHT_PASS' in prod.stdout)
    statuses['LIVE_SIGNED_RUNTIME'] = prod_ok
    print('PRODUCTION_SIGNED_RUNTIME_' + ('IDENTITY_PASS' if prod_ok else 'IDENTITY_NO_GO'), flush=True)
    if prod and not prod_ok:
        # No role passwords, JWTs or secrets printed by this trusted read-only audit.
        for line in prod.stdout.splitlines():
            if line.startswith(('PRODUCTION_RUNTIME_DB_ROLE_FLAGS=', 'PRODUCTION_RUNTIME_DB_ENFORCE_',
                                'PRODUCTION_RUNTIME_DB_AUTH_', 'PRODUCTION_RUNTIME_DB_SIGNED_')):
                print(line, flush=True)
    all_clone = all(statuses.get('SIGNED_' + suite, False) for suite in SUITES)
    print('SIGNED_DISPOSABLE_SOURCE_GATES=' + ('PASS' if all_clone and statuses.get('SHADOW_SIGNED_SCHEMA') else 'FAIL'), flush=True)
    if not all(statuses.values()):
        print('RELEASE_CERTIFIED=FALSE APPLICATION_DEPLOYMENT=HOLD; NO_LIVE_WRITES', flush=True)
        return 2
    # Passing runtime identity alone does NOT establish real signed school user,
    # cross-tenant prod acceptance, source certification or rollback signoff.
    print('RELEASE_CERTIFIED=FALSE; REAL_LIVE_AUTHENTICATED_SCHOOL_ACTOR_AND_ROLLBACK_SIGNOFF_REQUIRED', flush=True)
    return 2


if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception as exc:
        print('PREDEPLOY_FAIL_CLOSED ' + type(exc).__name__, flush=True)
        sys.exit(2)
