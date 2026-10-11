#!/usr/bin/env python3
"""Read-only ASSPS First Term source-of-truth catalog and roster diagnostics.

Prints aggregate counts only; no student identity, marks or login secrets.
Does NOT modify school enrollment, exam records, subject mappings or permissions.
"""
import subprocess
import sys
from collections import defaultdict

PORT='5432'
DB='apexos'
ORDER='Starter Mover Flyer One Two Three Four Five Six Seven Eight Pre_Nine Nine Ten'.split()
RANK={name.replace('_',' '):i for i,name in enumerate(ORDER)}

def sql(query):
    proc=subprocess.run(['runuser','-u','postgres','--','psql','-X','-A','-t','-F','|',
       '-v','ON_ERROR_STOP=1','-p',PORT,'-d',DB,'-c',query],text=True,
       capture_output=True,timeout=20)
    if proc.returncode:raise RuntimeError('Read-only catalog query failed')
    return [line.strip().split('|') for line in proc.stdout.splitlines() if line.strip()]

def main():
    identity=sql("SELECT current_database(),current_setting('port')")
    if identity!=[[DB,PORT]]:raise RuntimeError('Not intended live catalog')
    exam=sql("SELECT id,name,type,class,session,school_id::text FROM public.exams WHERE id=9 AND school_id=1")
    if len(exam)!=1 or exam[0]!=['9','First Term Exam','TE','All Classes','2026-2027','1']:
        raise RuntimeError('Canonical First Term Exam 9 source changed')
    print('CANONICAL_FIRST_TERM_EXAM_9_SOURCE_PASS')
    offerings=sql("SELECT class_name,COALESCE(section,''),COUNT(*)::text FROM public.exam_subjects WHERE school_id=1 AND exam_id=9 AND is_active GROUP BY class_name,section")
    if sum(int(row[2]) for row in offerings)!=81:
        raise RuntimeError('First Term exam-subject baseline changed; independent review required')
    print('FIRST_TERM_SUBJECT_ROWS_81_INTACT_PASS')
    students=sql("SELECT class,COUNT(*)::text FROM public.students WHERE school_id=1 GROUP BY class")
    totals=defaultdict(int)
    for name,section,num in offerings:totals[name]+=int(num)
    population={name:int(num) for name,num in students}
    for name in sorted(totals.keys() | population.keys(),key=lambda x:(RANK.get(x,99),x)):
        # Summary contains counts only, not identifiable records.
        print('CLASS='+name.replace('|','/').replace('\n',' ')+' EXAM_SUBJECTS='+str(totals.get(name,0))+' STUDENTS='+str(population.get(name,0)))
    warnings=[]
    for name in sorted(totals.keys() | population.keys()):
        if totals.get(name,0) and not population.get(name,0):warnings.append(name+':EXAM_SUBJECTS_WITH_NO_ENROLMENT')
        if population.get(name,0) and not totals.get(name,0):warnings.append(name+':ENROLMENT_WITH_NO_EXAM_SUBJECTS')
    if warnings:
        print('CATALOG_TO_ENROLLMENT_REVIEW_REQUIRED='+';'.join(warnings))
    print('READ_ONLY_NO_STUDENT_IDENTITY_NO_MUTATIONS')
    return 0

if __name__=='__main__':
    try:sys.exit(main())
    except Exception as exc:
        print('FIRSTTERM_CATALOG_READONLY_NO_GO '+str(exc),file=sys.stderr)
        sys.exit(2)
