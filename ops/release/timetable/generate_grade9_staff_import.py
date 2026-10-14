#!/usr/bin/env python3
"""ASSPS timetable 2026–27: 2 class9 sections, 3 direct user corrections,
and non-authoritative staff/department observations. No staff grants."""
from pathlib import Path
import argparse
BASE_SOURCE='263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589'
NINE_SOURCE='e182d9616f300e731e3e3dc957bc43934ef1f574b7b564714d433726c03fc724'
TIMES=[('08:15:00','08:55:00'),('08:55:00','09:30:00'),('09:30:00','10:05:00'),('10:05:00','10:40:00'),('10:40:00','11:15:00'),('11:15:00','11:50:00'),('12:15:00','12:50:00'),('12:50:00','13:30:00')]
NINE={
 'Usman':[
 ('Tarjuma','Miss Maryam'),('Chemistry','Sir Haseeb'),('English','Miss Ayesha'),
 ('Physics','Miss Ghulam Fatima'),('Islamiyat','Qari Fida-ul-Rehman'),
 ('Urdu','Miss Nazra'),('Computer Science','Miss Isma'),('Mathematics','Miss Ghulam Fatima')],
 'Fatima':[
 ('Physics','Miss Ghulam Fatima'),('Mathematics','Miss Ghulam Fatima'),
 ('Chemistry','Sir Haseeb'),('Biology','Sir Haseeb'),('Quran','Miss Maryam'),
 ('English','Miss Ayesha'),('Islamiyat','Sir Fida-ul-Rehman'),('Urdu','Miss Nazra')]}
CORRECTIONS={
 ('Six','Period 3'):('Mathematics','Miss Ghulam Fatima','Miss Isma'),
 ('Five','Period 3'):('Science','Miss Ausa','Mam Afsa'),
 ('Five','Period 4'):('Social Studies','Miss Ausa','Mam Aqsa')}
# Teacher identities previously verified against school1 active employee census.
# Named aliases are unique active records (NOT credential-backed teacher grants).
# Inactive historical names and user spelling A-U-S-A remain UNMATCHED.
MATCH={
 'Miss Ghulam Fatima':(57,'unique_active_fullname'),
 'Miss Isma':(45,'unique_active_givenname'),
 'Miss Sumaira':(33,'unique_active_givenname'),
 'Miss Ayesha':(32,'unique_active_givenname'),
 'Miss Mehreen':(61,'unique_active_givenname'),
 'Miss Tayyaba':(60,'unique_active_spelling_variant'),
 'Miss Aqsa':(59,'unique_active_givenname'),
 'Sir Haseeb':(28,'unique_active_givenname'),
 'Qari Fida-ul-Rehman':(41,'unique_active_name_variant'),
 'Sir Fida-ul-Rehman':(41,'unique_active_name_variant'),
 'Qari Imran':(65,'unique_active_givenname'),
 'Miss Nazra':(30,'provisional_active_name_inactive_homonym')}
ALIAS={'Mam Ghulam Fatima':'Miss Ghulam Fatima','Mam Tayyaba':'Miss Tayyaba','Mam Mehreen':'Miss Mehreen'}
GROUPS={
 'Mathematics':('Mathematics','STEM / Mathematics'),
 'Science':('Science','STEM / Science'), 'Physics':('Physics','STEM / Science'),
 'Chemistry':('Chemistry','STEM / Science'),'Biology':('Biology','STEM / Science'),
 'Computer Science':('Computer Science','Computer Science / IT'),
 'English A':('English','Languages'),'English B':('English','Languages'),
 'English':('English','Languages'),'Urdu':('Urdu','Languages'),
 'Social Studies':('Social Studies','Humanities / Social Sciences'),
 'Islamiyat':('Islamiyat','Islamic Studies'),
 'Nazra':('Nazra','Islamic Studies'),'Quran':('Quran','Islamic Studies'),
 'Tarjuma':('Tarjuma','Islamic Studies')}
def quote(value):
 if value is None:return 'NULL'
 return "'"+str(value).replace("'","''")+"'"
