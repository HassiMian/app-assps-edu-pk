#!/usr/bin/env python3
"""Read-only academic delivery integrity fence for the single ASSPS mission.

Checks approved teacher grants against the active timetable and whether existing
lesson plans have been published. Does not output names, IDs or source content.
Unreviewed record corrections remain forbidden; failures are explicit HOLDs.
"""
import json
import subprocess
from pathlib import Path

SQL = """
BEGIN TRANSACTION READ ONLY;
WITH g AS (
  SELECT lower(trim(class_name)) c, lower(trim(coalesce(section,''))) s,
         lower(trim(subject)) u, teacher_user_id
  FROM public.teacher_class_assignments
  WHERE school_id=1 AND is_active AND source='timetable_verified_20261019'
), t AS (
  SELECT DISTINCT lower(trim(class_name)) c,
         lower(trim(coalesce(section,''))) s, lower(trim(subject)) u,
         teacher_id, lower(trim(coalesce(day_name,''))) d
  FROM public.timetable WHERE school_id=1 AND trim(coalesce(subject,''))<>''
), matched AS (
  SELECT g.c,g.s,g.u,g.teacher_user_id,t.teacher_id
  FROM g JOIN t USING(c,s,u)
), t_groups AS (
  SELECT DISTINCT c,s,u FROM t
), g_groups AS (
  SELECT c,s,u,count(*) n FROM g GROUP BY c,s,u
), unmatched AS (
  SELECT t.c,t.s,t.u FROM t_groups t LEFT JOIN g_groups g USING(c,s,u)
  WHERE g.c IS NULL
)
SELECT 'official_grants|'||(SELECT count(*) FROM g)
UNION ALL SELECT 'unauthorized_grants|'||(SELECT count(*) FROM public.teacher_class_assignments WHERE school_id=1 AND is_active AND source IS DISTINCT FROM 'timetable_verified_20261019')
UNION ALL SELECT 'duplicate_grants|'||(SELECT coalesce(sum(n-1),0) FROM g_groups WHERE n>1)
UNION ALL SELECT 'timetable_subject_groups|'||(SELECT count(*) FROM t_groups)
UNION ALL SELECT 'granted_subject_groups|'||(SELECT count(*) FROM g_groups)
UNION ALL SELECT 'grant_timetable_matches|'||(SELECT count(*) FROM (SELECT DISTINCT c,s,u FROM matched) m)
UNION ALL SELECT 'matched_null_teacher_groups|'||(SELECT count(*) FROM (SELECT DISTINCT c,s,u FROM matched WHERE teacher_id IS NULL) m)
UNION ALL SELECT 'mismatched_nonnull_teacher_groups|'||(SELECT count(*) FROM (SELECT DISTINCT c,s,u FROM matched WHERE teacher_id IS NOT NULL AND teacher_id IS DISTINCT FROM teacher_user_id) m)
UNION ALL SELECT 'unmatched_blank_section_subject_groups|'||(SELECT count(*) FROM unmatched WHERE c<>'school-wide' AND s='')
UNION ALL SELECT 'unmatched_blank_section_active_groups|'||(SELECT count(*) FROM unmatched u WHERE u.c<>'school-wide' AND u.s='' AND EXISTS (SELECT 1 FROM t WHERE t.c=u.c AND t.s=u.s AND t.u=u.u AND t.d<>'regular'))
UNION ALL SELECT 'unmatched_blank_section_template_groups|'||(SELECT count(*) FROM unmatched u WHERE u.c<>'school-wide' AND u.s='' AND NOT EXISTS (SELECT 1 FROM t WHERE t.c=u.c AND t.s=u.s AND t.u=u.u AND t.d<>'regular'))
UNION ALL SELECT 'unmatched_nonblank_teaching_groups|'||(SELECT count(*) FROM unmatched WHERE c<>'school-wide' AND s<>'')
UNION ALL SELECT 'unmatched_schoolwide_groups|'||(SELECT count(*) FROM unmatched WHERE c='school-wide')
UNION ALL SELECT 'lesson_plans|'||(SELECT count(*) FROM public.lesson_plans WHERE school_id=1)
UNION ALL SELECT 'published_lesson_plans|'||(SELECT count(*) FROM public.lesson_plans WHERE school_id=1 AND sent_to_portal IS TRUE);
COMMIT;
"""
KEYS=('official_grants','unauthorized_grants','duplicate_grants',
      'timetable_subject_groups','granted_subject_groups','grant_timetable_matches',
      'matched_null_teacher_groups','mismatched_nonnull_teacher_groups',
      'unmatched_blank_section_subject_groups','unmatched_blank_section_active_groups',
      'unmatched_blank_section_template_groups','unmatched_nonblank_teaching_groups',
      'unmatched_schoolwide_groups','lesson_plans','published_lesson_plans')

