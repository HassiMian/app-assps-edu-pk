#!/usr/bin/env python3
"""Only read-only reconciliation: staged Urdu 38 vs live result rows, old four vs frozen snapshot.

This is not an authenticated staff Save→GET witness, academic approval or a release cert.
No student PII, IDs, marks, passwords or database SQL are printed to stdout.
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

PRIVATE = Path('/root/assps-release-evidence/class-one-urdu-original-source-20261016')
LEGACY = Path('/root/assps-release-evidence/marks-save-p0-20261016/class-one-integrity-baseline-20261016.json')
ORIGINAL_SUBJECTS = ('English', 'Islamiyat', 'Mathematics', 'Science')


def load_private(path, expect_mode=0o600):
    info = path.lstat()
    if not stat.S_ISREG(info.st_mode) or info.st_uid != 0 or stat.S_IMODE(info.st_mode) != expect_mode:
        raise ValueError('UNTRUSTED_SOURCE_FILE')
    return json.loads(path.read_bytes())


def validate_stage(payload, source_receipt, auth_receipt):
    if not isinstance(payload, dict) or set(payload) != {'results'} or not isinstance(payload['results'], list) or len(payload['results']) != 38:
        raise ValueError('INVALID_38_RECORD_SOURCE')
    digest = hashlib.sha256(json.dumps(payload, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()
    if not (digest == source_receipt.get('payload_sha256') == auth_receipt.get('source_payload_sha256')):
        raise ValueError('SOURCE_DIGEST_CHANGED')
    allowed = {'exam_id', 'student_id', 'subject', 'total_marks', 'marks_obtained'}
    out = {}
    for row in payload['results']:
        if not isinstance(row, dict) or set(row) != allowed or type(row['student_id']) is not int or row['student_id'] <= 0 or type(row['exam_id']) is not int or row['exam_id'] != 9 or row['subject'] != 'Urdu':
            raise ValueError('SCHOOL_SOURCE_SCOPE_CHANGED')
        try:
            score = Decimal(str(row['marks_obtained']))
            total = Decimal(str(row['total_marks']))
        except (InvalidOperation, ValueError) as err:
            raise ValueError('INVALID_SOURCE_NUMERIC') from err
        if not score.is_finite() or not total.is_finite() or total != 50 or not (0 <= score <= 50):
            raise ValueError('SOURCE_SCORE_RANGE_CHANGED')
        if row['student_id'] in out:
            raise ValueError('DUPLICATE_PRIVATE_STUDENT')
        out[row['student_id']] = (score, total)
    if source_receipt.get('photo_rows') != 38 or source_receipt.get('exam_id') != 9 or source_receipt.get('school_id') != 1 or source_receipt.get('total_marks') != 50 or source_receipt.get('pass_marks') != 20:
        raise ValueError('SOURCE_APPROVAL_CONTEXT_CHANGED')
    if sum(v[0] for v in out.values()) != Decimal(str(source_receipt.get('score_sum'))):
        raise ValueError('SOURCE_TOTAL_CHANGED')
    return out, digest


def build_sql(ids):
    if len(ids) != 38 or len(set(ids)) != 38 or not all(type(k) is int and k > 0 for k in ids):
        raise ValueError('UNSAFE_SQL_SCOPE')
    csv = ','.join(map(str, sorted(ids)))
    return f"""SELECT 'URDU',student_id::text,marks_obtained::text,total_marks::text FROM exam_results WHERE school_id=1 AND exam_id=9 AND subject='Urdu' AND student_id IN ({csv}) ORDER BY student_id;
WITH named AS (
 SELECT r.id,r.student_id,r.exam_id,r.subject,r.marks_obtained,r.total_marks,r.school_id
 FROM public.exam_results r JOIN public.students s ON s.id=r.student_id AND s.school_id=r.school_id
 JOIN public.exams e ON e.id=r.exam_id AND e.school_id=r.school_id
 WHERE lower(trim(s.class))='one' AND e.name='First Term Exam'
 AND r.subject IN ('English','Islamiyat','Mathematics','Science')
)
SELECT 'ORIGINAL',subject,count(*)::int,count(*) FILTER(WHERE marks_obtained=0)::int,
 encode(digest(coalesce(string_agg(concat_ws(':',id,student_id,exam_id,subject,marks_obtained,total_marks,school_id),'|' ORDER BY id),'')::text,'sha256'),'hex') FROM named GROUP BY subject ORDER BY subject;
