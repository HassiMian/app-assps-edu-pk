#!/usr/bin/env python3
"""P0 SaaS Core teacher-delivery evidence: aggregate, SQL READ ONLY, no PII.

This DOES NOT verify academic approval or allow auto-publication. Do not
conflate linked timetable user IDs with approved teacher-class assignments.
"""
import argparse
import json
import subprocess
SQL = """BEGIN READ ONLY;
WITH scheduled AS (
  SELECT DISTINCT teacher_id AS user_id FROM public.timetable
  WHERE school_id=1 AND day_name IN ('Monday','Tuesday','Wednesday',
    'Thursday','Friday','Saturday')
    AND teacher_id IS NOT NULL AND period_label LIKE 'Period %'
), verified_user_links AS (
  SELECT DISTINCT s.user_id FROM scheduled s
  JOIN public.users u ON u.id=s.user_id AND u.school_id=1 AND
      u.role='teacher' AND u.is_active=true
  JOIN public.employees e ON e.user_id=u.id AND e.school_id=1 AND
      e.is_active=true
), assignments AS (
  SELECT DISTINCT a.teacher_user_id FROM public.teacher_class_assignments a
  JOIN public.employees e ON e.id=a.employee_id
      AND e.user_id=a.teacher_user_id AND e.school_id=a.school_id
      AND e.is_active=true
  JOIN public.users u ON u.id=a.teacher_user_id AND u.school_id=a.school_id
      AND u.role='teacher' AND u.is_active=true
  WHERE a.school_id=1 AND a.is_active=true
)
SELECT row_to_json(s) FROM (
 SELECT
  (SELECT count(*) FROM scheduled) AS scheduled_user_ids,
  (SELECT count(*) FROM verified_user_links) AS cross_checked_user_employee_links,
  (SELECT count(*) FROM assignments) AS formally_assigned_teacher_accounts,
  (SELECT count(*) FROM public.users WHERE school_id=1 AND
      role='teacher' AND is_active=true) AS active_teacher_accounts,
  (SELECT count(*) FROM public.lesson_plans WHERE school_id=1) AS saved_lesson_plans,
  (SELECT count(*) FROM public.lesson_plans WHERE school_id=1
      AND sent_to_portal IS TRUE) AS student_parent_shared_plan_records,
  (SELECT count(*) FROM public.teacher_class_assignments
      WHERE school_id=1 AND is_active=true) AS formal_active_assignments,
  (SELECT count(*) FROM public.timetable WHERE school_id=1 AND day_name IN
      ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday')
      AND period_label LIKE 'Period %') AS daywise_teaching_slots
) s;
COMMIT;"""
def decision(x):
  keys=['scheduled_user_ids','cross_checked_user_employee_links',
        'formally_assigned_teacher_accounts','active_teacher_accounts',
        'saved_lesson_plans','student_parent_shared_plan_records',
        'formal_active_assignments','daywise_teaching_slots']
  if any(not isinstance(x.get(k),int) or x[k]<0 for k in keys):
    raise ValueError('Unexpected aggregate schema')
  blockers=[]
  if x['scheduled_user_ids']>x['cross_checked_user_employee_links']:
    blockers.append('TIMETABLE_USER_EMPLOYEE_LINK_GAP')
  if not x['formal_active_assignments']:
    blockers.append('NO_VERIFIED_TEACHER_CLASS_ASSIGNMENTS')
  if not x['formally_assigned_teacher_accounts']:
    blockers.append('NO_ELIGIBLE_ASSIGNED_TEACHER_ACCOUNTS')
  if not x['saved_lesson_plans']:
    blockers.append('NO_SAVED_LESSON_PLANS')
  if not x['student_parent_shared_plan_records']:
    blockers.append('NO_SHARED_TO_STUDENT_PARENT_PORTAL')
  return {
    'status':'HOLD', # Academic signoff/printed A4 is independently gated.
    'academic_approval_required':True,
    'real_teacher_login_unverified':True,
    'can_auto_assign_or_publish':False,
    'source_of_truth':'School1 read-only aggregate query, not a recipient authorization grant',
    'blockers':blockers,
    'evidence':{k:x[k] for k in keys}
  }
def main():
  parser=argparse.ArgumentParser()
  parser.add_argument('--live',action='store_true')
  parser.add_argument('--synthetic',help='synthetic JSON aggregate file for testing')
  args=parser.parse_args()
  if args.live == bool(args.synthetic):
    parser.error('Choose exactly one of --live or --synthetic')
  if args.live:
    done=subprocess.run(['runuser','-u','postgres','--','psql','-X','-A',
      '-t','-d','apexos','-v','ON_ERROR_STOP=1','-c',SQL],
      text=True,capture_output=True,timeout=20,check=True)
    payloads=[line for line in done.stdout.splitlines() if line.startswith('{')]
    if len(payloads)!=1:raise RuntimeError('Expected exactly one read-only aggregate')
    evidence=json.loads(payloads[0])
  else:
    evidence=json.load(open(args.synthetic,encoding='utf8'))
  print(json.dumps(decision(evidence),sort_keys=True,indent=2))
if __name__=='__main__':
  main()
