#!/usr/bin/env python3
"""Verify *existing* Class One exam marks remain untouched. No DML. No replay."""
import json
import os
from pathlib import Path
import re
import subprocess
import sys

BASELINE = Path('/root/assps-release-evidence/marks-save-p0-20261016/class-one-integrity-baseline-20261016.json')
EXPECTED_SUBJECTS = {'English', 'Islamiyat', 'Mathematics', 'Science'}
SQL = """
WITH named AS (
 SELECT r.id, r.student_id, r.exam_id, r.subject, r.marks_obtained,
        r.total_marks, r.school_id
 FROM public.exam_results r
 JOIN public.students s ON s.id=r.student_id AND s.school_id=r.school_id
 JOIN public.exams e ON e.id=r.exam_id AND e.school_id=r.school_id
 WHERE lower(trim(s.class))='one' AND e.name='First Term Exam'
)
SELECT subject,count(*)::int,count(*) FILTER (WHERE marks_obtained=0)::int,
 encode(digest(coalesce(string_agg(
  concat_ws(':',id,student_id,exam_id,subject,marks_obtained,total_marks,school_id),
  '|' ORDER BY id),'')::text,'sha256'),'hex')
FROM named GROUP BY subject ORDER BY subject;
"""


def parse_snapshot(stdout):
    outcome = {}
    for line in stdout.splitlines():
        parts = line.split('|')
        if len(parts) != 4:
            raise ValueError('INVALID_READONLY_SQL_OUTPUT')
        subject, count, zeros, digest = parts
        if subject in outcome or subject not in EXPECTED_SUBJECTS:
            raise ValueError('UNEXPECTED_OR_DUPLICATE_SUBJECT')
        if not re.fullmatch(r'[0-9]+',count) or not re.fullmatch(r'[0-9]+',zeros):
            raise ValueError('INVALID_COUNT')
        if not re.fullmatch(r'[0-9a-f]{64}',digest):
            raise ValueError('INVALID_DIGEST')
        outcome[subject] = {
            'saved_rows':int(count), 'genuine_zero_rows':int(zeros),
            'integrity_sha256':digest,
        }
    if set(outcome) != EXPECTED_SUBJECTS:
        raise ValueError('MISSING_CLASS_ONE_SUBJECT')
    return outcome


def verdict(original, now):
    if not original or set(original) != EXPECTED_SUBJECTS or set(now) != EXPECTED_SUBJECTS:
        return 'HOLD_INCOMPLETE_BASELINE'
    for subject in EXPECTED_SUBJECTS:
        a,b=original[subject],now[subject]
        if any(a.get(k)!=b.get(k) for k in ('saved_rows','genuine_zero_rows','integrity_sha256')):
            return 'HOLD_EXISTING_MARKS_CHANGED_REVIEW_REQUIRED'
    return 'CLASS_ONE_EXISTING_MARKS_INTACT_NOT_RECOVERED'


def main():
    try:
        st=BASELINE.stat()
        if st.st_uid != 0 or st.st_mode & 0o077:
            raise ValueError('ROOT_ONLY_BASELINE_PERMISSIONS')
        original=json.loads(BASELINE.read_text())
        if original.get('database_modified') is not False or original.get('marks_recovered') is not False:
            raise ValueError('BASELINE_PROVENANCE_CHANGED')
        if original.get('schema')!='ASSPS_CLASS_ONE_MARKS_PRE_RECOVERY_INTEGRITY_V1':
            raise ValueError('BASELINE_SCHEMA_CHANGED')
        expected=original['subjects']
        env={**os.environ, 'PGOPTIONS':'-c default_transaction_read_only=on -c statement_timeout=12000'}
        result=subprocess.run([
            'runuser','-u','postgres','--','psql','-X','-v','ON_ERROR_STOP=1',
            '-A','-F','|','-t','-d','apexos','-c',SQL
        ],env=env,text=True,capture_output=True,check=True,timeout=18)
        actual=parse_snapshot(result.stdout)
        state=verdict(expected,actual)
        receipt={'schema':'ASSPS_CLASS_ONE_EXISTING_MARKS_VERIFY_V1',
                 'status':state,'existing_rows':sum(x['saved_rows'] for x in actual.values()),
                 'existing_numeric_zero_rows':sum(x['genuine_zero_rows'] for x in actual.values()),
                 'database_modified':False,'recovered_missing_scores':False,
                 'production_release_authorized':False}
        print(json.dumps(receipt,sort_keys=True))
        return 0 if state=='CLASS_ONE_EXISTING_MARKS_INTACT_NOT_RECOVERED' else 2
    except (OSError,ValueError,KeyError,subprocess.SubprocessError):
        print(json.dumps({'status':'HOLD_BASELINE_OR_DATABASE_UNAVAILABLE',
             'database_modified':False,'recovered_missing_scores':False,
             'production_release_authorized':False},sort_keys=True))
        return 2


if __name__=='__main__':
    sys.exit(main())