def build():
 lines=['''-- Verify this exact change against the 14 Oct 2026 uploaded photographic source and
-- independently recovered 11 Oct 2026 2026–27 Grade IX timetable document.
-- Only School1 and active existing 42-row Regular source dataset.
-- Posture: assignments visible, NOT permission grants. Day=Regular, not guessed weekdays.
BEGIN;
SET LOCAL lock_timeout='2500ms';
SET LOCAL statement_timeout='40000ms';
DO $guard$
BEGIN
 IF current_database() NOT IN ('apexos','assps_timetable_9staff_qa_20261014')
 OR current_user<>'postgres'
 OR (SELECT COUNT(*) FROM public.timetable WHERE school_id=1)<>42
 OR (SELECT COUNT(*) FROM public.timetable WHERE school_id=1 AND
       day_name='Regular' AND source_sha256='263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589')<>42
 OR (SELECT COUNT(*) FROM public.teacher_class_assignments WHERE school_id=1 AND is_active)<>0
 OR (SELECT COUNT(*) FROM public.exam_results WHERE school_id=1 AND exam_id=9)<1588
 OR (SELECT COUNT(*) FROM information_schema.tables
       WHERE table_schema='public' AND table_name='employee_teaching_subject_evidence')<>0
 THEN RAISE EXCEPTION 'RELEASE_BASELINE_CHANGED_OR_UNAUTHORIZED'; END IF;
END $guard$;''']
 for (cls,period),(sub,teacher,old) in CORRECTIONS.items():
  lines.append(f"""UPDATE public.timetable SET subject={quote(sub)},teacher_display_name={quote(teacher)},
  source_notes=coalesce(source_notes,'')||' | User-directed 2026-10-14: {cls} {period} from {old} to {teacher}.'
  WHERE school_id=1 AND class_name={quote(cls)} AND day_name='Regular'
    AND period_label={quote(period)} AND subject={quote(sub)}
    AND teacher_display_name={quote(old)} AND teacher_id IS NULL;""")
 # standardize two previous 'Mam' entries, but source notes preserve prior names.
 for old,new in ALIAS.items():
  lines.append(f"""UPDATE public.timetable SET teacher_display_name={quote(new)},
    source_notes=coalesce(source_notes,'')||' | 2026-10-14 honorific normalized from {old} to {new}.'
    WHERE school_id=1 AND day_name='Regular' AND teacher_display_name={quote(old)}
    AND teacher_id IS NULL;""")
 for section,assign in NINE.items():
  assert len(assign)==8
  for ix,(subject,teacher) in enumerate(assign):
   start,end=TIMES[ix]
   note=f"11 Oct 2026 Class9 two-section approved source doc SHA {NINE_SOURCE}; original Girls Fatma spelling, live section Fatima; Period7 Boys Computer Science Miss Isma correction verified. Staff capability provisional; NO authorization."
   vals=(1,None,0,'Regular',start,end,subject,'Nine',section,'',f'Period {ix+1}',teacher,'2026–27',NINE_SOURCE,note)
   lines.append('INSERT INTO public.timetable (school_id,teacher_id,day_order,day_name,start_time,end_time,subject,class_name,section,room,period_label,teacher_display_name,academic_session,source_sha256,source_notes) VALUES ('+','.join(quote(x) for x in vals)+');')
 lines.append("""-- Save teaching subjects in a normalized, employee-linked evidence matrix.
-- This is NOT an employee authorization / qualifications certificate.
CREATE TABLE public.employee_teaching_subject_evidence (
 id BIGSERIAL PRIMARY KEY,
 school_id INTEGER NOT NULL REFERENCES public.schools(id),
 timetable_id INTEGER NOT NULL UNIQUE REFERENCES public.timetable(id),
 employee_id INTEGER REFERENCES public.employees(id),
 teacher_label VARCHAR(120) NOT NULL,
 class_name VARCHAR(80) NOT NULL,
 section VARCHAR(80) NOT NULL DEFAULT '',
 period_label VARCHAR(60) NOT NULL,
 canonical_subject VARCHAR(120) NOT NULL,
 teaching_department VARCHAR(100) NOT NULL,
 identity_status VARCHAR(80) NOT NULL,
 authorization_status VARCHAR(30) NOT NULL DEFAULT 'schedule_reference_only',
 source_sha256 CHAR(64) NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
 CHECK (authorization_status='schedule_reference_only'),
 CHECK (identity_status IN ('unique_active_fullname','unique_active_givenname',
 'unique_active_spelling_variant','unique_active_name_variant',
 'provisional_active_name_inactive_homonym','unresolved_employee_identity'))
);
CREATE INDEX employee_subject_evidence_staff_idx
 ON public.employee_teaching_subject_evidence(school_id,employee_id,teaching_department);
ALTER TABLE public.employee_teaching_subject_evidence ENABLE ROW LEVEL SECURITY;
-- Existing signed app contract counts exactly 77 FORCE tables.
-- Nonowner restricted signed runtime respects this policy.
CREATE POLICY employee_subject_signed_school_read_20261014
 ON public.employee_teaching_subject_evidence FOR SELECT
 TO assps_core_green_runtime
 USING (core_security.signed_school_allowed(school_id));
REVOKE ALL ON public.employee_teaching_subject_evidence FROM PUBLIC;
GRANT SELECT ON public.employee_teaching_subject_evidence TO assps_core_green_runtime;""")
 for name,(canon,dept) in GROUPS.items():
  pass
 cases_map=[f"WHEN {quote(s)} THEN {quote(c)}" for s,(c,dept) in GROUPS.items()]
 cases_group=[f"WHEN {quote(s)} THEN {quote(dept)}" for s,(c,dept) in GROUPS.items()]
 cases_employee=[f"WHEN {quote(label)} THEN {id}" for label,(id,status) in MATCH.items()]
 cases_status=[f"WHEN {quote(label)} THEN {quote(status)}" for label,(id,status) in MATCH.items()]
 # condition confirmed active school staff; else NULL.
 lines.append("""INSERT INTO public.employee_teaching_subject_evidence
 (school_id,timetable_id,employee_id,teacher_label,class_name,section,period_label,
  canonical_subject,teaching_department,identity_status,source_sha256)
 SELECT t.school_id,t.id,
 CASE t.teacher_display_name
 """+'\n '.join(cases_employee)+"""
 ELSE NULL END,
 t.teacher_display_name,t.class_name,t.section,t.period_label,
 CASE t.subject
 """+'\n '.join(cases_map)+"""
 ELSE t.subject END,
 CASE t.subject
 """+'\n '.join(cases_group)+"""
 ELSE 'Other / Review' END,
 CASE t.teacher_display_name
 """+'\n '.join(cases_status)+"""
 ELSE 'unresolved_employee_identity' END,
 t.source_sha256
 FROM public.timetable t WHERE t.school_id=1
   AND t.day_name='Regular' AND t.class_name<>'School-wide';
""")
 # Query table is restricted to properly identified employee rows.
 # Require all matched employees be in school1 and active; no permissions.
 lines.append("""DO $verify$
DECLARE total_rows integer; ix_count integer; invalid_emp integer; unset_approvals integer;
BEGIN
 SELECT count(*) INTO total_rows FROM public.timetable WHERE school_id=1 AND day_name='Regular';
 SELECT count(*) INTO ix_count FROM public.timetable WHERE school_id=1 AND class_name='Nine';
 SELECT count(*) INTO invalid_emp FROM public.employee_teaching_subject_evidence x
 JOIN public.employees e ON e.id=x.employee_id
 WHERE x.school_id<>e.school_id OR NOT e.is_active;
 SELECT count(*) INTO unset_approvals FROM public.timetable
 WHERE school_id=1 AND (teacher_id IS NOT NULL OR staff_identity_reviewed=true);
 IF total_rows<>58 OR ix_count<>16
  OR (SELECT count(*) FROM public.employee_teaching_subject_evidence WHERE school_id=1)<>56
  OR invalid_emp<>0 OR unset_approvals<>0
  OR (SELECT count(*) FROM teacher_class_assignments WHERE school_id=1 AND is_active)<>0
  OR (SELECT count(*) FROM exam_results WHERE school_id=1 AND exam_id=9)<1588
  OR (SELECT count(*) FROM public.timetable WHERE class_name='Six' AND period_label='Period 3'
    AND subject='Mathematics' AND teacher_display_name='Miss Ghulam Fatima' AND school_id=1)<>1
  OR (SELECT count(*) FROM public.timetable WHERE class_name='Five'
    AND period_label IN ('Period 3','Period 4') AND teacher_display_name='Miss Ausa'
    AND school_id=1)<>2
 THEN RAISE EXCEPTION 'TIMETABLE_AFTER_CHANGE_INTEGRITY_FAILED % % % %',
 total_rows,ix_count,invalid_emp,unset_approvals; END IF;
END $verify$;
COMMIT;""")
 return '\n'.join(lines)+'\n'
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--out',required=True)
 args=p.parse_args()
 Path(args.out).write_text(build())
 print('GENERATED Grade9 16 P3/P4/Five + P3/Six, 56 employee subject evidence, no access grants')
