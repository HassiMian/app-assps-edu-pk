#!/usr/bin/env python3
"""ASSPS Paper-only live READ-ONLY operational preflight. Not a release authority.

Counts are non-PII; user/staff identities and student/marks records are never read.
Never provisions assignments, authorizes actors or writes production data.
"""
import argparse
import json
import os
import re
import stat
import subprocess
import sys
from pathlib import Path

AUDIT_DIR = Path('/root/assps-release-evidence/paper-studio-unified-mission-20261016')
SCHEMA_QUERY = '''BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT
 (SELECT count(*) FROM public.teacher_class_assignments),
 (SELECT count(*) FROM public.teacher_class_assignments WHERE is_active IS TRUE),
 (SELECT count(*) FROM public.assessment_releases),
 (SELECT count(*) FROM public.assessment_print_jobs);
-- No real actor or tenant is impersonated. This role legitimately sees no school
-- context; a physically existing release is not proof of teacher visibility.
SET LOCAL ROLE apexos_user;
SELECT
 (SELECT count(*) FROM public.teacher_class_assignments),
 (SELECT count(*) FROM public.teacher_class_assignments WHERE is_active IS TRUE),
 (SELECT count(*) FROM public.assessment_releases),
 (SELECT count(*) FROM public.assessment_print_jobs);
ROLLBACK;
'''
# psql noninteractive, quiet, no ~/.psqlrc, no external SQL credentials.
PSQL_ARGS = ['/usr/sbin/runuser', '-u', 'postgres', '--', '/usr/bin/psql',
             '-X', '-q', '-A', '-t', '-F', '|', '-v', 'ON_ERROR_STOP=1',
             '-d', 'apexos', '-c', SCHEMA_QUERY]
KEYS = ('assignment_rows', 'active_assignment_rows', 'released_papers', 'print_jobs')


def parse_counts(output):
    lines = [ln.strip() for ln in output.splitlines() if ln.strip()]
    if len(lines) != 2 or any(not re.fullmatch(r'\d+\|\d+\|\d+\|\d+', ln) for ln in lines):
        raise ValueError('PSQL_TWO_ROLES_COUNT_CONTRACT_MISMATCH')
    result = []
    for line in lines:
        nums = [int(n) for n in line.split('|')]
        if any(n > 1_000_000_000 for n in nums) or nums[1] > nums[0]:
            raise ValueError('PSQL_TWO_ROLES_COUNT_CONTRACT_MISMATCH')
        result.append(dict(zip(KEYS, nums)))
    physical, unscoped_app_role = result
    if any(unscoped_app_role[k] > physical[k] for k in KEYS):
        raise ValueError('PSQL_TWO_ROLES_COUNT_CONTRACT_MISMATCH')
    return physical, unscoped_app_role


def decide(counts, unscoped_app_role=None):
    if set(counts) != set(KEYS) or any(type(counts[k]) is not int or counts[k] < 0 for k in KEYS):
        raise ValueError('UNTRUSTED_COUNTS')
    if counts['active_assignment_rows'] > counts['assignment_rows']:
        raise ValueError('UNTRUSTED_COUNTS')
    if unscoped_app_role is not None:
        if set(unscoped_app_role) != set(KEYS) or any(
            type(unscoped_app_role[k]) is not int or unscoped_app_role[k] < 0 or
            unscoped_app_role[k] > counts[k] for k in KEYS
        ):
            raise ValueError('UNTRUSTED_UNSCOPED_APP_ROLE_COUNTS')
    missing = []
    if counts['active_assignment_rows'] == 0:
        missing.append('NO_ACTIVE_TEACHER_ASSIGNMENTS')
    if counts['released_papers'] == 0:
        missing.append('NO_ASSESSMENT_RELEASES_FOR_REAL_TEACHER_TEST')
    if counts['print_jobs'] == 0:
        missing.append('NO_ASSESSMENT_PRINT_JOBS_FOR_REAL_REOPEN_TEST')
    return {
        'status': 'HOLD_PAPER_TEACHER_OPERATIONAL_PRECONDITIONS' if missing else 'TECHNICAL_COUNTS_ONLY_AUTHENTIC_SIGNOFF_REQUIRED',
        'database_read_only': True,
        'system_wide_physical_counts': {k: counts[k] for k in KEYS},
        'application_role_without_tenant_context_counts': (
            {k: unscoped_app_role[k] for k in KEYS} if unscoped_app_role is not None else None),
        'actual_authenticated_actor_visibility_verified': False,
        'blockers': missing,
        'authenticated_teacher_acceptance_verified': False,
        'independent_school2_denial_verified': False,
        'real_hardware_print_verified': False,
        'production_release_authorized': False,
        'production_mutation_performed': False,
        'is_saas_core_signed_release_gate': False,
    }


def run_live(runner=subprocess.run):
    result = runner(PSQL_ARGS, capture_output=True, text=True, timeout=20, check=False)
    if result.returncode != 0:
        raise RuntimeError('READ_ONLY_PSQL_EXIT_NOT_ZERO')
    physical, unscoped = parse_counts(result.stdout)
    return decide(physical, unscoped)


def write_receipt(report, receipt):
    # No filename guesswork, symlink follow or accidental replacement of past evidence.
    target = Path(receipt)
    if target.parent != AUDIT_DIR or not re.fullmatch(r'[a-z0-9-]+\.json', target.name):
        raise ValueError('RECEIPT_PATH_NOT_PRIVATE')
    directory = os.lstat(AUDIT_DIR)
    if not stat.S_ISDIR(directory.st_mode) or (stat.S_IMODE(directory.st_mode) & 0o077):
        raise ValueError('PRIVATE_EVIDENCE_DIR_NOT_RESTRICTED')
    fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as fh:
            json.dump(report, fh, sort_keys=True, indent=2)
            fh.write('\n')
    except BaseException:
        try: os.unlink(target)
        except OSError: pass
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--live-readonly', action='store_true', required=True)
    parser.add_argument('--receipt', type=str)
    args = parser.parse_args()
    try:
        report = run_live()
        if args.receipt:
            write_receipt(report, args.receipt)
    except (ValueError, OSError, RuntimeError, subprocess.TimeoutExpired) as exc:
        # Never echo stderr: it could include sensitive connection details.
        print(json.dumps({'status':'HOLD_READ_ONLY_PREFLIGHT_FAILED',
                          'error_type':type(exc).__name__,
                          'production_release_authorized':False,
                          'production_mutation_performed':False},sort_keys=True))
        return 2
    print(json.dumps(report, sort_keys=True))
    return 2 if report['blockers'] else 0


if __name__ == '__main__':
    sys.exit(main())
