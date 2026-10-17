#!/usr/bin/env python3
"""Non-PII live PostgreSQL preflight: timetable is not an ACL source by default.

Only reads aggregate timetable identity review flags and explicit teacher grants.
Never provisions roles, modifies marks or upgrades to authenticated acceptance.
"""
import argparse
import json
import os
import re
import stat
import subprocess
import sys
from pathlib import Path

PRIVATE_DIR = Path('/root/assps-release-evidence/paper-api-dependency-20261017')
COUNTS = ('timetable_rows','timetable_linked_teacher_ids','timetable_reviewed_staff_identity',
          'timetable_missing_school_id','timetable_source_sha256','timetable_academic_session',
          'timetable_unreviewed_linked_identity','timetable_distinct_scopes',
          'teacher_assignment_rows','teacher_assignment_active_rows')
SQL = '''BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT
 (SELECT count(*) FROM public.timetable),
 (SELECT count(*) FROM public.timetable WHERE teacher_id IS NOT NULL),
 (SELECT count(*) FROM public.timetable WHERE staff_identity_reviewed IS TRUE AND teacher_id IS NOT NULL),
 (SELECT count(*) FROM public.timetable WHERE school_id IS NULL),
 (SELECT count(*) FROM public.timetable WHERE source_sha256 IS NOT NULL),
 (SELECT count(*) FROM public.timetable WHERE academic_session IS NOT NULL),
 (SELECT count(*) FROM public.timetable WHERE teacher_id IS NOT NULL AND staff_identity_reviewed IS NOT TRUE),
 (SELECT count(DISTINCT (school_id,class_name,coalesce(section,''),subject)) FROM public.timetable),
 (SELECT count(*) FROM public.teacher_class_assignments),
 (SELECT count(*) FROM public.teacher_class_assignments WHERE is_active IS TRUE);
ROLLBACK;'''
PSQL = ['/usr/sbin/runuser','-u','postgres','--','/usr/bin/psql', '-X','-q','-A','-t',
        '-F','|','-v','ON_ERROR_STOP=1','-d','apexos','-c',SQL]


def parse_counts(stdout):
    rows=[x.strip() for x in stdout.splitlines() if x.strip()]
    if len(rows)!=1 or not re.fullmatch(r'\d+(\|\d+){9}',rows[0]):
        raise ValueError('BAD_PSQL_AGGREGATE_CONTRACT')
    numbers=[int(x) for x in rows[0].split('|')]
    if any(x > 10**9 for x in numbers):raise ValueError('IMPLAUSIBLE_AGGREGATE')
    return dict(zip(COUNTS,numbers))


def interpret(c):
    if set(c)!=set(COUNTS) or any(type(c[k]) is not int or c[k]<0 for k in COUNTS):
        raise ValueError('UNTRUSTED_AGGREGATE')
    total=c['timetable_rows']
    if any(c[k]>total for k in COUNTS[1:8]) or c['teacher_assignment_active_rows']>c['teacher_assignment_rows']:
        raise ValueError('INCONSISTENT_AGGREGATE')
    if c['timetable_reviewed_staff_identity']+c['timetable_unreviewed_linked_identity'] != c['timetable_linked_teacher_ids']:
        raise ValueError('REVIEWED_UNREVIEWED_MISMATCH')
    blockers=[]
    if not total:blockers.append('NO_TIMETABLE_SOURCE')
    if c['timetable_missing_school_id']:blockers.append('TIMETABLE_HAS_UNSCOPED_TENANT_ROWS')
    if c['timetable_source_sha256']!=total:blockers.append('TIMETABLE_HAS_UNFINGERPRINTED_ROWS')
    if c['timetable_academic_session']!=total:blockers.append('TIMETABLE_HAS_SESSIONLESS_ROWS')
    if c['timetable_unreviewed_linked_identity']:
        blockers.append('TIMETABLE_TEACHER_IDS_NOT_INDEPENDENTLY_REVIEWED')
    if c['teacher_assignment_active_rows']==0:blockers.append('NO_ACTIVE_EXPLICIT_TEACHER_PRINT_ASSIGNMENTS')
    # Reviewed linkage is only evidence quality, never a privilege grant.
    return {'status':'HOLD_TEACHER_PRINT_ROLLOUT' if blockers else 'METADATA_PRECHECK_ONLY_REQUIRES_GENUINE_AUTH',
            'counts':{k:c[k] for k in COUNTS},'blockers':blockers,
            'timetable_automatically_grants_print_access':False,
            'authenticated_teacher_acl_verified':False,
            'independent_school2_denial_verified':False,
            'production_release_authorized':False,
            'database_mutation_performed':False,
            'source_type':'read_only_live_aggregate'}


def live(runner=subprocess.run):
    r=runner(PSQL,capture_output=True,text=True,timeout=18,check=False)
    if r.returncode!=0:raise RuntimeError('PSQL_READ_ONLY_EXECUTION_FAILED')
    return interpret(parse_counts(r.stdout))


def write_receipt(report,name):
    path=Path(name)
    if path.parent!=PRIVATE_DIR or not re.fullmatch(r'[a-z0-9-]+\.json',path.name):
        raise ValueError('OUTPUT_PATH_MUST_BE_PRIVATE')
    mode=os.lstat(PRIVATE_DIR).st_mode
    if not stat.S_ISDIR(mode) or stat.S_IMODE(mode)&0o077:raise ValueError('PRIVATE_DIR_NOT_RESTRICTED')
    fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
    with os.fdopen(fd,'w',encoding='utf-8') as f:
        json.dump(report,f,sort_keys=True,indent=2);f.write('\n')


def main():
    a=argparse.ArgumentParser(description=__doc__)
    a.add_argument('--live-readonly',action='store_true',required=True)
    a.add_argument('--receipt')
    args=a.parse_args()
    try:
        report=live()
        if args.receipt:write_receipt(report,args.receipt)
    except (OSError,ValueError,RuntimeError,subprocess.TimeoutExpired) as err:
        print(json.dumps({'status':'HOLD_READ_ONLY_PREFLIGHT_ERROR','error_type':type(err).__name__,
             'database_mutation_performed':False,'production_release_authorized':False},sort_keys=True))
        return 2
    print(json.dumps(report,sort_keys=True))
    return 2 if report['blockers'] else 0

if __name__=='__main__':sys.exit(main())