SELECT 'OFFERING',id::text,approval_revision::text,approval_status,coalesce(total_marks::text,'NULL'),coalesce(pass_marks::text,'NULL') FROM exam_subjects WHERE school_id=1 AND exam_id=9 AND class_name='One' AND section='Yellow' AND subject='Urdu';"""


def verify_response(raw, staged, baseline):
    actual = {}; originals = {}; offers = []
    for line in raw.splitlines():
        if not line.strip():
            continue
        parts = line.split('|')
        if parts[0] == 'URDU' and len(parts) == 4:
            key = int(parts[1]);value = Decimal(parts[2]), Decimal(parts[3])
            if key in actual:raise ValueError('DUPLICATE_LIVE_URDU')
            actual[key] = value
        elif parts[0] == 'ORIGINAL' and len(parts) == 5:
            subject = parts[1]
            if subject not in ORIGINAL_SUBJECTS or subject in originals:raise ValueError('UNEXPECTED_ORIGINAL_SUBJECT')
            originals[subject] = dict(saved_rows=int(parts[2]),genuine_zero_rows=int(parts[3]),integrity_sha256=parts[4])
        elif parts[0] == 'OFFERING' and len(parts) == 6:
            offers.append(parts[1:])
        else:raise ValueError('UNEXPECTED_DATABASE_RESPONSE')
    if set(actual) != set(staged) or any(actual[k] != staged[k] for k in staged):
        raise ValueError('STAGED_38_NOT_EXACTLY_STORED')
    expected = baseline.get('subjects', {})
    if set(originals) != set(ORIGINAL_SUBJECTS) or set(expected) != set(ORIGINAL_SUBJECTS) or originals != expected:
        raise ValueError('ORIGINAL_152_FINGERPRINT_DRIFT')
    if len(offers) != 1 or offers[0][0] != '38' or not re.fullmatch(r'[1-9][0-9]*', offers[0][1]):
        raise ValueError('SCHOOL_SUBJECT_OFFERING_AMBIGUOUS')
    if offers[0][2:] not in (['pending','NULL','NULL'],['approved','50','20']):
        raise ValueError('SUBJECT_APPROVAL_METADATA_CHANGED')
    return dict(urdu_saved=38, original_saved=sum(x['saved_rows'] for x in originals.values()),original_zeros=sum(x['genuine_zero_rows'] for x in originals.values()),subject_offering_status=offers[0][2])


def main():
    result = dict(schema='ASSPS_CLASS_ONE_POSTSAVE_IMMUTABLE_READONLY_V1',status='HOLD_SOURCE_OR_DB_UNVERIFIED',database_modified=False,release_certified=False,authenticated_staff_save_witnessed=False)
    try:
        directory = PRIVATE.lstat()
        if not stat.S_ISDIR(directory.st_mode) or directory.st_uid != 0 or stat.S_IMODE(directory.st_mode) != 0o700:
            raise ValueError('UNTRUSTED_PRIVATE_FOLDER')
        stage,digest = validate_stage(load_private(PRIVATE/'official-marks-payload-PRIVATE-UNSUBMITTED.json'),load_private(PRIVATE/'secure-preflight-receipt.json'),load_private(PRIVATE/'protected-authorization-gate.json'))
        old = load_private(LEGACY)
        if old.get('schema') != 'ASSPS_CLASS_ONE_MARKS_PRE_RECOVERY_INTEGRITY_V1':
            raise ValueError('LEGACY_BASELINE_UNTRUSTED')
        env={**os.environ,'PGOPTIONS':'-c default_transaction_read_only=on -c statement_timeout=12000'}
        p=subprocess.run(['runuser','-u','postgres','--','psql','-X','-t','-A','-F','|','-v','ON_ERROR_STOP=1','-d','apexos','-c',build_sql(list(stage))],env=env,capture_output=True,text=True,timeout=22)
        if p.returncode:raise ValueError('READONLY_DATABASE_UNAVAILABLE')
        details=verify_response(p.stdout,stage,old)
        result.update(details)
        result.update(status='MATCH_38_STAGED_TO_LIVE_AND_152_ORIGINAL_UNCHANGED',private_stage_canonical_sha256=digest)
    except (OSError, ValueError, KeyError, TypeError, json.JSONDecodeError, subprocess.SubprocessError, InvalidOperation):
        pass
    print(json.dumps(result,sort_keys=True))
    return 0 if result['status']=='MATCH_38_STAGED_TO_LIVE_AND_152_ORIGINAL_UNCHANGED' else 2

if __name__=='__main__':sys.exit(main())
