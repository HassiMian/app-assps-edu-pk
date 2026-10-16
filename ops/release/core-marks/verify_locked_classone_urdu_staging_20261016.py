#!/usr/bin/env python3
"""Fail-closed, READ-ONLY validation of private 38-row Class One Urdu recovery staging.

Never logs student names, IDs, individual scores or secrets; cannot post scores,
update subject offerings, mint staff credentials, or approve a production release.
"""
from decimal import Decimal, InvalidOperation
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys

PRIVATE_ROOT = Path('/root/assps-release-evidence/class-one-urdu-original-source-20261016')
PAYLOAD = 'official-marks-payload-PRIVATE-UNSUBMITTED.json'
SOURCE_RECEIPT = 'secure-preflight-receipt.json'
AUTH_RECEIPT = 'protected-authorization-gate.json'
OUTPUT = 'core-locked-readonly-preflight-20261016.json'
FROZEN_CHECKER = Path('/root/workspace/assps-marks-p0-recovery-integrity-20261016/ops/release/marks-save/verify_class_one_recovery_integrity_20261016.py')


def private_json(root, filename):
    d = root.lstat()
    if not stat.S_ISDIR(d.st_mode) or d.st_uid != 0 or stat.S_IMODE(d.st_mode) != 0o700:
        raise ValueError('UNTRUSTED_PRIVATE_DIRECTORY')
    path = root / filename
    info = path.lstat()
    if not stat.S_ISREG(info.st_mode) or info.st_uid != 0 or stat.S_IMODE(info.st_mode) != 0o600:
        raise ValueError('UNTRUSTED_PRIVATE_FILE')
    return json.loads(path.read_bytes())


