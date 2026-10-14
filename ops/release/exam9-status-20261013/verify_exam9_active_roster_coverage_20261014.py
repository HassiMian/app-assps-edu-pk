#!/usr/bin/env python3
"""Read-only live Exam9 coverage by active enrolled class/section and subject.

Only aggregated school1 data leaves PostgreSQL, no student identities. A source
offering without a result is not a numeric zero; retired/inactive cohorts do
not create synthetic missing marks. No marks/review/permissions are modified.
"""
import json
import subprocess
import sys

QUERY = r"""
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
WITH
 rosters AS (
   SELECT class AS class_name, section, count(*)::int AS pupils
   FROM students WHERE school_id=1 AND is_active=true
   GROUP BY class, section
 ),
 saved AS (
   SELECT s.class AS class_name, s.section, lower(btrim(r.subject)) AS subj,
     count(*)::int AS saved, count(*) FILTER(WHERE r.marks_obtained=0)::int AS zeros,
     min(r.total_marks) AS minimum_total, max(r.total_marks) AS maximum_total
   FROM exam_results r JOIN students s ON s.id=r.student_id AND s.school_id=1
   WHERE r.school_id=1 AND r.exam_id=9
   GROUP BY s.class, s.section, lower(btrim(r.subject))
 ),
 offers AS (
   SELECT id,class_name,section,subject,lower(btrim(subject)) AS subj,
     total_marks, approval_status, is_active
   FROM exam_subjects WHERE school_id=1 AND exam_id=9 AND is_active=true
 ),
 coverage AS (
   SELECT e.id,e.class_name,e.section,e.subject,coalesce(ro.pupils,0) AS pupils,
     coalesce(sa.saved,0) AS saved,coalesce(sa.zeros,0) AS zeros,
     sa.minimum_total,sa.maximum_total,e.total_marks AS approved_maximum
   FROM offers e
   LEFT JOIN rosters ro ON ro.class_name=e.class_name AND ro.section=e.section
   LEFT JOIN saved sa ON sa.class_name=e.class_name AND sa.section=e.section AND sa.subj=e.subj
 ),
 integrity AS (
   SELECT count(*)::int AS result_count,
     count(*) FILTER(WHERE r.marks_obtained=0)::int AS real_zero_scores,
     count(*) FILTER(WHERE r.total_marks<=0 OR r.marks_obtained<0
                      OR r.marks_obtained>r.total_marks)::int AS invalid_bounds,
     count(*)::int - count(DISTINCT (r.student_id,r.subject))::int AS duplicate_student_subject
   FROM exam_results r WHERE r.school_id=1 AND r.exam_id=9
 ),
 original AS (
   SELECT count(*)::int AS original_rows,
     count(*) FILTER(WHERE marks_obtained=0)::int AS original_zeros,
     md5(string_agg(concat_ws('|',id,exam_id,student_id,subject,marks_obtained,total_marks),
          E'\n' ORDER BY id)) AS original_score_hash
   FROM exam_results WHERE school_id=1 AND exam_id=9 AND id<=306
 ),
 mismatched AS (
   SELECT s.class AS class_name,s.section,r.subject,count(*)::int AS count
   FROM exam_results r JOIN students s ON s.id=r.student_id AND s.school_id=1
   WHERE r.school_id=1 AND r.exam_id=9 AND NOT EXISTS
     (SELECT 1 FROM offers e WHERE e.class_name=s.class AND e.section=s.section
        AND e.subj=lower(btrim(r.subject)))
   GROUP BY s.class,s.section,r.subject
 )
SELECT jsonb_build_object(
  'school_id',1,'exam_id',9,
  'source','current active students roster and active exam offerings; not signed historic exam enrollment',
  'original_baseline',to_jsonb(original),
  'integrity',to_jsonb(integrity),
  'offerings',COALESCE((SELECT jsonb_agg(to_jsonb(coverage) ORDER BY
        class_name,section,subject) FROM coverage),'[]'::jsonb),
  'unmatched_saved_subjects',COALESCE((SELECT jsonb_agg(to_jsonb(mismatched) ORDER BY
        class_name,section,subject) FROM mismatched),'[]'::jsonb)
) FROM original, integrity;
COMMIT;
"""

BASELINE_DIGEST='bcdc098a3e6cabb6f4c31736b14e39b9'

def status(pupils, saved):
    if pupils == 0:
        return 'NO_CURRENT_ENROLLMENT_NOT_A_MISSING_SCORE'
    if saved == 0:
        return 'NO_SAVED_MARKS_PENDING_REVIEW'
    if 0 < saved < pupils:
        return 'PARTIAL_SAVED_MARKS_PENDING_REVIEW'
    if saved == pupils:
        return 'ALL_CURRENT_ENROLLED_HAVE_SAVED_MARKS'
    return 'EXCESS_SAVED_ROWS_REVIEW'

def main():
    p=subprocess.run(['sudo','-u','postgres','psql','-X','-q','-t','-A',
        '-v','ON_ERROR_STOP=1','-p','5432','-d','apexos','-c',QUERY],
        text=True,capture_output=True,timeout=25,check=False)
    if p.returncode:
        raise RuntimeError('read-only production coverage query failed')
    data=json.loads(p.stdout.strip())
    covered=[]
    for row in data['offerings']:
        if row['saved']>row['pupils'] and row['pupils']>0:
            row['status']='EXCESS_SAVED_ROWS_REVIEW'
        else:
            row['status']=status(row['pupils'],row['saved'])
        row['unrecorded_against_current_roster']=max(row['pupils']-row['saved'],0)
        # Historic current enrollment can differ from the exam-day cohort; a
        # gap must be verified by school, not treated as a score or a failure.
        covered.append(row)
    data['offerings']=covered
    data['unrecorded_rows_against_current_roster']=sum(
       x['unrecorded_against_current_roster'] for x in covered)
    data['no_saved_subject_offerings'] = sum(x['status']=='NO_SAVED_MARKS_PENDING_REVIEW'
                                                  for x in covered)
    data['partially_saved_subject_offerings']=sum(
       x['status']=='PARTIAL_SAVED_MARKS_PENDING_REVIEW' for x in covered)
    data['approved_subject_maxima']=sum(x['approved_maximum'] is not None for x in covered)
    original=data['original_baseline']
    data['original_score_snapshot_intact']=(
       original['original_rows']==301 and original['original_zeros']==36
       and original['original_score_hash']==BASELINE_DIGEST)
    data['status']='READ_ONLY_REVIEW_REQUIRED'
    print(json.dumps(data,sort_keys=True,indent=2))
    return 0

if __name__=='__main__':
    try:
        sys.exit(main())
    except Exception as exc:
        print(json.dumps({'status':'HOLD','error':type(exc).__name__}))
        sys.exit(2)
