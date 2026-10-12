#!/usr/bin/env python3
"""ASSPS school1 read-only attendance/fees/student relational integrity snapshot."""
import subprocess
import sys

SQL="""BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT 'STUDENTS',count(*) FROM students WHERE school_id=1;
SELECT 'ATTENDANCE',count(*) FROM attendance WHERE school_id=1;
SELECT 'FEE_CHALLANS',count(*) FROM fee_challans WHERE school_id=1;
SELECT 'PAYMENT_LEDGER',count(*) FROM fee_payment_transactions WHERE school_id=1;
SELECT 'FIRST_TERM_EIGHT',count(*) FROM students WHERE school_id=1 AND class='Eight' AND section='Blue';
SELECT 'PRE_NINE',count(*) FROM students WHERE school_id=1 AND class='Pre Nine';
SELECT 'ATTENDANCE_BAD_STUDENT_LINK',count(*) FROM attendance a LEFT JOIN students s ON s.id=a.student_id AND s.school_id=a.school_id WHERE a.school_id=1 AND s.id IS NULL;
SELECT 'FEE_CHALLAN_BAD_STUDENT_LINK',count(*) FROM fee_challans f LEFT JOIN students s ON s.id=f.student_id AND s.school_id=f.school_id WHERE f.school_id=1 AND s.id IS NULL;
SELECT 'FEE_PROFILE_BAD_STUDENT_LINK',count(*) FROM student_fee_profiles p LEFT JOIN students s ON s.id=p.student_id AND s.school_id=p.school_id WHERE p.school_id=1 AND s.id IS NULL;
SELECT 'PAYMENT_BAD_STUDENT_OR_CHALLAN_LINK',count(*) FROM fee_payment_transactions t LEFT JOIN students s ON s.id=t.student_id AND s.school_id=t.school_id LEFT JOIN fee_challans f ON f.id=t.challan_id AND f.school_id=t.school_id AND f.student_id=t.student_id WHERE t.school_id=1 AND (s.id IS NULL OR f.id IS NULL);
SELECT 'DUPLICATE_ATTENDANCE_STUDENT_DAY',coalesce(sum(c-1),0)::bigint FROM (SELECT count(*) c FROM attendance WHERE school_id=1 GROUP BY student_id,date HAVING count(*)>1) q;
SELECT 'NEGATIVE_FEE_CHALLAN_AMOUNTS',count(*) FROM fee_challans WHERE school_id=1 AND (amount<0 OR paid_amount<0 OR remaining_balance<0);
SELECT 'NEGATIVE_PAYMENT_LEDGER_AMOUNTS',count(*) FROM fee_payment_transactions WHERE school_id=1 AND (amount<0 OR cumulative_paid<0);
COMMIT;
"""
COUNT_NAMES={'STUDENTS','ATTENDANCE','FEE_CHALLANS','PAYMENT_LEDGER','FIRST_TERM_EIGHT','PRE_NINE'}
GUARD_NAMES={'ATTENDANCE_BAD_STUDENT_LINK','FEE_CHALLAN_BAD_STUDENT_LINK','FEE_PROFILE_BAD_STUDENT_LINK',
 'PAYMENT_BAD_STUDENT_OR_CHALLAN_LINK','DUPLICATE_ATTENDANCE_STUDENT_DAY','NEGATIVE_FEE_CHALLAN_AMOUNTS','NEGATIVE_PAYMENT_LEDGER_AMOUNTS'}

def parse_result(stdout):
    values={}
    lines=[line.strip() for line in stdout.splitlines() if line.strip()]
    if not lines or lines[0]!='BEGIN' or lines[-1]!='COMMIT':
        raise ValueError('Non-transactional SQL output')
    for line in lines[1:-1]:
        name,sep,value=line.partition('|')
        if not sep or name in values or name not in COUNT_NAMES|GUARD_NAMES or not value.isdecimal():
            raise ValueError('Unexpected integrity result')
        values[name]=int(value)
    if set(values)!=COUNT_NAMES|GUARD_NAMES:raise ValueError('Integrity query coverage incomplete')
    return values

def main():
    result=subprocess.run(['runuser','-u','postgres','--','psql','-X','-A','-t',
        '-v','ON_ERROR_STOP=1','-p','5432','-d','apexos'],input=SQL,text=True,capture_output=True,timeout=24)
    if result.returncode:raise RuntimeError('PostgreSQL read-only integrity snapshot unavailable')
    values=parse_result(result.stdout)
    for name in sorted(COUNT_NAMES): print('COUNT '+name+'='+str(values[name]))
    for name in sorted(GUARD_NAMES): print(('PASS' if values[name]==0 else 'FAIL')+' '+name+'='+str(values[name]))
    print('READ_ONLY_REPEATABLE_READ_SNAPSHOT=PASS')
    return 0 if all(values[n]==0 for n in GUARD_NAMES) else 2

if __name__=='__main__':
    try:sys.exit(main())
    except Exception as error:
        print('DATA_INTEGRITY_AUDIT_FAILED '+type(error).__name__,file=sys.stderr)
        sys.exit(2)