def parse(stdout):
    data={}
    for line in stdout.splitlines():
        key,sep,value=line.strip().partition('|')
        if not sep or key not in KEYS or key in data or not value.isdecimal():
            raise ValueError('Invalid academic aggregate evidence')
        data[key]=int(value)
    if set(data)!=set(KEYS):
        raise ValueError('Incomplete academic aggregate evidence')
    if data['unmatched_blank_section_active_groups']+data['unmatched_blank_section_template_groups'] != data['unmatched_blank_section_subject_groups']:
        raise ValueError('Historical/active blank-section groups inconsistent')
    if data['published_lesson_plans']>data['lesson_plans']:
        raise ValueError('Invalid lesson publication counts')
    if data['grant_timetable_matches']>data['granted_subject_groups']:
        raise ValueError('Invalid timetable join coverage')
    if data['grant_timetable_matches'] + data['unmatched_blank_section_subject_groups'] + data['unmatched_nonblank_teaching_groups'] + data['unmatched_schoolwide_groups'] != data['timetable_subject_groups']:
        raise ValueError('Timetable subject group totals inconsistent')
    return data

def classify(data, historical_filter_verified=False):
    grants_valid=(data['official_grants']==54 and data['unauthorized_grants']==0
                  and data['duplicate_grants']==0 and data['granted_subject_groups']==54
                  and data['grant_timetable_matches']==54
                  and data['mismatched_nonnull_teacher_groups']==0)
    return {
        'pass':grants_valid,
        'teacher_identity_complete':grants_valid and data['matched_null_teacher_groups']==0,
        'teaching_sections_complete':grants_valid and data['unmatched_nonblank_teaching_groups']==0 and data['unmatched_blank_section_active_groups']==0 and historical_filter_verified,
        'historical_filter_verified':historical_filter_verified,
        'lesson_publication_observed':data['published_lesson_plans']>0,
        'lesson_coverage_certified':False,
        'counts':data,
        'interpretation':'READ_ONLY_COUNTS_NOT_AUTHENTIC_ACADEMIC_CONTENT_APPROVAL',
    }

def inspect():
    result=subprocess.run(['runuser','-u','postgres','--','psql','-p','5432','-d','apexos',
                          '-X','-qAt','-v','ON_ERROR_STOP=1'],
                          text=True,input=SQL,capture_output=True,timeout=18,check=False)
    if result.returncode:
        raise RuntimeError('Read-only academic integrity query failed')
    # Regular is explicitly a legacy schedule template, not a live weekday.
    # Require the ACTIVE live route to exclude it in normal timetable views.
    route=Path('/var/www/apex-backend/src/routes/timetableRoutes.js')
    if route.is_symlink() or not route.is_file():
        raise RuntimeError('Live timetable route missing or redirected')
    text=route.read_text(encoding='utf-8')
    exclusion="day_name <> 'Regular'" in text and "!req.query.day_name" in text and "req.query.include_historical !== 'true'" in text
    return classify(parse(result.stdout),historical_filter_verified=exclusion)

if __name__=='__main__':
    try:
        outcome=inspect()
        print(json.dumps(outcome,sort_keys=True,indent=2))
        raise SystemExit(0 if outcome['pass'] else 2)
    except (OSError,RuntimeError,ValueError,subprocess.TimeoutExpired) as e:
        print(json.dumps({'pass':False,'error_type':type(e).__name__}))
        raise SystemExit(3)
