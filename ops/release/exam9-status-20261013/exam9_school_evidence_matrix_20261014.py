#!/usr/bin/env python3
"""READ-ONLY ASSPS school source evidence matrix. No grants, approvals or academic guesses.

Source-referenced marks maxima are observational clues only: this program never
approves or writes an assessment policy and must not be used as an import script.
"""
import argparse
import json
import subprocess
import sys

def pg(port, database, sql):
    if database != 'apexos' and not database.startswith('assps_'):
        raise ValueError('Unrecognized ASSPS database')
    proc = subprocess.run(['sudo','-u','postgres','psql','-p',str(port),'-d',database,
        '-X','-q','-v','ON_ERROR_STOP=1','-A','-t','-c',sql],
        capture_output=True,text=True,timeout=35,check=False)
    if proc.returncode:
        raise RuntimeError('Read-only source unavailable: '+proc.stderr.strip()[:160])
    return json.loads(proc.stdout)

OFFERINGS_SQL = """
SELECT COALESCE(json_agg(row_to_json(x) ORDER BY x.class_name,x.section,x.subject), '[]'::json)
FROM (
 SELECT e.id, e.class_name, e.section, e.subject, e.total_marks AS official_maximum,
        e.approval_status, e.approved_by_user_id,
        COALESCE(h.saved_rows,0) AS saved_rows,
        COALESCE(h.observed_totals,'[]'::json) AS historical_denominators
 FROM public.exam_subjects e
 LEFT JOIN LATERAL (
   SELECT COUNT(*) saved_rows,
          COALESCE(json_agg(DISTINCT er.total_marks) FILTER(WHERE er.total_marks IS NOT NULL),'[]'::json) observed_totals
   FROM public.exam_results er
   JOIN public.students s ON s.id=er.student_id AND s.school_id=er.school_id
   WHERE er.school_id=e.school_id AND er.exam_id=e.exam_id
     AND lower(trim(s.class))=lower(trim(e.class_name))
     AND lower(trim(s.section))=lower(trim(e.section))
     AND lower(trim(er.subject))=lower(trim(e.subject))
 ) h ON TRUE
 WHERE e.school_id=1 AND e.exam_id=9
) x;
"""

STAFF_SQL = """
SELECT COALESCE(json_agg(row_to_json(x) ORDER BY x.class_name,x.period_label,x.subject),'[]'::json)
FROM (
 SELECT class_name,section,period_label,subject,teacher_display_name,
        teacher_id,staff_identity_reviewed,academic_session,
        trim(source_sha256) source_sha256,
        (SELECT COUNT(DISTINCT u.id)::int FROM public.employees e
           JOIN public.users u ON u.id=e.user_id AND u.school_id=e.school_id
             AND u.is_active AND u.role='teacher'
         WHERE e.school_id=1 AND e.is_active
           AND lower(trim(e.name))=trim(regexp_replace(
             lower(trim(t.teacher_display_name)),
             '^(miss|sir|qari|ms)[[:space:]]+','','i'))
        ) exact_active_teacher_account_matches
 FROM public.timetable t WHERE school_id=1 AND day_name='Regular'
   AND academic_session='2026–27'
   AND class_name<>'School-wide'
) x;
"""

ROSTER_SQL = """
SELECT COALESCE(json_agg(row_to_json(x) ORDER BY x.class_name,x.section),'[]'::json)
FROM (SELECT class AS class_name,section,COUNT(*)::int AS students
      FROM public.students WHERE school_id=1 AND is_active
      GROUP BY class,section) x;
"""

UNMATCHED_SQL = """
SELECT COALESCE(json_agg(row_to_json(x) ORDER BY x.class_name,x.section,x.subject),'[]'::json)
FROM (
  SELECT s.class AS class_name,s.section,er.subject,COUNT(*)::int AS saved_rows
  FROM public.exam_results er
  JOIN public.students s ON s.id=er.student_id AND s.school_id=er.school_id
  LEFT JOIN public.exam_subjects e ON e.school_id=er.school_id
    AND e.exam_id=er.exam_id
    AND lower(trim(e.class_name))=lower(trim(s.class))
    AND lower(trim(e.section))=lower(trim(s.section))
    AND lower(trim(e.subject))=lower(trim(er.subject))
  WHERE er.school_id=1 AND er.exam_id=9 AND e.id IS NULL
  GROUP BY s.class,s.section,er.subject
) x;
"""