def verify_payload(data, receipt, authorization):
    expected = {'exam_id', 'student_id', 'subject', 'total_marks', 'marks_obtained'}
    if not isinstance(data, dict) or set(data) != {'results'} or not isinstance(data['results'], list):
        raise ValueError('INVALID_PAYLOAD_SCHEMA')
    records = data['results']
    if len(records) != 38 or receipt.get('photo_rows') != 38:
        raise ValueError('EXPECTED_38_SOURCE_ROWS')
    digest = hashlib.sha256(json.dumps(data, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()
    if not all(isinstance(r.get('payload_sha256'), str) and r['payload_sha256'] == digest
               for r in [receipt, {'payload_sha256': authorization.get('source_payload_sha256')}]):
        raise ValueError('IMMUTABLE_SOURCE_RECEIPT_SHA_MISMATCH')
    ids = []
    marks_sum = Decimal(0)
    for row in records:
        if not isinstance(row, dict) or set(row) != expected:
            raise ValueError('UNEXPECTED_RECORD_FIELD')
        sid = row['student_id']
        if type(sid) is not int or sid <= 0 or type(row['exam_id']) is not int or row['exam_id'] != 9:
            raise ValueError('INVALID_SCHOOL_EXAM_STUDENT_ID')
        if row['subject'] != 'Urdu' or type(row['total_marks']) not in (int, float) or Decimal(str(row['total_marks'])) != 50:
            raise ValueError('INVALID_SUBJECT_TOTAL')
        if type(row['marks_obtained']) not in (int, float, str):
            raise ValueError('INVALID_MARK_TYPE')
        try:
            value = Decimal(str(row['marks_obtained']))
        except InvalidOperation as exc:
            raise ValueError('INVALID_MARK_NUMBER') from exc
        if not value.is_finite() or value < 20 or value > 50:
            raise ValueError('OUT_OF_APPROVED_RANGE')
        ids.append(sid)
        marks_sum += value
    if len(set(ids)) != 38 or marks_sum != Decimal(str(receipt.get('score_sum'))):
        raise ValueError('STUDENT_DUPLICATE_OR_SCORE_SUM_CHANGED')
    if receipt.get('exam_id') != 9 or receipt.get('school_id') != 1 or receipt.get('total_marks') != 50 or receipt.get('pass_marks') != 20:
        raise ValueError('ORIGINAL_AUTHORIZED_EXAM_RULES_CHANGED')
    if receipt.get('production_student_result_rows_modified') != 0 or authorization.get('upload_executed') is not False or authorization.get('upload_proof_obtained') is not False:
        raise ValueError('SOURCE_ALREADY_SUBMITTED_OR_UNVERIFIED')
    return ids, digest


def parse_database_facts(stdout):
    lines = {}
    for raw in stdout.splitlines():
        if not raw.strip():
            continue
        pair = raw.split('|')
        if pair[0] in lines:
            raise ValueError('DUPLICATE_DB_FACT')
        lines[pair[0]] = pair[1:]
    if set(lines) != {'students', 'four_original', 'urdu_existing', 'offering', 'grade_f'}:
        raise ValueError('MISSING_DB_FACTS')
    for key, expected in [('students', '38'), ('four_original', '152'), ('urdu_existing', '0')]:
        if lines[key] != [expected]:
            raise ValueError('SCHOOL_SCOPE_OR_EXISTING_MARKS_DRIFT')
    offer = lines['offering']
    if len(offer) != 6 or not all(re.fullmatch(r'[1-9][0-9]*', x) for x in offer[:2]) or offer[5] != 't':
        raise ValueError('SUBJECT_OFFERING_REVISION_OR_STATUS_INVALID')
    # Fail closed if actual tenant grading policy would not yield exactly 20/50.
    if lines['grade_f'] != ['0', '39']:
        raise ValueError('SCHOOL_GRADE_POLICY_CHANGED')
    approved = offer[2:] == ['approved', '50', '20', 't']
    pending = offer[2:] == ['pending', 'NULL', 'NULL', 't']
    if not (approved or pending):
        raise ValueError('UNEXPECTED_SUBJECT_MAXIMUM_OR_APPROVAL')
    return {'subject_offering_approved': approved, 'subject_offering_pending': pending,
            'offering_id': int(offer[0]), 'offering_revision': int(offer[1])}


def query_live_facts(student_ids):
    if len(student_ids) != 38 or len(set(student_ids)) != 38 or not all(type(n) is int and n > 0 for n in student_ids):
        raise ValueError('UNSAFE_QUERY_SCOPE')
    ids = ','.join(map(str, sorted(student_ids)))
    sql = f'''SELECT 'students',count(*) FROM students WHERE id IN ({ids}) AND school_id=1 AND class='One' AND section='Yellow' AND is_active=true;
SELECT 'four_original',count(*) FROM exam_results WHERE school_id=1 AND exam_id=9 AND student_id IN ({ids}) AND subject IN ('English','Islamiyat','Mathematics','Science');
SELECT 'urdu_existing',count(*) FROM exam_results WHERE school_id=1 AND exam_id=9 AND student_id IN ({ids}) AND subject='Urdu';
SELECT 'offering',id,approval_revision,approval_status,coalesce(total_marks::text,'NULL'),coalesce(pass_marks::text,'NULL'),is_active FROM exam_subjects WHERE school_id=1 AND exam_id=9 AND class_name='One' AND section='Yellow' AND subject='Urdu';
SELECT 'grade_f',min_percentage,max_percentage FROM grade_settings WHERE school_id=1 AND label='F';'''
    env = {**os.environ, 'PGOPTIONS': '-c default_transaction_read_only=on -c statement_timeout=12000'}
    p = subprocess.run(['runuser', '-u', 'postgres', '--', 'psql', '-X', '-A', '-t', '-F', '|', '-v', 'ON_ERROR_STOP=1', '-d', 'apexos', '-c', sql],
                       capture_output=True, text=True, env=env, timeout=17)
    if p.returncode:
        raise ValueError('READONLY_DATABASE_UNAVAILABLE')
    return parse_database_facts(p.stdout)


def baseline_intact():
    if not FROZEN_CHECKER.is_file() or FROZEN_CHECKER.is_symlink():
        raise ValueError('FROZEN_BASELINE_MISSING')
    p = subprocess.run([sys.executable, str(FROZEN_CHECKER)], capture_output=True, text=True, timeout=25)
    if p.returncode:
        raise ValueError('FROZEN_BASELINE_DRIFT')
    result = json.loads(p.stdout)
    if result.get('status') != 'CLASS_ONE_EXISTING_MARKS_INTACT_NOT_RECOVERED' or result.get('existing_rows') != 152 or result.get('existing_numeric_zero_rows') != 6:
        raise ValueError('FROZEN_BASELINE_INCONSISTENT')


def main():
    outcome = {'schema': 'ASSPS_CLASS_ONE_URDU_READONLY_LOCKED_RECOVERY_V1',
               'production_modified': False, 'scores_uploaded': False, 'release_authorized': False,
               'status': 'HOLD_UNVERIFIED'}
    try:
        source = private_json(PRIVATE_ROOT, PAYLOAD)
        receipt = private_json(PRIVATE_ROOT, SOURCE_RECEIPT)
        auth = private_json(PRIVATE_ROOT, AUTH_RECEIPT)
        ids, digest = verify_payload(source, receipt, auth)
        facts = query_live_facts(ids)
        baseline_intact()
        outcome.update({'source_canonical_sha256': digest, 'private_students_checked': 38,
                        'original_marks_unchanged': 152, 'original_numeric_zeros_unchanged': 6,
                        'urdu_marks_currently_saved': 0, 'subject_approved': facts['subject_offering_approved'],
                        'official_subject_offering_id': facts['offering_id'],
                        'official_subject_expected_revision': facts['offering_revision'],
                        'school_grade_F_max_percentage': 39, 'school_pass_threshold_for_50': 20,
                        'status': 'HOLD_AUTHENTICATED_STAFF_SAVE' if facts['subject_offering_approved'] else 'HOLD_SUBJECT_APPROVAL_AND_STAFF_SAVE'})
    except (OSError, json.JSONDecodeError, TypeError, ValueError, subprocess.SubprocessError, KeyError):
        outcome['status'] = 'HOLD_SOURCE_OR_DATABASE_INTEGRITY'
    output = PRIVATE_ROOT / OUTPUT
    try:
        fd = os.open(output, os.O_WRONLY | os.O_CREAT | os.O_TRUNC | getattr(os,'O_NOFOLLOW',0), 0o600)
        with os.fdopen(fd, 'w') as fp:
            json.dump(outcome, fp, indent=2, sort_keys=True)
            fp.write('\n')
    except OSError:
        outcome['status'] = 'HOLD_PRIVATE_RECEIPT_UNAVAILABLE'
    print(json.dumps(outcome, sort_keys=True))
    return 2  # Explicitly never grants release or writes marks.


if __name__ == '__main__':
    sys.exit(main())
