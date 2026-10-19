#!/usr/bin/env python3
"""ASSPS official 16-Oct PDF (SHA pinned) versus live weekday timetable.
Strictly READ ONLY; never rewrites teacher assignments or source provenance.
"""
import collections,json,os,re,subprocess,sys
PDF_SHA='9ac81002d2bc67cc748ece72b637c6cc081c8e1f23d1551d594031deea7e70c4'
OLD_SHA='263941c69d939a6daf'
DAY_NAMES=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
EXPECTED={
('Four','Blue'):[('Urdu','Miss Aqsa'),('Islamiyat','Miss Maryam'),('Mathematics','Miss Isma'),('English','Miss Sumaira'),('English','Miss Sumaira'),('Science','Miss Aqsa'),('Social Studies','Miss Aqsa'),('Nazra','Qari Imran')],
('Five','Blue'):[('Mathematics','Miss Isma'),('Mathematics','Miss Isma'),('Science','Miss Aqsa'),('Social Studies','Miss Aqsa'),('English','Miss Sumaira'),('Islamiyat','Miss Isma'),('Urdu','Miss Nazra'),('Nazra','Qari Imran')],
('Six','Blue'):[('English A','Miss Sumaira'),('Social Studies','Miss Mehreen'),('Mathematics','Miss Ghulam Fatima'),('Urdu','Miss Nazra'),('Nazra','Qari Imran'),('Islamiyat','Miss Maryam'),('Science','Miss Tayyaba'),('English B','Miss Sumaira')],
('Seven','Blue'):[('English','Miss Tayyaba'),('Urdu','Miss Nazra'),('Islamiyat','Qari Fida-ul-Rehman'),('Mathematics','Miss Isma'),('Science','Miss Aqsa'),('Nazra','Qari Imran'),('Social Studies','Miss Mehreen'),('English B','Miss Tayyaba')],
('Pre-Nine','Blue'):[('Islamiyat','Qari Fida-ul-Rehman'),('English','Miss Sumaira'),('Urdu','Miss Nazra'),('Chemistry','Miss Tayyaba'),('Mathematics','Miss Ghulam Fatima'),('Physics','Miss Ghulam Fatima'),('Biology','Sir Haseeb'),('Tarjuma','Miss Maryam')],
('Nine','Usman'):[('Tarjuma','Miss Maryam'),('Chemistry','Sir Haseeb'),('English','Miss Ayesha'),('Physics','Miss Ghulam Fatima'),('Islamiyat','Qari Fida-ul-Rehman'),('Urdu','Miss Nazra'),('Computer Science','Miss Isma'),('Mathematics','Miss Ghulam Fatima')],
('Nine','Fatima'):[('Physics','Miss Ghulam Fatima'),('Mathematics','Miss Ghulam Fatima'),('Chemistry','Sir Haseeb'),('Biology','Sir Haseeb'),('Quran','Miss Maryam'),('English','Miss Ayesha'),('Islamiyat','Sir Fida-ul-Rehman'),('Urdu','Miss Nazra')]
}
REGULAR=[('08:45','09:25'),('09:25','09:55'),('09:55','10:25'),('10:25','10:55'),('10:55','11:25'),('11:25','11:55'),('12:20','12:50'),('12:50','13:30')]
FRIDAY=[('08:45','09:20'),('09:20','09:50'),('09:50','10:15'),('10:15','10:40'),('10:40','11:05'),('11:05','11:30'),('11:30','12:00'),('12:00','12:30')]
SQL="""BEGIN READ ONLY;
SELECT day_name,class_name,section,period_label,subject,teacher_display_name,
to_char(start_time,'HH24:MI'),to_char(end_time,'HH24:MI'),teacher_id,trim(source_sha256)
FROM public.timetable WHERE school_id=1 AND day_name IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday')
AND period_label ~ '^Period [1-8]$' ORDER BY day_name,class_name,section,period_label;
COMMIT;"""
def main():
 env={**os.environ,'PGOPTIONS':'-c default_transaction_read_only=on -c statement_timeout=15000'}
 run=subprocess.run(['runuser','-u','postgres','--','psql','-X','-A','-t','-F','|','-p','5432','-d','apexos','-v','ON_ERROR_STOP=1','-c',SQL],env=env,capture_output=True,text=True,timeout=22)
 if run.returncode:raise RuntimeError('READ_ONLY_TIMETABLE_QUERY_FAILED')
 records={}
 collisions=collections.defaultdict(set)
 old=0
 for line in run.stdout.splitlines():
  a=line.split('|')
  if len(a)!=10:continue
  day,cls,section,label,subject,teacher,start,end,teacher_id,source=a
  m=re.fullmatch(r'Period ([1-8])',label)
  if not m:continue
  key=(day,cls,section,int(m.group(1)))
  if key in records:raise RuntimeError('DUPLICATE_LIVE_KEYS')
  records[key]=(subject,teacher,start,end,teacher_id)
  old+=int(source.startswith(OLD_SHA))
  collisions[(day,int(m.group(1)),teacher_id)].add((cls,section))
 differences=[]
 missing=0
 for day in DAY_NAMES:
  timing=FRIDAY if day=='Friday' else REGULAR
  for (cls,section),slots in EXPECTED.items():
   for i,(subject,teacher) in enumerate(slots,1):
    row=records.get((day,cls,section,i))
    if not row:missing+=1;continue
    if row[0]!=subject or row[1]!=teacher or tuple(row[2:4])!=timing[i-1]:
     differences.append(dict(day=day,cl=cls,section=section,period=i,
        subject_match=row[0]==subject,teacher_expected=teacher,teacher_actual=row[1],
        timing_match=tuple(row[2:4])==timing[i-1]))
 overlaps=[dict(day=d,period=p,sections=sorted(v)) for (d,p,uid),v in collisions.items() if len(v)>1]
 unexpected=[(d,c,s,p) for d,c,s,p in records if (c,s) not in EXPECTED]
 print(json.dumps(dict(schema='ASSPS_LOCKED_TIMETABLE_PDF_COMPARE_V1',pdf_sha256=PDF_SHA,
  checked_weekdays=len(DAY_NAMES),expected_teaching_rows=336,observed_teaching_rows=len(records),
  missing=missing,unexpected=unexpected,old_source_sha_rows=old,differences=differences,
  overlapping_teacher_period_groups=overlaps,production_changed=False,read_only=True,
  status='PASS' if not differences and not missing and len(records)==336 and old==0 else 'HOLD'),indent=2))
 return 0 if not differences and not missing and len(records)==336 and old==0 else 2
if __name__=='__main__':
 try:sys.exit(main())
 except Exception as e:
  print(json.dumps(dict(status='HOLD',read_only=True,production_changed=False,error=type(e).__name__)))
  sys.exit(2)
