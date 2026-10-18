#!/usr/bin/env python3
"""Read-only safety comparison: live day-wise timetable vs approved PDF fixture.
Never updates historic records, teacher identity bindings, grants or lesson plans.
"""
import collections
import json
import pathlib
import subprocess

ROOT=pathlib.Path(__file__).resolve().parents[3]
FIX=ROOT/'al-siddique-backend/src/domain/ASSPS_APPROVED_TIMETABLE_SOURCE_20261016.json'
SOURCE=json.loads(FIX.read_text(encoding='utf8'))
DAYS=('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday')
QUERY="""BEGIN READ ONLY;
SELECT row_to_json(q)::text FROM (
 SELECT day_name,class_name,section,period_label,subject,teacher_display_name,
 TO_CHAR(start_time,'HH24:MI') AS start_time,TO_CHAR(end_time,'HH24:MI') AS end_time,
 COALESCE(TRIM(source_sha256),'') AS source_sha256,
 teacher_id IS NOT NULL AS has_teacher_id,
 staff_identity_reviewed AS reviewed
 FROM public.timetable WHERE school_id=1 AND academic_session='2026–27'
 ORDER BY day_name,class_name,section,period_label
) q;
SELECT 'ASSIGNMENT_COUNT='||COUNT(*) FROM public.teacher_class_assignments WHERE school_id=1 AND is_active=true;
COMMIT;"""
def rows():
 r=subprocess.run(['runuser','-u','postgres','--','psql','-X','-A','-t','-d','apexos','-v','ON_ERROR_STOP=1','-c',QUERY],
                  check=True,text=True,capture_output=True,timeout=20)
 return [json.loads(line) for line in r.stdout.splitlines() if line.startswith('{')],next((int(line.split('=')[1]) for line in r.stdout.splitlines() if line.startswith('ASSIGNMENT_COUNT=')),None)
def evaluate(got,active_links):
 groups=SOURCE['allocations']
 classes={(g['class_name'],g['section']):g['periods'] for g in groups}
 n=(len(classes)*8)
 output={}
 missing=extra=content_bad=clock_bad=source_bad=0
 for day in DAYS:
  observed=[r for r in got if r['day_name']==day]
  teaching=[r for r in observed if str(r['period_label']).startswith('Period ')]
  slots={}
  dup=0
  for row in teaching:
   period_label=row['period_label']
   try:per=int(period_label.rsplit(' ',1)[1])
   except ValueError:dup+=1;continue
   key=(row['class_name'],(row['section'] or None),per)
   if key in slots:dup+=1
   slots[key]=row
  mismatch=timing=hash_mismatch=missing_day=0
  expected_bells=SOURCE['friday_bells'] if day=='Friday' else SOURCE['regular_bells']
  for (klass,sec),subjects in classes.items():
   matches=[key for key in slots if key[0]==klass and (sec is None or key[1]==sec)]
   matching_sections={key[1] for key in matches}
   if sec is None and len(matching_sections)!=1:
    missing_day+=len(subjects)
    continue
   target_section=sec if sec is not None else next(iter(matching_sections))
   for p in subjects:
    row=slots.get((klass,target_section,p['period']))
    if row is None:missing_day+=1;continue
    expected=next(b for b in expected_bells if b['label']==f"Period {p['period']}")
    if row['subject'].strip().casefold()!=p['subject'].strip().casefold() or row['teacher_display_name'].strip().casefold()!=p['teacher_display_name'].strip().casefold():mismatch+=1
    if (row['start_time'],row['end_time'])!=(expected['start'],expected['end']):timing+=1
    if row['source_sha256']!=SOURCE['source_pdf_sha256']:hash_mismatch+=1
  schoolwide=[r for r in observed if r['class_name']=='School-wide']
  expected_schoolwide=1 if day=='Friday' else 2
  output[day]={'teaching_rows':len(teaching),'required_rows':n,'duplicates':dup,
   'subjects_or_teacher_display_mismatches':mismatch,
   'bell_mismatches':timing,'unmatched_approved_slots':missing_day,
   'old_or_mismatched_pdf_source_hashes':hash_mismatch,
   'school_wide_rows':len(schoolwide),'expected_school_wide_rows':expected_schoolwide,
   'teacher_ids_mapped':sum(r['has_teacher_id'] for r in teaching),
   'staff_review_flags_true':sum(r['reviewed'] for r in teaching)}
  missing+=missing_day;content_bad+=mismatch;clock_bad+=timing;source_bad+=hash_mismatch
  extra+=dup+abs(len(schoolwide)-expected_schoolwide)
 return {'status':'HOLD_UNTIL_SOURCE_AND_ASSIGNMENT_CERTIFICATION',
  'approved_print_source_sha256':SOURCE['source_pdf_sha256'],
  'new_day_rows':sum(len([r for r in got if r['day_name']==day]) for day in DAYS),
  'historical_regular_rows':sum(r['day_name']=='Regular' for r in got),
  'active_teacher_class_assignments':active_links,
  'days':output,
  'content_mismatches':content_bad,'bell_mismatches':clock_bad,'missing_day_slots':missing,
  'source_hash_mismatches':source_bad,'structure_anomalies':extra,
  'permission_grants_authorized':False,
  'production_mutation_authorized':False}
if __name__=='__main__':
 x,links=rows()
 print(json.dumps(evaluate(x,links),indent=2,sort_keys=True))
