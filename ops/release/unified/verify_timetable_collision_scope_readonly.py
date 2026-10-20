#!/usr/bin/env python3
"""Single-mission, read-only school timetable occupancy and collision verifier.

Four/Blue and Five/Blue are a known combined-class pairing; a shared slot is
permitted only if exactly the same teacher, subject, room, bell start/end,
period and day occur for those two classes. All other clashes are HOLDs.
This is structural evidence, NOT independent approval to mutate the schedule.
"""
import json
import subprocess

SQL = """
BEGIN TRANSACTION READ ONLY;
WITH active AS (
 SELECT day_name,period_label,class_name,section,subject,room,teacher_id,start_time,end_time
 FROM public.timetable WHERE school_id=1
 AND day_name IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday')
 AND class_name <> 'School-wide'
), class_days AS (
 SELECT day_name,class_name,coalesce(section,'') section,
 count(*) n,count(DISTINCT period_label) unique_periods
 FROM active GROUP BY day_name,class_name,coalesce(section,'')
), shared_teacher AS (
 SELECT day_name,period_label,teacher_id,
   count(*) n,
   count(DISTINCT (class_name,coalesce(section,''))) different_classes,
   count(DISTINCT class_name) class_types,
   count(DISTINCT coalesce(subject,'')) subjects,
   count(DISTINCT coalesce(room,'')) rooms,
   count(DISTINCT start_time) starts,
   count(DISTINCT end_time) ends,
   bool_and(coalesce(class_name IN ('Four','Five'),false) AND coalesce(section='Blue',false)) only_known_combination
 FROM active WHERE teacher_id IS NOT NULL
 GROUP BY day_name,period_label,teacher_id
 HAVING count(DISTINCT (class_name,coalesce(section,'')))>1
), classified AS (
 SELECT n=2 AND different_classes=2 AND class_types=2
   AND subjects=1 AND rooms=1 AND starts=1 AND ends=1
   AND only_known_combination AS is_shared_class
 FROM shared_teacher
)
SELECT 'active_session_groups|'||(SELECT count(*) FROM class_days)
UNION ALL SELECT 'active_session_rows|'||(SELECT count(*) FROM active)
UNION ALL SELECT 'incomplete_day_sessions|'||(SELECT count(*) FROM class_days WHERE n<>8 OR unique_periods<>8)
UNION ALL SELECT 'unscoped_active_rows|'||(SELECT count(*) FROM active WHERE nullif(trim(coalesce(section,'')),'') IS NULL)
UNION ALL SELECT 'active_null_teacher_rows|'||(SELECT count(*) FROM active WHERE teacher_id IS NULL)
UNION ALL SELECT 'invalid_period_labels|'||(SELECT count(*) FROM active WHERE period_label NOT IN ('Period 1','Period 2','Period 3','Period 4','Period 5','Period 6','Period 7','Period 8'))
UNION ALL SELECT 'all_multi_class_teacher_slots|'||(SELECT count(*) FROM classified)
UNION ALL SELECT 'known_four_five_shared_slots|'||(SELECT count(*) FROM classified WHERE is_shared_class)
UNION ALL SELECT 'unapproved_teacher_collisions|'||(SELECT count(*) FROM classified WHERE NOT is_shared_class);
COMMIT;
"""
FIELDS=('active_session_groups','active_session_rows','incomplete_day_sessions',
        'unscoped_active_rows','active_null_teacher_rows','invalid_period_labels',
        'all_multi_class_teacher_slots','known_four_five_shared_slots',
        'unapproved_teacher_collisions')

def parse(output):
    counts={}
    for line in output.splitlines():
        name,sep,value=line.strip().partition('|')
        if not sep or name not in FIELDS or name in counts or not value.isdecimal():
            raise ValueError('Invalid read-only timetable collision evidence')
        counts[name]=int(value)
    if set(counts)!=set(FIELDS):
        raise ValueError('Missing required timetable evidence')
    if counts['known_four_five_shared_slots']+counts['unapproved_teacher_collisions']!=counts['all_multi_class_teacher_slots']:
        raise ValueError('Teacher slot classification totals inconsistent')
    if counts['active_session_rows']<counts['active_session_groups']:
        raise ValueError('Session rows smaller than groups')
    return counts

def classify(counts):
    correct=(counts['active_session_groups']==42
        and counts['active_session_rows']==336
        and all(counts[x]==0 for x in (
          'incomplete_day_sessions','unscoped_active_rows',
          'active_null_teacher_rows','invalid_period_labels','unapproved_teacher_collisions')))
    return {'pass':True,'structural_timetable_valid':correct,'counts':counts,
            'interpretation':'READ_ONLY_SCHEDULE_OCCUPANCY_NOT_LIVE_TEACHER_OR_ACADEMIC_SIGNOFF'}

def inspect():
    p=subprocess.run(['runuser','-u','postgres','--','psql','-X','-qAt',
         '-p','5432','-d','apexos','-v','ON_ERROR_STOP=1'],
        input=SQL,capture_output=True,text=True,timeout=20,check=False)
    if p.returncode:raise RuntimeError('Read-only timetable collision query failed')
    return classify(parse(p.stdout))

if __name__=='__main__':
    try:
        report=inspect()
        print(json.dumps(report,indent=2,sort_keys=True))
        raise SystemExit(0 if report['structural_timetable_valid'] else 2)
    except (OSError,ValueError,RuntimeError,subprocess.TimeoutExpired) as e:
        print(json.dumps({'pass':False,'error_type':type(e).__name__}))
        raise SystemExit(3)
