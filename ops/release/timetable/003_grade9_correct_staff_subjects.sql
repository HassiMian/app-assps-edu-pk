-- Verify this exact change against the 14 Oct 2026 uploaded photographic source and
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
END $guard$;
UPDATE public.timetable SET subject='Mathematics',teacher_display_name='Miss Ghulam Fatima',
  source_notes=coalesce(source_notes,'')||' | User-directed 2026-10-14: Six Period 3 from Miss Isma to Miss Ghulam Fatima.'
  WHERE school_id=1 AND class_name='Six' AND day_name='Regular'
    AND period_label='Period 3' AND subject='Mathematics'
    AND teacher_display_name='Miss Isma' AND teacher_id IS NULL;
UPDATE public.timetable SET subject='Science',teacher_display_name='Miss Ausa',
  source_notes=coalesce(source_notes,'')||' | User-directed 2026-10-14: Five Period 3 from Mam Afsa to Miss Ausa.'
  WHERE school_id=1 AND class_name='Five' AND day_name='Regular'
    AND period_label='Period 3' AND subject='Science'
    AND teacher_display_name='Mam Afsa' AND teacher_id IS NULL;
UPDATE public.timetable SET subject='Social Studies',teacher_display_name='Miss Ausa',
  source_notes=coalesce(source_notes,'')||' | User-directed 2026-10-14: Five Period 4 from Mam Aqsa to Miss Ausa.'
  WHERE school_id=1 AND class_name='Five' AND day_name='Regular'
    AND period_label='Period 4' AND subject='Social Studies'
    AND teacher_display_name='Mam Aqsa' AND teacher_id IS NULL;
UPDATE public.timetable SET teacher_display_name='Miss Ghulam Fatima',
    source_notes=coalesce(source_notes,'')||' | 2026-10-14 honorific normalized from Mam Ghulam Fatima to Miss Ghulam Fatima.'
    WHERE school_id=1 AND day_name='Regular' AND teacher_display_name='Mam Ghulam Fatima'
    AND teacher_id IS NULL;
UPDATE public.timetable SET teacher_display_name='Miss Tayyaba',
    source_notes=coalesce(source_notes,'')||' | 2026-10-14 honorific normalized from Mam Tayyaba to Miss Tayyaba.'
    WHERE school_id=1 AND day_name='Regular' AND teacher_display_name='Mam Tayyaba'
    AND teacher_id IS NULL;
UPDATE public.timetable SET teacher_display_name='Miss Mehreen',
    source_notes=coalesce(source_notes,'')||' | 2026-10-14 honorific normalized from Mam Mehreen to Miss Mehreen.'
    WHERE school_id=1 AND day_name='Regular' AND teacher_display_name='Mam Mehreen'
    AND teacher_id IS NULL;
