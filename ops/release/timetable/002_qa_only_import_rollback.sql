-- DISPOSABLE QA ONLY. Strict rollback rehearsal of the imported photographic
-- timetable; NEVER apply on live apexos and never infer approval revocation.
BEGIN;
SET LOCAL lock_timeout='2500ms';
DO $pre$
BEGIN
 IF current_database()<>'assps_timetable_qa_20261014'
   OR current_setting('port')<>'55432'
   OR current_user<>'postgres'
   OR (SELECT count(*) FROM public.timetable WHERE school_id=1)<>42
   OR (SELECT count(*) FROM public.timetable WHERE school_id=1
     AND source_sha256='263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589')<>42
   OR (SELECT count(*) FROM public.timetable WHERE school_id=1 AND teacher_id IS NOT NULL)<>0
 THEN RAISE EXCEPTION 'DISPOSABLE_TIMETABLE_RESTORE_TARGET_MISMATCH'; END IF;
END $pre$;
DELETE FROM public.timetable WHERE school_id=1
 AND source_sha256='263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589';
ALTER TABLE public.timetable
 DROP COLUMN staff_identity_reviewed,
 DROP COLUMN source_notes,
 DROP COLUMN source_sha256,
 DROP COLUMN academic_session,
 DROP COLUMN teacher_display_name;
DO $post$
BEGIN
 IF (SELECT count(*) FROM timetable)<>0
   OR (SELECT count(*) FROM exam_results WHERE school_id=1 AND exam_id=9)<>1588
   OR (SELECT count(*) FROM teacher_class_assignments WHERE school_id=1 AND is_active)<>0
 THEN RAISE EXCEPTION 'DISPOSABLE_ROLLBACK_DATA_CHANGED'; END IF;
END $post$;
COMMIT;
