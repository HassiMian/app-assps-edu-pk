#!/usr/bin/env python3
"""Generate audited SQL for uploaded October 14 ASSPS regular timetable image.
Writes no DB. Do not map display teachers to accounts or grant access."""
import argparse, pathlib
SOURCE_SHA='263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589'
SESSION='2026–27'
SLOTS=[
 ('1','08:15:00','08:55:00'),
 ('2','08:55:00','09:30:00'),
 ('3','09:30:00','10:05:00'),
 ('4','10:05:00','10:40:00'),
 ('5','10:40:00','11:15:00'),
 ('6','11:15:00','11:50:00'),
 ('7','12:15:00','12:50:00'),
 ('8','12:50:00','13:30:00'),
]
# Visible source names normalized only for source presentation.
# Never interpret this as authenticated staff authorization.
DATA={
 'Four':[
 ('Urdu','Miss Aqsa'),('Islamiyat','Miss Maryam'),('Mathematics','Miss Isma'),
 ('English','Miss Sumaira'),('English','Miss Sumaira'),('Science','Miss Aqsa'),
 ('Social Studies','Miss Aqsa'),('Nazra','Qari Imran')],
 'Five':[
 ('Mathematics','Miss Isma'),('Mathematics','Miss Isma'),('Science','Mam Afsa'),
 ('Social Studies','Mam Aqsa'),('English','Miss Sumaira'),('Islamiyat','Miss Isma'),
 ('Urdu','Miss Nazra'),('Nazra','Qari Imran')],
 'Six':[
 ('English A','Miss Sumaira'),('Social Studies','Miss Mehreen'),('Mathematics','Miss Isma'),
 ('Urdu','Miss Nazra'),('Nazra','Qari Imran'),('Islamiyat','Miss Maryam'),
 ('Science','Miss Tayyaba'),('English B','Miss Sumaira')],
 'Seven':[
 ('English','Miss Tayyaba'),('Urdu','Miss Nazra'),('Islamiyat','Qari Fida-ul-Rehman'),
 ('Mathematics','Miss Isma'),('Science','Miss Aqsa'),('Nazra','Qari Imran'),
 ('Social Studies','Mam Mehreen'),('English B','Miss Tayyaba')],
 'Pre-Nine':[
 ('Islamiyat','Qari Fida-ul-Rehman'),('English','Miss Sumaira'),
 ('Urdu','Miss Nazra'),('Chemistry','Mam Tayyaba'),
 ('Mathematics','Mam Ghulam Fatima'),('Physics','Miss Ghulam Fatima'),
 ('Biology','Sir Haseeb'),('Tarjuma','Miss Maryam')]
}
def q(s):
 if s is None:return 'NULL'
 return "'"+str(s).replace("'","''")+"'"
def build():
 assert len(DATA)==5 and sum(map(len,DATA.values()))==40
 assert SLOTS[5][2]=='11:50:00' and SLOTS[6][1]=='12:15:00'
 out=[]
 out.append("""-- EXACT photographic source audit: current upload 2026-10-14; image footer 2024-2025.
-- Pattern REGULAR only. Friday/weekdays NOT fabricated. Does not create teacher grants.
BEGIN;
SET LOCAL lock_timeout='2500ms';
SET LOCAL statement_timeout='30000ms';
DO $pre$
BEGIN
 IF current_database() NOT IN ('apexos','assps_timetable_qa_20261014') OR
    current_user<>'postgres' OR
    (SELECT count(*) FROM public.timetable WHERE school_id=1)<>0 OR
    (SELECT count(*) FROM public.exam_results WHERE school_id=1 AND exam_id=9)<1588 OR
    (SELECT count(*) FROM public.teacher_class_assignments WHERE school_id=1 AND is_active)<>0 THEN
   RAISE EXCEPTION 'TIMETABLE_BASELINE_CHANGED_OR_UNAUTHORIZED';
 END IF;
END $pre$;
ALTER TABLE public.timetable
 ADD COLUMN IF NOT EXISTS teacher_display_name varchar(120),
 ADD COLUMN IF NOT EXISTS academic_session varchar(24),
 ADD COLUMN IF NOT EXISTS source_sha256 char(64),
 ADD COLUMN IF NOT EXISTS source_notes text,
 ADD COLUMN IF NOT EXISTS staff_identity_reviewed boolean NOT NULL DEFAULT false;
-- One row per class and exact bell. Sections and account user IDs remain unknown.
""")
 rows=[]
 for cls,items in DATA.items():
  for j,(subject,teacher) in enumerate(items):
   p,start,end=SLOTS[j]
   notes='Uploaded 14-Oct-2026. Image reads Academic Year 2024-2025; current-school timetable reference 2026-27 by latest user direction. Staff identity NOT VERIFIED.'
   rows.append((1,None,0,'Regular',start,end,subject,cls,'','',f'Period {p}',teacher,SESSION,SOURCE_SHA,notes,False))
 for subj,start,end in [('Assembly','08:00:00','08:15:00'),('Break','11:50:00','12:15:00')]:
  rows.append((1,None,0,'Regular',start,end,subj,'School-wide','','',subj,None,SESSION,SOURCE_SHA,'School-wide bell; 25-minute break follows Period 6.',False))
 assert len(rows)==42
 columns=('school_id','teacher_id','day_order','day_name','start_time','end_time','subject','class_name','section','room','period_label','teacher_display_name','academic_session','source_sha256','source_notes','staff_identity_reviewed')
 v=[]
 for row in rows:
  v.append('('+','.join('false' if x is False else q(x) for x in row)+')')
 out.append('INSERT INTO public.timetable ('+', '.join(columns)+') VALUES\n'+',\n'.join(v)+';\n')
 out.append("""DO $post$
DECLARE n integer; k integer; p integer;
BEGIN
 SELECT count(*) INTO n FROM public.timetable WHERE school_id=1
  AND source_sha256='263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589'
  AND day_name='Regular' AND academic_session='2026–27';
 SELECT count(*) INTO k FROM public.timetable WHERE school_id=1 AND
  class_name IN ('Four','Five','Six','Seven','Pre-Nine') AND period_label LIKE 'Period %';
 SELECT count(*) INTO p FROM public.timetable WHERE school_id=1 AND
  (teacher_id IS NOT NULL OR staff_identity_reviewed=true);
 IF n<>42 OR k<>40 OR p<>0 OR (SELECT count(*) FROM public.timetable
     WHERE school_id=1 AND subject='Break' AND start_time='11:50:00'
       AND end_time='12:15:00')<>1
 THEN RAISE EXCEPTION 'TIMETABLE_POSTCONDITION_FAILED n % k % unsafe %',n,k,p;
 END IF;
END $post$;
COMMIT;
""")
 return '\n'.join(out)
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--out',required=True)
 args=a.parse_args()
 pathlib.Path(args.out).write_text(build())
 print('TIMETABLE_SQL_GENERATED 40_LECTURES_2_BELLS NO_STAFF_GRANTS')
