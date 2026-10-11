#!/usr/bin/env python3
"""Guarded emergency-only reverse of the 11-student Eight cohort correction.

DEFAULT = inspection only. Must NEVER run during ordinary marks entry.
Two execution flags and independent authorized DBA signoff are required.
Always perform on a disposable restored clone before any approved production
reversal. SQL never touches Class Nine or other tenants.
"""
import argparse
import hashlib
import os
import stat
import subprocess
import sys
from pathlib import Path

IDS=(643,651,673,699,704,776,800,807,882,903,915)
SNAPSHOT=Path('/root/assps-release-backups/cohort-recovery-20261011/pre_nine_before_state.json')
SHA='d85acd3f5bf70f33c6d50cb0e2353419e3cfce80ded46521263b96bbe7dfd021'
CLONE='assps_promote_audit_rehearsal_20261011'


def psql(port,database,sql):
    args=['runuser','-u','postgres','--','psql','-X','-A','-t','-v','ON_ERROR_STOP=1','-p',port,'-d',database]
    result=subprocess.run(args,input=sql,text=True,capture_output=True,timeout=40)
    if result.returncode:
        raise RuntimeError('PostgreSQL guarded request failed rc='+str(result.returncode))
    return [x.strip() for x in result.stdout.splitlines() if x.strip()]

def validate_before(port,database):
    if os.geteuid()!=0:raise RuntimeError('Approved administrator session required')
    if (port,database) not in (('5432','apexos'),('55432',CLONE)):
        raise RuntimeError('Database target refused')
    identity=psql(port,database,"SELECT current_database()||'|'||current_setting('port')||'|'||current_user")
    if identity!=[f'{database}|{port}|postgres']:raise RuntimeError('Database identity mismatch')
    ids=','.join(str(x) for x in IDS)
    summary=psql(port,database,f"""SELECT
      (SELECT count(*) FROM students WHERE school_id=1 AND id=ANY(ARRAY[{ids}]))::text||'|'||
      (SELECT count(*) FROM students WHERE school_id=1 AND id=ANY(ARRAY[{ids}]) AND class='Eight' AND section='Blue')::text||'|'||
      (SELECT count(*) FROM students WHERE school_id=1 AND class='Pre Nine')::text||'|'||
      (SELECT count(*) FROM students WHERE school_id=1)::text;""")
    if summary!=['11|11|0|318']:
        raise RuntimeError('Cohort/other school enrollment changed; no automatic reversal permitted')
    print('PRE_REVERSAL_READONLY_EXACT_COHORT_CHECK_PASS')
    if database=='apexos':
        m=SNAPSHOT.stat()
        if m.st_uid!=0 or stat.S_IMODE(m.st_mode)!=0o600 or hashlib.sha256(SNAPSHOT.read_bytes()).hexdigest()!=SHA:
            raise RuntimeError('Original protected cohort snapshot integrity mismatch')
        print('ORIGINAL_COHORT_PROTECTED_SNAPSHOT_SHA256_PASS')


def execute(port,database):
    ids=','.join(str(x) for x in IDS)
    sql=f"""BEGIN;
DO $guard$
DECLARE locked_count integer; updated_count integer; audited_count integer;
BEGIN
  IF current_user <> 'postgres' OR current_database() <> '{database}' OR current_setting('port') <> '{port}' THEN
    RAISE EXCEPTION 'Wrong database identity'; END IF;
  SELECT count(*) INTO locked_count FROM (
    SELECT id FROM students WHERE school_id=1 AND id=ANY(ARRAY[{ids}])
      AND class='Eight' AND section='Blue' FOR UPDATE
  ) scoped;
  IF locked_count <> 11 OR (SELECT count(*) FROM students WHERE school_id=1 AND class='Pre Nine') <> 0 THEN
    RAISE EXCEPTION 'School/class cohort no longer matches signed restoration'; END IF;
  UPDATE students SET class='Pre Nine', section='Blue', updated_at=NOW()
   WHERE school_id=1 AND id=ANY(ARRAY[{ids}]) AND class='Eight' AND section='Blue';
  GET DIAGNOSTICS updated_count=ROW_COUNT;
  IF updated_count <> 11 THEN RAISE EXCEPTION 'Atomic student update incomplete'; END IF;
  INSERT INTO public.student_class_movement_audit
   (school_id,student_id,source_class,source_section,target_class,target_section,reason,moved_by,reversal_sql)
  SELECT school_id,id,'Eight','Blue','Pre Nine','Blue',
   'AUTHORIZED EMERGENCY REVERSAL ONLY','AUTHORIZED_DBA',
   'Manual independent DBA restore requires student/section verification; no auto SQL'
   FROM students WHERE school_id=1 AND id=ANY(ARRAY[{ids}]) AND class='Pre Nine' AND section='Blue';
  GET DIAGNOSTICS audited_count=ROW_COUNT;
  IF audited_count <> 11 THEN RAISE EXCEPTION 'Audit log insert incomplete'; END IF;
END $guard$;
COMMIT;"""
    psql(port,database,sql)
    print('EXPLICITLY_AUTHORIZED_COHORT_REVERSAL_AND_AUDIT_COMMITTED')


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--port',default='5432')
    parser.add_argument('--database',default='apexos')
    parser.add_argument('--execute',action='store_true')
    parser.add_argument('--acknowledge-separate-reversal-authorization',action='store_true')
    args=parser.parse_args()
    validate_before(args.port,args.database)
    if not args.execute:
        print('PLAN_ONLY_NO_STUDENT_MOVEMENT')
        return 0
    if not args.acknowledge_separate_reversal_authorization:
        raise RuntimeError('Independent reversal authorization missing')
    execute(args.port,args.database)
    return 0

if __name__=='__main__':
    try:sys.exit(main())
    except Exception as error:
        print('EMERGENCY_REVERSAL_REFUSED '+type(error).__name__,file=sys.stderr)
        sys.exit(2)