INSERT INTO public.timetable (school_id,teacher_id,day_order,day_name,start_time,end_time,subject,class_name,section,room,period_label,teacher_display_name,academic_session,source_sha256,source_notes) VALUES ('1',NULL,'0','Regular','08:15:00','08:55:00','Tarjuma','Nine','Usman','','Period 1','Miss Maryam','2026–27','e182d9616f300e731e3e3dc957bc43934ef1f574b7b564714d433726c03fc724','11 Oct 2026 Class9 two-section approved source doc SHA e182d9616f300e731e3e3dc957bc43934ef1f574b7b564714d433726c03fc724; original Girls Fatma spelling, live section Fatima; Period7 Boys Computer Science Miss Isma correction verified. Staff capability provisional; NO authorization.');
INSERT INTO public.timetable (school_id,teacher_id,day_order,day_name,start_time,end_time,subject,class_name,section,room,period_label,teacher_display_name,academic_session,source_sha256,source_notes) VALUES ('1',NULL,'0','Regular','08:55:00','09:30:00','Chemistry','Nine','Usman','','Period 2','Sir Haseeb','2026–27','e182d9616f300e731e3e3dc957bc43934ef1f574b7b564714d433726c03fc724','11 Oct 2026 Class9 two-section approved source doc SHA e182d9616f300e731e3e3dc957bc43934ef1f574b7b564714d433726c03fc724; original Girls Fatma spelling, live section Fatima; Period7 Boys Computer Science Miss Isma correction verified. Staff capability provisional; NO authorization.');
INSERT INTO public.timetable (school_id,teacher_id,day_order,day_name,start_time,end_time,subject,class_name,section,room,period_label,teacher_display_name,academic_session,source_sha256,source_notes) VALUES ('1',NULL,'0','Regular','09:30:00','10:05:00','English','Nine','Usman','','Period 3','Miss Ayesha','2026–27','e182d9616f300e731e3e3dc957bc43934ef1f574b7b564714d433726c03fc724','11 Oct 2026 Class9 two-section approved source doc SHA e182d9616f300e731e3e3dc957bc43934ef1f574b7b564714d433726c03fc724; original Girls Fatma spelling, live section Fatima; Period7 Boys Computer Science Miss Isma correction verified. Staff capability provisional; NO authorization.');
INSERT INTO public.timetable (school_id,teacher_id,day_order,day_name,start_time,end_time,subject,class_name,section,room,period_label,teacher_display_name,academic_session,source_sha256,source_notes) VALUES ('1',NULL,'0','Regular','10:05:00','10:40:00','Physics','Nine','Usman','','Period 4','Miss Ghulam Fatima','2026–27','e182d9616f300e731e3e3dc957bc43934ef1f574b7b564714d433726c03fc724','11 Oct 2026 Class9 two-section approved source doc SHA e182d9616f300e731e3e3dc957bc43934ef1f574b7b564714d433726c03fc724; original Girls Fatma spelling, live section Fatima; Period7 Boys Computer Science Miss Isma correction verified. Staff capability provisional; NO authorization.');
INSERT INTO public.timetable (school_id,teacher_id,day_order,day_name,start_time,end_time,subject,class_name,section,room,period_label,teacher_display_name,academic_session,source_sha256,source_notes) VALUES ('1',NULL,'0','Regular','10:40:00','11:15:00','Islamiyat','Nine','Usman','','Period 5','Qari Fida-ul-Rehman','2026–27','e182d9616f300e731e3e3dc957bc43934ef1f574b7b564714d433726c03fc724','11 Oct 2026 Class9 two-section approved source doc SHA e182d9616f300e731e3e3dc957bc43934ef1f574b7b564714d433726c03fc724; original Girls Fatma spelling, live section Fatima; Period7 Boys Computer Science Miss Isma correction verified. Staff capability provisional; NO authorization.');
INSERT INTO public.timetable (school_id,teacher_id,day_order,day_name,start_time,end_time,subject,class_name,section,room,period_label,teacher_display_name,academic_session,source_sha256,source_notes) VALUES ('1',NULL,'0','Regular','11:15:00','11:50:00','Urdu','Nine','Usman','','Period 6','Miss Nazra','2026–27','e182d9616f300e731e3e3dc957bc43934ef1f574b7b564714d433726c03fc724','11 Oct 2026 Class9 two-section approved source doc SHA e182d9616f300e731e3e3dc957bc43934ef1f574b7b564714d433726c03fc724; original Girls Fatma spelling, live section Fatima; Period7 Boys Computer Science Miss Isma correction verified. Staff capability provisional; NO authorization.');
INSERT INTO public.timetable (school_id,teacher_id,day_order,day_name,start_time,end_time,subject,class_name,section,room,period_label,teacher_display_name,academic_session,source_sha256,source_notes) VALUES ('1',NULL,'0','Regular','12:15:00','12:50:00','Computer Science','Nine','Usman','','Period 7','Miss Isma','2026–27','e182d9616f300e731e3e3dc957bc43934ef1f574b7b564714d433726c03fc724','11 Oct 2026 Class9 two-section approved source doc SHA e182d9616f300e731e3e3dc957bc43934ef1f574b7b564714d433726c03fc724; original Girls Fatma spelling, live section Fatima; Period7 Boys Computer Science Miss Isma correction verified. Staff capability provisional; NO authorization.');
INSERT INTO public.timetable (school_id,teacher_id,day_order,day_name,start_time,end_time,subject,class_name,section,room,period_label,teacher_display_name,academic_session,source_sha256,source_notes) VALUES ('1',NULL,'0','Regular','12:50:00','13:30:00','Mathematics','Nine','Usman','','Period 8','Miss Ghulam Fatima','2026–27','e182d9616f300e731e3e3dc957bc43934ef1f574b7b564714d433726c03fc724','11 Oct 2026 Class9 two-section approved source doc SHA e182d9616f300e731e3e3dc957bc43934ef1f574b7b564714d433726c03fc724; original Girls Fatma spelling, live section Fatima; Period7 Boys Computer Science Miss Isma correction verified. Staff capability provisional; NO authorization.');
INSERT INTO public.timetable (school_id,teacher_id,day_order,day_name,start_time,end_time,subject,class_name,section,room,period_label,teacher_display_name,academic_session,source_sha256,source_notes) VALUES ('1',NULL,'0','Regular','08:15:00','08:55:00','Physics','Nine','Fatima','','Period 1','Miss Ghulam Fatima','2026–27','e182d9616f300e731e3e3dc957bc43934ef1f574b7b564714d433726c03fc724','11 Oct 2026 Class9 two-section approved source doc SHA e182d9616f300e731e3e3dc957bc43934ef1f574b7b564714d433726c03fc724; original Girls Fatma spelling, live section Fatima; Period7 Boys Computer Science Miss Isma correction verified. Staff capability provisional; NO authorization.');
INSERT INTO public.timetable (school_id,teacher_id,day_order,day_name,start_time,end_time,subject,class_name,section,room,period_label,teacher_display_name,academic_session,source_sha256,source_notes) VALUES ('1',NULL,'0','Regular','08:55:00','09:30:00','Mathematics','Nine','Fatima','','Period 2','Miss Ghulam Fatima','2026–27','e182d9616f300e731e3e3dc957bc43934ef1f574b7b564714d433726c03fc724','11 Oct 2026 Class9 two-section approved source doc SHA e182d9616f300e731e3e3dc957bc43934ef1f574b7b564714d433726c03fc724; original Girls Fatma spelling, live section Fatima; Period7 Boys Computer Science Miss Isma correction verified. Staff capability provisional; NO authorization.');
INSERT INTO public.timetable (school_id,teacher_id,day_order,day_name,start_time,end_time,subject,class_name,section,room,period_label,teacher_display_name,academic_session,source_sha256,source_notes) VALUES ('1',NULL,'0','Regular','09:30:00','10:05:00','Chemistry','Nine','Fatima','','Period 3','Sir Haseeb','2026–27','e182d9616f300e731e3e3dc957bc43934ef1f574b7b564714d433726c03fc724','11 Oct 2026 Class9 two-section approved source doc SHA e182d9616f300e731e3e3dc957bc43934ef1f574b7b564714d433726c03fc724; original Girls Fatma spelling, live section Fatima; Period7 Boys Computer Science Miss Isma correction verified. Staff capability provisional; NO authorization.');
INSERT INTO public.timetable (school_id,teacher_id,day_order,day_name,start_time,end_time,subject,class_name,section,room,period_label,teacher_display_name,academic_session,source_sha256,source_notes) VALUES ('1',NULL,'0','Regular','10:05:00','10:40:00','Biology','Nine','Fatima','','Period 4','Sir Haseeb','2026–27','e182d9616f300e731e3e3dc957bc43934ef1f574b7b564714d433726c03fc724','11 Oct 2026 Class9 two-section approved source doc SHA e182d9616f300e731e3e3dc957bc43934ef1f574b7b564714d433726c03fc724; original Girls Fatma spelling, live section Fatima; Period7 Boys Computer Science Miss Isma correction verified. Staff capability provisional; NO authorization.');
INSERT INTO public.timetable (school_id,teacher_id,day_order,day_name,start_time,end_time,subject,class_name,section,room,period_label,teacher_display_name,academic_session,source_sha256,source_notes) VALUES ('1',NULL,'0','Regular','10:40:00','11:15:00','Quran','Nine','Fatima','','Period 5','Miss Maryam','2026–27','e182d9616f300e731e3e3dc957bc43934ef1f574b7b564714d433726c03fc724','11 Oct 2026 Class9 two-section approved source doc SHA e182d9616f300e731e3e3dc957bc43934ef1f574b7b564714d433726c03fc724; original Girls Fatma spelling, live section Fatima; Period7 Boys Computer Science Miss Isma correction verified. Staff capability provisional; NO authorization.');
INSERT INTO public.timetable (school_id,teacher_id,day_order,day_name,start_time,end_time,subject,class_name,section,room,period_label,teacher_display_name,academic_session,source_sha256,source_notes) VALUES ('1',NULL,'0','Regular','11:15:00','11:50:00','English','Nine','Fatima','','Period 6','Miss Ayesha','2026–27','e182d9616f300e731e3e3dc957bc43934ef1f574b7b564714d433726c03fc724','11 Oct 2026 Class9 two-section approved source doc SHA e182d9616f300e731e3e3dc957bc43934ef1f574b7b564714d433726c03fc724; original Girls Fatma spelling, live section Fatima; Period7 Boys Computer Science Miss Isma correction verified. Staff capability provisional; NO authorization.');
INSERT INTO public.timetable (school_id,teacher_id,day_order,day_name,start_time,end_time,subject,class_name,section,room,period_label,teacher_display_name,academic_session,source_sha256,source_notes) VALUES ('1',NULL,'0','Regular','12:15:00','12:50:00','Islamiyat','Nine','Fatima','','Period 7','Sir Fida-ul-Rehman','2026–27','e182d9616f300e731e3e3dc957bc43934ef1f574b7b564714d433726c03fc724','11 Oct 2026 Class9 two-section approved source doc SHA e182d9616f300e731e3e3dc957bc43934ef1f574b7b564714d433726c03fc724; original Girls Fatma spelling, live section Fatima; Period7 Boys Computer Science Miss Isma correction verified. Staff capability provisional; NO authorization.');
INSERT INTO public.timetable (school_id,teacher_id,day_order,day_name,start_time,end_time,subject,class_name,section,room,period_label,teacher_display_name,academic_session,source_sha256,source_notes) VALUES ('1',NULL,'0','Regular','12:50:00','13:30:00','Urdu','Nine','Fatima','','Period 8','Miss Nazra','2026–27','e182d9616f300e731e3e3dc957bc43934ef1f574b7b564714d433726c03fc724','11 Oct 2026 Class9 two-section approved source doc SHA e182d9616f300e731e3e3dc957bc43934ef1f574b7b564714d433726c03fc724; original Girls Fatma spelling, live section Fatima; Period7 Boys Computer Science Miss Isma correction verified. Staff capability provisional; NO authorization.');
-- Save teaching subjects in a normalized, employee-linked evidence matrix.
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
GRANT SELECT ON public.employee_teaching_subject_evidence TO assps_core_green_runtime;
INSERT INTO public.employee_teaching_subject_evidence
 (school_id,timetable_id,employee_id,teacher_label,class_name,section,period_label,
  canonical_subject,teaching_department,identity_status,source_sha256)
 SELECT t.school_id,t.id,
 CASE t.teacher_display_name
 WHEN 'Miss Ghulam Fatima' THEN 57
 WHEN 'Miss Isma' THEN 45
 WHEN 'Miss Sumaira' THEN 33
 WHEN 'Miss Ayesha' THEN 32
 WHEN 'Miss Mehreen' THEN 61
 WHEN 'Miss Tayyaba' THEN 60
 WHEN 'Miss Aqsa' THEN 59
 WHEN 'Sir Haseeb' THEN 28
 WHEN 'Qari Fida-ul-Rehman' THEN 41
 WHEN 'Sir Fida-ul-Rehman' THEN 41
 WHEN 'Qari Imran' THEN 65
 WHEN 'Miss Nazra' THEN 30
 ELSE NULL END,
 t.teacher_display_name,t.class_name,t.section,t.period_label,
 CASE t.subject
 WHEN 'Mathematics' THEN 'Mathematics'
 WHEN 'Science' THEN 'Science'
 WHEN 'Physics' THEN 'Physics'
 WHEN 'Chemistry' THEN 'Chemistry'
 WHEN 'Biology' THEN 'Biology'
 WHEN 'Computer Science' THEN 'Computer Science'
 WHEN 'English A' THEN 'English'
 WHEN 'English B' THEN 'English'
 WHEN 'English' THEN 'English'
 WHEN 'Urdu' THEN 'Urdu'
 WHEN 'Social Studies' THEN 'Social Studies'
 WHEN 'Islamiyat' THEN 'Islamiyat'
 WHEN 'Nazra' THEN 'Nazra'
 WHEN 'Quran' THEN 'Quran'
 WHEN 'Tarjuma' THEN 'Tarjuma'
 ELSE t.subject END,
 CASE t.subject
 WHEN 'Mathematics' THEN 'STEM / Mathematics'
 WHEN 'Science' THEN 'STEM / Science'
 WHEN 'Physics' THEN 'STEM / Science'
 WHEN 'Chemistry' THEN 'STEM / Science'
 WHEN 'Biology' THEN 'STEM / Science'
 WHEN 'Computer Science' THEN 'Computer Science / IT'
 WHEN 'English A' THEN 'Languages'
 WHEN 'English B' THEN 'Languages'
 WHEN 'English' THEN 'Languages'
 WHEN 'Urdu' THEN 'Languages'
 WHEN 'Social Studies' THEN 'Humanities / Social Sciences'
 WHEN 'Islamiyat' THEN 'Islamic Studies'
 WHEN 'Nazra' THEN 'Islamic Studies'
 WHEN 'Quran' THEN 'Islamic Studies'
 WHEN 'Tarjuma' THEN 'Islamic Studies'
 ELSE 'Other / Review' END,
 CASE t.teacher_display_name
 WHEN 'Miss Ghulam Fatima' THEN 'unique_active_fullname'
 WHEN 'Miss Isma' THEN 'unique_active_givenname'
 WHEN 'Miss Sumaira' THEN 'unique_active_givenname'
 WHEN 'Miss Ayesha' THEN 'unique_active_givenname'
 WHEN 'Miss Mehreen' THEN 'unique_active_givenname'
 WHEN 'Miss Tayyaba' THEN 'unique_active_spelling_variant'
 WHEN 'Miss Aqsa' THEN 'unique_active_givenname'
 WHEN 'Sir Haseeb' THEN 'unique_active_givenname'
 WHEN 'Qari Fida-ul-Rehman' THEN 'unique_active_name_variant'
 WHEN 'Sir Fida-ul-Rehman' THEN 'unique_active_name_variant'
 WHEN 'Qari Imran' THEN 'unique_active_givenname'
 WHEN 'Miss Nazra' THEN 'provisional_active_name_inactive_homonym'
 ELSE 'unresolved_employee_identity' END,
 t.source_sha256
 FROM public.timetable t WHERE t.school_id=1
   AND t.day_name='Regular' AND t.class_name<>'School-wide';

DO $verify$
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
COMMIT;
