-- QA-ONLY REVERSAL of 005. Never run in production after live timetable edits.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '20s';
DO $guard$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM public.timetable WHERE school_id=1
   AND source_notes LIKE '%[Reference-only staff ID candidate from uniquely active employee/user;%';
 IF n<>43 THEN RAISE EXCEPTION 'Identity-link baseline changed: %',n; END IF;
 SELECT count(*) INTO n FROM public.timetable WHERE school_id=1
   AND source_notes LIKE '%[Reference reconciliation 2026-10-14: section Blue inferred%';
 IF n<>32 THEN RAISE EXCEPTION 'Section-link baseline changed: %',n; END IF;
END $guard$;
UPDATE public.timetable SET teacher_id=NULL,
 source_notes=replace(source_notes,
 ' [Reference-only staff ID candidate from uniquely active employee/user; staff_identity_reviewed=false and no marks permission granted.]','')
 WHERE school_id=1 AND teacher_id IS NOT NULL
  AND source_notes LIKE '%[Reference-only staff ID candidate from uniquely active employee/user;%';
UPDATE public.employee_teaching_subject_evidence SET section=''
 WHERE school_id=1 AND class_name IN ('Four','Five','Six','Seven') AND section='Blue';
UPDATE public.timetable SET section='',
 source_notes=replace(source_notes,
 ' [Reference reconciliation 2026-10-14: section Blue inferred from unique current active enrollment; uploaded photo did not specify a section. This is not a staff authorization.]','')
 WHERE school_id=1 AND class_name IN ('Four','Five','Six','Seven') AND section='Blue'
  AND source_notes LIKE '%[Reference reconciliation 2026-10-14: section Blue inferred%';
DO $post$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM public.timetable WHERE school_id=1 AND teacher_id IS NOT NULL;
 IF n<>0 THEN RAISE EXCEPTION 'Reference links not fully reverted: %',n; END IF;
 SELECT count(*) INTO n FROM public.timetable WHERE school_id=1
  AND class_name IN ('Four','Five','Six','Seven') AND section='Blue';
 IF n<>0 THEN RAISE EXCEPTION 'Reconciled sections not fully reverted: %',n; END IF;
 SELECT count(*) INTO n FROM public.teacher_class_assignments WHERE school_id=1 AND is_active=true;
 IF n<>0 THEN RAISE EXCEPTION 'Unexpected official grants: %',n; END IF;
END $post$;
COMMIT;
