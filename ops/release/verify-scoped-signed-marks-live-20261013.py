#!/usr/bin/env python3
"""Read-only, fail-closed scoped Marks live release probe. No user tokens or secrets logged."""
import json
import subprocess
import sys
from pathlib import Path


def run(command, timeout=15):
    p = subprocess.run(command, capture_output=True, text=True, timeout=timeout)
    if p.returncode:
        raise RuntimeError('command returned nonzero: ' + command[0])
    return p.stdout


def sql(q):
    return run(['runuser', '-u', 'postgres', '--', 'psql', '-X', '-A', '-t',
                '-v', 'ON_ERROR_STOP=1', '-p', '5432', '-d', 'apexos', '-c', q]).strip()


def http_code(url):
    return int(run(['curl', '--silent', '--show-error', '--max-time', '6',
                    '--output', '/dev/null', '--write-out', '%{http_code}', url], timeout=9).strip())


def env_for(pid):
    pairs = Path('/proc/' + str(pid) + '/environ').read_bytes().split(b'\0')
    return dict(part.decode('utf8', 'replace').split('=', 1)
                for part in pairs if b'=' in part)


def main():
    statuses = []
    def check(label, passed):
        passed = bool(passed)
        statuses.append(passed)
        print(label + '=' + ('PASS' if passed else 'FAIL'), flush=True)

    roles = sql("SELECT rolname||'|'||rolcanlogin||'|'||rolbypassrls||'|'||rolsuper "
                "FROM pg_roles WHERE rolname IN "
                "('apexos_user','assps_marks_signed_login','assps_core_green_login') ORDER BY 1").splitlines()
    check('LIVE_THREE_NONBYPASS_LOGINS', len(roles) == 3 and all(x.endswith('|true|false|false') for x in roles))
    check('SIGNED_GUARDS_77', sql("SELECT COUNT(*) FROM pg_policies WHERE schemaname='public' "
          "AND policyname='core_signed_tenant_guard' AND permissive='RESTRICTIVE' "
          "AND 'assps_marks_signed_runtime'=ANY(roles)") == '77')
    check('FORCED_RLS_78', sql("SELECT COUNT(*) FROM pg_class WHERE relkind='r' "
          "AND relnamespace='public'::regnamespace AND relforcerowsecurity") == '78')

    processes = {x['name']: x for x in json.loads(run(['pm2', 'jlist']))}
    green = processes.get('assps-marks-green', {})
    legacy = processes.get('apex-backend', {})
    pid = green.get('pid', 0)
    check('GREEN_AND_LEGACY_ONLINE', green.get('pm2_env', {}).get('status') == 'online'
          and legacy.get('pm2_env', {}).get('status') == 'online' and pid > 0)
    env = env_for(pid) if pid > 0 else {}
    check('GREEN_USES_SIGNED_NONBYPASS_LOGIN', env.get('DB_USER') == 'assps_marks_signed_login'
          and env.get('DB_RUNTIME_ROLE') == 'assps_marks_signed_runtime'
          and env.get('DB_ENFORCE_LEAST_PRIVILEGE_LOGIN') == 'true'
          and env.get('DB_AUTH_USE_SIGNED_TENANT_CONTEXT') == 'true'
          and env.get('DB_SIGNED_TENANT_RLS_ENABLED') == 'true'
          and bool(env.get('DB_SIGNED_TENANT_HMAC_KEY')) and bool(env.get('DB_PASSWORD')))

    nginx = run(['nginx', '-T'])
    check('APP_MARKS_ROUTE_GREEN_GET_POST', 'location = /api/exams/results {' in nginx
          and 'proxy_pass $assps_marks_results_upstream;' in nginx
          and 'map $request_method $assps_marks_results_upstream' in nginx
          and 'GET     http://127.0.0.1:5091;' in nginx
          and 'POST    http://127.0.0.1:5091;' in nginx
          and 'app.assps.edu.pk http://127.0.0.1:5000;' in nginx)

    for name, port in [('LEGACY_HEALTH', 5000), ('SIGNED_GREEN_HEALTH', 5091)]:
        check(name, http_code('http://127.0.0.1:' + str(port) + '/health/ready') == 200)
    check('SIGNED_GREEN_ANONYMOUS_DENIED', http_code(
          'http://127.0.0.1:5091/api/exams/results?exam_ids=9') == 401)
    check('PUBLIC_APP_ANONYMOUS_DENIED', http_code(
          'https://app.assps.edu.pk/api/exams/results?exam_ids=9') == 401)
    check('NGINX_SYNTAX', run(['nginx', '-t']) == '')

    passed = all(statuses)
    print('SCOPED_SIGNED_MARKS_READONLY_GATE=' + ('PASS' if passed else 'FAIL'))
    print('REAL_PRINCIPAL_TEACHER_SESSION_ACCEPTANCE=NOT_ESTABLISHED')
    print('FULL_APPLICATION_SIGNED_RUNTIME_CUTOVER=NOT_CERTIFIED')
    print('NO_PRODUCTION_MUTATIONS_OR_CREDENTIAL_DISCLOSURES')
    return 0 if passed else 2

if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception as exc:
        print('SCOPED_MARKS_READONLY_GATE=FAIL ' + type(exc).__name__, file=sys.stderr)
        sys.exit(2)
