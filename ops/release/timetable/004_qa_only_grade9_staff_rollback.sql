-- DISPOSABLE QA ONLY: tests restoring prior 42 lecture/bell source.
BEGIN;
SET LOCAL lock_timeout='2500ms';
DO $pre$
BEGIN
 IF current_database()<>'assps_timetable_9staff_qa_20261014'
  OR current_setting('port')<>'55432' OR current_user<>'postgres'
  OR (SELECT count(*) FROM public.timetable WHERE school_id=1)<>58
  OR (SELECT count(*) FROM public.employee_teaching_subject_evidence WHERE school_id=1)<>56
  OR (SELECT count(*) FROM public.timetable WHERE school_id=1 AND class_name='Nine')<>16
 THEN RAISE EXCEPTION 'CLASS9_QA_ROLLBACK_GUARD_FAILED'; END IF;
END $pre$;
DROP TABLE public.employee_teaching_subject_evidence;
DELETE FROM public.timetable WHERE school_id=1 AND class_name='Nine'
  AND source_sha256='e182d9616f300e731e3e3dc957bc43934ef1f574b7b564714d433726c03fc724';
UPDATE public.timetable SET teacher_display_name='Miss Isma'
 WHERE school_id=1 AND class_name='Six' AND period_label='Period 3'
   AND teacher_display_name='Miss Ghulam Fatima';
UPDATE public.timetable SET teacher_display_name='Mam Afsa'
 WHERE school_id=1 AND class_name='Five' AND period_label='Period 3'
   AND teacher_display_name='Miss Ausa';
UPDATE public.timetable SET teacher_display_name='Mam Aqsa'
 WHERE school_id=1 AND class_name='Five' AND period_label='Period 4'
   AND teacher_display_name='Miss Ausa';
UPDATE public.timetable SET teacher_display_name='Mam Ghulam Fatima'
 WHERE school_id=1 AND class_name='Pre-Nine' AND period_label='Period 5'
   AND teacher_display_name='Miss Ghulam Fatima';
UPDATE public.timetable SET teacher_display_name='Mam Tayyaba'
 WHERE school_id=1 AND class_name='Pre-Nine' AND period_label='Period 4'
   AND teacher_display_name='Miss Tayyaba';
UPDATE public.timetable SET teacher_display_name='Mam Mehreen'
 WHERE school_id=1 AND class_name='Seven' AND period_label='Period 7'
   AND teacher_display_name='Miss Mehreen';
DO $post$
BEGIN
 IF (SELECT count(*) FROM timetable WHERE school_id=1)<>42
 OR (SELECT count(*) FROM exam_results WHERE school_id=1 AND exam_id=9)<1588
 OR (SELECT count(*) FROM teacher_class_assignments WHERE school_id=1 AND is_active)<>0
 OR EXISTS(SELECT 1 FROM information_schema.tables
  WHERE table_name='employee_teaching_subject_evidence')
 THEN RAISE EXCEPTION 'CLASS9_QA_RESTORE_MISMATCH'; END IF;
END $post$;
COMMIT;
