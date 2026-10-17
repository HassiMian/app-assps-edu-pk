#!/usr/bin/env python3
"""Fail-closed Paper Studio dependency health. No deploy, credentials or DB work.

An HTTPS 200 is not sufficient if its Next candidate crashes between probes.
This is not a SaaS Core release signature, an incident repair or permission to cutover.
"""
import argparse
import json
import os
import re
import stat
import subprocess
import sys
import time
from pathlib import Path

PROCESS = 'apex-connect-green'
PROCESS_CWD = Path('/var/www/apex-connect')
EVIDENCE_DIR = Path('/root/assps-release-evidence/paper-api-dependency-20261017')
CURL = '/usr/bin/curl'
PM2 = '/usr/bin/pm2'
NGINX = '/usr/sbin/nginx'
PROBES = (
    ('public_health', 'https://api.assps.edu.pk/health', '200'),
    ('public_login', 'https://api.assps.edu.pk/login', '200'),
    ('public_anonymous_identity_denial', 'https://api.assps.edu.pk/api/auth/me', '401'),
    ('green_local_health', 'http://127.0.0.1:3002/health', '200'),
    ('old_local_health', 'http://127.0.0.1:3000/health', '200'),
)


def parse_pm2(stdout):
    data = json.loads(stdout)
    if not isinstance(data, list):
        raise ValueError('PM2_EXPECTED_ARRAY')
    items = [x for x in data if isinstance(x, dict) and x.get('name') == PROCESS]
    if len(items) != 1:
        raise ValueError('PM2_EXPECTED_ONE_GREEN_PROCESS')
    env = items[0].get('pm2_env')
    if not isinstance(env, dict):
        raise ValueError('PM2_MISSING_ENV_METADATA')
    # Read only a hardcoded allowlist of nonsecret fields; never serialize env.
    dist = env.get('NEXT_DIST_DIR', '.next')
    port = env.get('APP_PORT')
    cwd = env.get('pm_cwd')
    restart = env.get('restart_time')
    status = env.get('status')
    if dist not in ('.next', '.next-candidate') or str(port) != '3002' or cwd != str(PROCESS_CWD):
        raise ValueError('PM2_UNREVIEWED_RUNTIME_DIRECTORY_OR_PORT')
    if type(restart) is not int or restart < 0 or status not in ('online', 'stopped', 'errored'):
        raise ValueError('PM2_UNTRUSTED_RESTART_OR_STATUS')
    return {'dist_dir': dist, 'restart_count': restart, 'status': status}


def validate_artifact(state, root=PROCESS_CWD):
    directory = root / state['dist_dir']
    required = (directory / 'BUILD_ID', directory / 'required-server-files.json')
    if not directory.is_dir() or directory.is_symlink():
        return False
    for f in required:
        if f.is_symlink() or not f.is_file() or f.stat().st_size < 12:
            return False
    return True


def interpret(first, last, statuses, nginx_ok, artifact_ok):
    if set(first) != {'dist_dir', 'restart_count', 'status'} or set(last) != set(first):
        raise ValueError('BAD_SAMPLED_PROCESS_SHAPE')
    if type(first['restart_count']) is not int or type(last['restart_count']) is not int:
        raise ValueError('BAD_SAMPLED_RESTART_COUNT')
    if set(statuses) != set(k for k, _, _ in PROBES):
        raise ValueError('INCOMPLETE_HTTP_PROBES')
    problems = []
    if not artifact_ok: problems.append('REVIEWED_NEXT_ARTIFACT_MISSING')
    if not nginx_ok: problems.append('NGINX_SYNTAX_FAILED')
    if first['status'] != 'online' or last['status'] != 'online': problems.append('NEXT_PROCESS_NOT_STABLY_ONLINE')
    if first['dist_dir'] != last['dist_dir']: problems.append('DIST_DIR_CHANGED_DURING_PROBE')
    if last['restart_count'] < first['restart_count'] or last['restart_count'] > first['restart_count']:
        problems.append('NEXT_RESTART_DURING_PROBE_OR_COUNTER_RESET')
    if last['restart_count'] >= 100:
        problems.append('HISTORIC_HIGH_RESTART_COUNT_REQUIRES_CORE_REVIEW')
    for key, _, expected in PROBES:
        if not statuses[key] or any(code != expected for code in statuses[key]):
            problems.append('UNSTABLE_OR_UNEXPECTED_' + key.upper())
    return {
        'status': 'HOLD_API_DEPENDENCY_NOT_CERTIFIED' if problems else 'TECHNICALLY_HEALTHY_NOT_CORE_SIGNED',
        'blockers': problems,
        'http_codes_by_safe_probe': statuses,
        'green_restart_count_start': first['restart_count'],
        'green_restart_count_end': last['restart_count'],
        'candidate_artifact_present': bool(artifact_ok),
        'nginx_config_valid': bool(nginx_ok),
        'release_authorized': False,
        'authenticated_teacher_acceptance_verified': False,
        'independent_tenant_denial_verified': False,
        'production_mutation_performed': False,
    }


def command(args, timeout=8):
    return subprocess.run(args, capture_output=True, text=True, timeout=timeout, check=False)


def get_pm2():
    r = command([PM2, 'jlist'], timeout=10)
    if r.returncode != 0: raise RuntimeError('PM2_STATUS_COMMAND_FAILED')
    return parse_pm2(r.stdout)


def get_http_code(url):
    r = command([CURL, '--silent', '--show-error', '--max-time', '5', '--output', '/dev/null',
                 '--write-out', '%{http_code}', '--max-redirs', '0', url], timeout=7)
    if r.returncode != 0 or not re.fullmatch(r'[0-9]{3}', r.stdout):
        return '000'
    return r.stdout


def live_probe(samples=5, pause=0.4):
    first = get_pm2()
    artifact = validate_artifact(first)
    nginx_result = command([NGINX, '-t'], timeout=8)
    statuses = {key: [] for key, _, _ in PROBES}
    for i in range(samples):
        for key, url, _ in PROBES:
            statuses[key].append(get_http_code(url))
        if i + 1 < samples: time.sleep(pause)
    last = get_pm2()
    return interpret(first, last, statuses, nginx_result.returncode == 0, artifact)


def write_private(report, path):
    target = Path(path)
    if target.parent != EVIDENCE_DIR or not re.fullmatch(r'[a-z0-9-]+\.json',target.name):
        raise ValueError('RECEIPT_PATH_OUTSIDE_PRIVATE_FOLDER')
    folder = os.lstat(EVIDENCE_DIR)
    if not stat.S_ISDIR(folder.st_mode) or stat.S_IMODE(folder.st_mode)&0o077:
        raise ValueError('PRIVATE_DIR_PERMISSIONS_INSECURE')
    fd = os.open(target, os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd,'w',encoding='utf8') as f:
        json.dump(report,f,sort_keys=True,indent=2)
        f.write('\n')


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--live-readonly', action='store_true', required=True)
    parser.add_argument('--receipt',type=str)
    args=parser.parse_args()
    try:
        report=live_probe()
        if args.receipt:write_private(report,args.receipt)
    except (ValueError, RuntimeError, OSError, subprocess.TimeoutExpired, json.JSONDecodeError) as exc:
        # Exclude raw process logs and command stderr; no auth material in receipts.
        print(json.dumps({'status':'HOLD_API_READ_ONLY_PREFLIGHT_FAILED','error_type':type(exc).__name__,
                          'release_authorized':False,'production_mutation_performed':False}))
        return 2
    print(json.dumps(report,sort_keys=True))
    return 2 if report['blockers'] else 0


if __name__ == '__main__':sys.exit(main())