def analyze(offerings,timetable,roster,unmatched=None):
    unmatched=unmatched or []
    active={(c['class_name'].strip().lower(),c['section'].strip().lower()):c['students'] for c in roster}
    output=[]
    for e in offerings:
        totals=e['historical_denominators']
        has_roster=active.get((e['class_name'].strip().lower(),e['section'].strip().lower()),0)>0
        reason=[]
        if not has_roster:
            reason.append('NO_ACTIVE_MATCHING_STUDENT_COHORT')
        if e['official_maximum'] is None:
            reason.append('MAXIMUM_UNAPPROVED')
        if e['approval_status'] != 'approved' or not e['approved_by_user_id']:
            reason.append('NO_AUTHENTIC_APPROVAL_RECEIPT')
        if len(totals)>1:
            reason.append('HISTORICAL_DENOMINATOR_CONFLICT')
        if not totals:
            reason.append('NO_SAVED_RESULT_DENOMINATOR')
        output.append({
            'offering_id':e['id'],'class':e['class_name'],'section':e['section'],
            'subject':e['subject'],'saved_rows':e['saved_rows'],
            'historical_denominators':totals,
            'official_maximum':e['official_maximum'],
            'institutional_state':'UNREVIEWED',
            'review_blockers':reason,
        })
    timetable_issues=[]
    for t in timetable:
        sec=t['section'] or ''
        reasons=[]
        if not t['teacher_id'] or t['staff_identity_reviewed'] is not True:
            reasons.append('UNVERIFIED_TEACHER_ACCOUNT')
        if t.get('exact_active_teacher_account_matches',0)!=1:
            reasons.append('NO_UNIQUE_ACTIVE_TEACHER_ACCOUNT_NAME_MATCH')
        # Name equality is a suggestion, never verified identity, class
        # assignment, role activation, or authority to publish a grant.
        if not sec.strip():
            reasons.append('NO_EXACT_STUDENT_SECTION')
        if t['class_name'].lower() in ('nine','pre-nine'):
            reasons.append('NON_EXAM9_COHORT_NO_AUTO_GRANT')
        timetable_issues.append({
            'class':t['class_name'],'section':sec,'period':t['period_label'],
            'subject':t['subject'],'teacher_display_name':t['teacher_display_name'],
            'source_sha256':t['source_sha256'],
            'exact_active_teacher_account_name_matches':t.get('exact_active_teacher_account_matches',0),
            'state':'DISPLAY_ONLY_UNAPPROVED',
            'review_blockers':reasons,
        })
    return {'release_safe':False,'exam_id':9,'school_id':1,
      'offering_count':len(output),'timetable_slots':len(timetable_issues),
      'active_roster_cohorts':len(roster),
      'offering_rows_without_maxima':sum(o['official_maximum'] is None for o in output),
      'observed_denominator_conflicts':sum('HISTORICAL_DENOMINATOR_CONFLICT' in o['review_blockers'] for o in output),
      'offerings_without_saved_scores':sum(o['saved_rows']==0 for o in output),
      'offerings_without_active_cohort':sum('NO_ACTIVE_MATCHING_STUDENT_COHORT' in o['review_blockers'] for o in output),
      'unverified_timetable_staff':sum('UNVERIFIED_TEACHER_ACCOUNT' in t['review_blockers'] for t in timetable_issues),
      'unscoped_timetable_sections':sum('NO_EXACT_STUDENT_SECTION' in t['review_blockers'] for t in timetable_issues),
      'timetable_slots_with_one_exact_active_account_name':sum(t.get('exact_active_teacher_account_matches',0)==1 for t in timetable),
      'saved_subjects_without_matching_offering':len(unmatched),
      'saved_rows_without_matching_offering':sum(row['saved_rows'] for row in unmatched),
      'unmatched_saved_subjects':unmatched,
      'offering_review':output, 'timetable_review':timetable_issues,
      'note':'OBSERVED RESULT DENOMINATORS ARE NOT OFFICIALLY APPROVED PAPER MAXIMA. NO PERMISSIONS OR DATABASE ROWS WERE WRITTEN.'}

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--port',type=int,choices=(5432,55432),default=5432)
    ap.add_argument('--database',default='apexos')
    args=ap.parse_args()
    obj=analyze(pg(args.port,args.database,OFFERINGS_SQL),
                pg(args.port,args.database,STAFF_SQL),
                pg(args.port,args.database,ROSTER_SQL),
                pg(args.port,args.database,UNMATCHED_SQL))
    print(json.dumps(obj,indent=2,ensure_ascii=False))
    return 0

if __name__=='__main__':
    try: sys.exit(main())
    except (RuntimeError,ValueError,subprocess.TimeoutExpired) as ex:
        print(json.dumps({'release_safe':False,'error':str(ex)}))
        sys.exit(2)
