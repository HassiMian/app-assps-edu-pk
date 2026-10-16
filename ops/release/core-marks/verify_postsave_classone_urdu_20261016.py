#!/usr/bin/env python3
"""Independently verify protected Class One Urdu POST-save evidence. READ ONLY.

This is not a replay, subject approval, impersonation or publication tool.
Never log student names, IDs, per-student marks or teacher tokens.
"""
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys

from verify_locked_classone_urdu_staging_20261016 import (
    PRIVATE_ROOT, PAYLOAD, SOURCE_RECEIPT, AUTH_RECEIPT, FROZEN_CHECKER, private_json,
)


def validate_postsave_source(payload, before, after):
    if not isinstance(payload, dict) or set(payload) != {'results'} or not isinstance(payload['results'], list):
        raise ValueError('PRIVATE_SOURCE_SCHEMA_CHANGED')
    digest = hashlib.sha256(json.dumps(payload, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()
    if not isinstance(before.get('source_payload_sha256'), str) or not (
            before['source_payload_sha256'] == after.get('payload_sha256') == digest):
        raise ValueError('SOURCE_TWO_RECEIPTS_DIGEST_MISMATCH')
    if before.get('upload_executed') is not False or before.get('upload_proof_obtained') is not False:
        raise ValueError('ORIGINAL_PREUPLOAD_GATE_NOT_FROZEN')
    if after.get('upload_executed') is not True or after.get('upload_proof_obtained') is not True:
        raise ValueError('NO_AUTHENTIC_SAVE_EVIDENCE')
    if not (after.get('verified_rows_exact') == 38 and after.get('production_student_result_rows_modified') == 38
            and after.get('verified_before_152_fingerprint_same') is True
            and after.get('write_state') == 'PERSISTED_VERIFIED_2026-10-16'
            and after.get('exam_id') == 9 and after.get('school_id') == 1
            and after.get('total_marks') == 50 and after.get('pass_marks') == 20):
        raise ValueError('POSTSAVE_RECEIPT_INCONSISTENT')
    rows = payload['results']
    if len(rows) != 38 or before.get('existing_four_subject_rows') != 152 or after.get('photo_rows') != 38:
        raise ValueError('EXPECTED_COHORT_CHANGED')
    expected = {}
    score_sum = Decimal(0)
    for row in rows:
        if not isinstance(row, dict) or set(row) != {'exam_id','student_id','subject','total_marks','marks_obtained'}:
            raise ValueError('UNSAFE_OR_UNEXPECTED_SOURCE_ROW')
        sid = row['student_id']
        if type(sid) is not int or sid <= 0 or sid in expected or type(row['exam_id']) is not int or row['exam_id'] != 9 or row['subject'] != 'Urdu':
            raise ValueError('DUPLICATE_OR_OUT_OF_SCOPE_SOURCE')
        try:
            mark = Decimal(str(row['marks_obtained']))
            total = Decimal(str(row['total_marks']))
        except (InvalidOperation, TypeError) as exc:
            raise ValueError('NON_NUMERIC_SOURCE_SCORE') from exc
        if not mark.is_finite() or not total.is_finite() or total != 50 or not (20 <= mark <= 50):
            raise ValueError('SOURCE_SCORE_OR_MAXIMUM_CHANGED')
        expected[sid] = (mark, total)
        score_sum += mark
    if score_sum != Decimal(str(after.get('score_sum'))):
        raise ValueError('SOURCE_SCORE_SUM_DRIFT')
    return expected, digest


def compare_persisted_scores(expected, stdout):
    actual = {}
    grades = {}
    for line in stdout.splitlines():
        parts = line.split('|')
        if len(parts) != 6 or not re.fullmatch(r'[0-9]+', parts[0]):
            raise ValueError('MALFORMED_DATABASE_SCORE_RESULT')
        sid = int(parts[0])
        if sid in actual or parts[3:] and (parts[3] != '1' or parts[4] != '9'):
            raise ValueError('DUPLICATE_OR_WRONG_TENANT_RESULT')
        try:
            mark, total = Decimal(parts[1]), Decimal(parts[2])
        except InvalidOperation as exc:
            raise ValueError('INVALID_DATABASE_NUMERIC') from exc
        grade = parts[5]
        if not mark.is_finite() or not total.is_finite() or grade in ('', 'F', '<NULL>'):
            raise ValueError('MISSING_OR_FAILING_SAVED_GRADE')
        actual[sid] = (mark,total)
        grades[grade] = grades.get(grade,0)+1
    if set(actual) != set(expected) or len(actual) != 38 or any(actual[k]!=v for k,v in expected.items()):
        raise ValueError('STUDENT_MARKS_TOTAL_OR_ID_MISMATCH')
    return {'verified_exact_rows':38, 'mismatch_count':0, 'grade_count_total':sum(grades.values())}


def query_source_data(expected):
    if len(expected) != 38 or any(type(sid) is not int or sid <= 0 for sid in expected):
        raise ValueError('UNSAFE_QUERY_IDENTIFIERS')
    ids=','.join(map(str,sorted(expected)))
    sql=f"""SELECT er.student_id,er.marks_obtained,er.total_marks,er.school_id,er.exam_id,coalesce(er.grade,'<NULL>')
      FROM public.exam_results er JOIN public.students s ON s.id=er.student_id AND s.school_id=er.school_id
      WHERE er.school_id=1 AND s.school_id=1 AND s.class='One' AND s.section='Yellow'
        AND s.is_active=true AND er.exam_id=9 AND er.subject='Urdu' AND er.student_id IN ({ids}) ORDER BY er.student_id;"""
    return read_only_query(sql)


def read_only_query(sql):
    env = {**os.environ, 'PGOPTIONS':'-c default_transaction_read_only=on -c statement_timeout=12000'}
    p=subprocess.run(['runuser','-u','postgres','--','psql','-X','-A','-t','-F','|','-v','ON_ERROR_STOP=1','-d','apexos','-c',sql],
                     capture_output=True,text=True,env=env,timeout=18)
    if p.returncode:
        raise ValueError('READONLY_POSTGRESQL_UNAVAILABLE')
    return p.stdout


def verify_frozen_four_subjects():
    if FROZEN_CHECKER.is_symlink() or not FROZEN_CHECKER.is_file():
        raise ValueError('MISSING_FROZEN_CHECKER')
    spec=importlib.util.spec_from_file_location('frozen_classone_20261016',FROZEN_CHECKER)
    mod=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    original=json.loads(mod.BASELINE.read_text())
    if original.get('schema')!='ASSPS_CLASS_ONE_MARKS_PRE_RECOVERY_INTEGRITY_V1':
        raise ValueError('INVALID_ORIGINAL_BASELINE')
    needle="WHERE lower(trim(s.class))='one' AND e.name='First Term Exam'"
    if mod.SQL.count(needle)!=1:
        raise ValueError('FROZEN_SQL_SCOPE_CHANGED')
    sql=mod.SQL.replace(needle,needle+" AND r.subject IN ('English','Islamiyat','Mathematics','Science')")
    actual=mod.parse_snapshot(read_only_query(sql))
    if mod.verdict(original['subjects'],actual)!='CLASS_ONE_EXISTING_MARKS_INTACT_NOT_RECOVERED':
        raise ValueError('ORIGINAL_152_FINGERPRINT_CHANGED')
    if sum(x['saved_rows'] for x in actual.values())!=152 or sum(x['genuine_zero_rows'] for x in actual.values())!=6:
        raise ValueError('ORIGINAL_152_COUNT_OR_ZEROS_CHANGED')
    return {'original_four_subject_rows':152,'original_genuine_zeros':6}


def check_academic_offering():
    sql="""SELECT id,approval_revision,approval_status,coalesce(total_marks::text,'NULL'),coalesce(pass_marks::text,'NULL')
    FROM public.exam_subjects WHERE school_id=1 AND exam_id=9 AND class_name='One' AND section='Yellow' AND subject='Urdu' AND is_active=true;"""
    rows=[s.split('|') for s in read_only_query(sql).splitlines() if s]
    if len(rows)!=1 or len(rows[0])!=5 or rows[0][0]!='38' or not re.fullmatch(r'[1-9][0-9]*',rows[0][1]):
        raise ValueError('ACADEMIC_OFFERING_CHANGED_OR_NOT_UNIQUE')
    a=rows[0]
    pending=a[2:]==['pending','NULL','NULL']
    approved=a[2:]==['approved','50','20']
    if not (pending or approved):
        raise ValueError('ACADEMIC_SUBJECT_POLICY_INCONSISTENT')
    return {'subject_approved':approved,'subject_revision':int(a[1]),'subject_offering_id':38}


def main():
    status={'schema':'ASSPS_CLASS_ONE_URDU_POSTSAVE_READONLY_VERIFY_V1',
            'production_write_performed_by_this_check':False,
            'subject_approval_performed':False,'full_production_release_authorized':False,
            'status':'HOLD_POSTSAVE_SOURCE_OR_DATABASE_INTEGRITY'}
    try:
        root=PRIVATE_ROOT
        source=private_json(root,PAYLOAD)
        old=private_json(root,AUTH_RECEIPT)
        new=private_json(root,SOURCE_RECEIPT)
        expected,digest=validate_postsave_source(source,old,new)
        stored=compare_persisted_scores(expected,query_source_data(expected))
        baseline=verify_frozen_four_subjects()
        academic=check_academic_offering()
        status.update(stored)
        status.update(baseline)
        status.update(academic)
        status.update({'source_canonical_sha256':digest,
                       'status':'SAVED_38_EXACT_SUBJECT_APPROVAL_PENDING' if not academic['subject_approved']
                                else 'SAVED_38_EXACT_POLICY_APPROVED_FULL_RELEASE_HOLD'})
    except (OSError,ValueError,TypeError,KeyError,json.JSONDecodeError,subprocess.SubprocessError) as exc:
        status['failure_code']=str(exc).split(':')[0][:110]
    # Use O_EXCL and a fresh, private, immutable metadata receipt per verification;
    # never overwrite historic source/approval/write proofs.
    try:
        if PRIVATE_ROOT.is_dir() and not PRIVATE_ROOT.is_symlink():
            stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
            receipt=PRIVATE_ROOT/('core-postsave-verified-'+stamp+'.json')
            fd=os.open(receipt,os.O_WRONLY|os.O_CREAT|os.O_EXCL|getattr(os,'O_NOFOLLOW',0),0o600)
            with os.fdopen(fd,'w') as f:
                json.dump(status,f,sort_keys=True,indent=2)
                f.write('\n')
    except OSError:
        status['status']='HOLD_PRIVATE_AUDIT_RECEIPT_UNAVAILABLE'
    print(json.dumps(status,sort_keys=True))
    # Explicitly never a valid deployment/publication approval signal.
    return 2

if __name__=='__main__':
    sys.exit(main())
