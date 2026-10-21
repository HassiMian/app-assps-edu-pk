#!/usr/bin/env python3
"""School1 attendance visibility without pupil data, guessed marks or DB mutations."""
import json
import subprocess
from datetime import datetime, timezone, time, date
from zoneinfo import ZoneInfo
from collections import Counter

SQL = """
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout='10000ms';
WITH scope_date AS (
 SELECT (now() AT TIME ZONE 'Asia/Karachi')::date AS marked_date
),
roster AS (
 SELECT s.class, count(*)::int AS active_students
 FROM public.students s WHERE s.school_id=1 AND s.is_active=true
 GROUP BY s.class
),
daily AS (
 SELECT s.class,
        count(DISTINCT a.student_id)::int AS marked_students,
        count(a.student_id)::int AS attendance_rows,
        count(DISTINCT s.id) FILTER
           (WHERE s.created_at::date=d.marked_date AND a.student_id IS NULL)::int AS newly_registered_unmarked,
        count(a.student_id) FILTER(WHERE a.status='present')::int AS present_records,
        count(a.student_id) FILTER(WHERE a.status='absent')::int AS absent_records,
        count(a.student_id) FILTER(WHERE a.status='leave')::int AS leave_records
 FROM public.students s CROSS JOIN scope_date d
 LEFT JOIN public.attendance a ON a.school_id=s.school_id
   AND a.student_id=s.id AND a.date=d.marked_date
 WHERE s.school_id=1 AND s.is_active=true
 GROUP BY s.class
)
SELECT 'DAY|'||marked_date FROM scope_date;
SELECT 'CLASS|' || COALESCE(r.class,'') || '|' || r.active_students || '|' ||
       COALESCE(a.marked_students,0) || '|' || COALESCE(a.attendance_rows,0)
FROM roster r JOIN daily a ON a.class IS NOT DISTINCT FROM r.class
ORDER BY r.class;
ROLLBACK;
"""
# NOTE: Separate statements with CTEs cannot share scope beyond a single query.
# Date and aggregate rows are combined in one SELECT before output.
SQL = SQL.replace(
"""SELECT 'DAY|'||marked_date FROM scope_date;
SELECT 'CLASS|' || COALESCE(r.class,'') || '|' || r.active_students || '|' ||
       COALESCE(a.marked_students,0) || '|' || COALESCE(a.attendance_rows,0)
FROM roster r JOIN daily a ON a.class IS NOT DISTINCT FROM r.class
ORDER BY r.class;""",
"""SELECT 'DAY|' || (SELECT marked_date FROM scope_date)
UNION ALL
SELECT 'CLASS|' || COALESCE(r.class,'') || '|' || r.active_students || '|' ||
       COALESCE(a.marked_students,0) || '|' || COALESCE(a.attendance_rows,0) || '|' ||
       COALESCE(a.newly_registered_unmarked,0)
FROM roster r JOIN daily a ON a.class IS NOT DISTINCT FROM r.class;""")

def parse(text):
    days=[];groups=[];seen=set()
    for line in text.strip().splitlines():
        parts=line.split('|')
        if parts[0]=='DAY' and len(parts)==2:
            days.append(parts[1])
        elif parts[0]=='CLASS' and len(parts)==6:
            _,name,active,marked,rows,new_students=parts
            if name in seen or not all(x.isdigit() for x in (active,marked,rows,new_students)):
                raise ValueError('Duplicate class or invalid numerical data')
            seen.add(name)
            n,m,r,t=(int(active),int(marked),int(rows),int(new_students))
            if m>n or r<m or t>n-m:
                raise ValueError('Attendance roster row invariant failed')
            groups.append(dict(class_name=name,active=n,marked=m,unmarked=n-m,
                               newly_registered_unmarked=t,
                               previously_registered_unmarked=n-m-t,
                               rows=r,duplicate_rows=r-m))
        else:
            raise ValueError('Unexpected attendance coverage row')
    if len(days)!=1 or not groups:
        raise ValueError('No reliable date or roster')
    total_marked=sum(x['marked'] for x in groups)
    for x in groups:
        x['investigate_no_saved_rows']=total_marked>0 and x['marked']==0 and x['active']>=5
    return {'date_pakistan':days[0],'class_coverage':sorted(groups,key=lambda r:r['class_name']),
            'total_active':sum(x['active'] for x in groups),
            'total_marked':total_marked,
            'newly_registered_unmarked_total':sum(x['newly_registered_unmarked'] for x in groups),
            'previously_registered_unmarked_total':sum(x['previously_registered_unmarked'] for x in groups),
            'zero_saved_class_alerts':sum(x['investigate_no_saved_rows'] for x in groups),
            'does_not_infer_missing_attendance_status':True}

def post_close_unsaved_day(coverage, now=None):
    """Possible missing daily save, not evidence of absences or school opening.

    Only warn on the matching local date, a scheduled weekday (Mon–Sat),
    and after 15:00 PKT. Holiday evidence is unavailable here; never create
    attendance statuses or automatically perform a backfill.
    """
    current = now if now is not None else datetime.now(timezone.utc)
    if current.tzinfo is None:
        raise ValueError('Attendance observation time must be timezone aware')
    local=current.astimezone(ZoneInfo('Asia/Karachi'))
    observed_date=date.fromisoformat(coverage['date_pakistan'])
    return (local.date()==observed_date and local.weekday()<6
        and local.time()>=time(15,0)
        and coverage['total_active']>0 and coverage['total_marked']==0
        and coverage['previously_registered_unmarked_total']>0)

def main():
    p=subprocess.run(['runuser','-u','postgres','--','psql','-p','5432','-d','apexos',
                      '-X','-Atq','-v','ON_ERROR_STOP=1'],input=SQL,text=True,
                     capture_output=True,timeout=15,check=False)
    if p.returncode:
        raise SystemExit('HOLD: read-only class attendance query unavailable')
    result=parse(p.stdout)
    print(json.dumps({'observed_at_utc':datetime.now(timezone.utc).isoformat(),**result,
                      'possible_post_close_full_roster_unsaved':post_close_unsaved_day(result)},indent=2))
    if any(x['duplicate_rows']>0 for x in result['class_coverage']):
        raise SystemExit(2)

if __name__=='__main__':
    main()
