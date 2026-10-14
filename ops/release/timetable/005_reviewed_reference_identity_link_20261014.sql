-- OWNER-REVIEW CANDIDATE ONLY. SaaS Core must authorize and execute after QA.
-- This is timetable REFERENCE METADATA, not teacher_class_assignments grants.
-- Never set staff_identity_reviewed=true based on this automated name mapping.
-- Do not rewrite the photo's 2024-25 printed year or the instructed 2026-27
-- operational session; both remain separately documented in source_notes.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '20s';

DO $guard$
DECLARE
  n_all integer;
  n_photo integer;
  n_ix integer;
  n_evidence integer;
  n_unique_sections integer;
  n_bad_evidence integer;
BEGIN
  SELECT count(*),count(*) FILTER(WHERE source_sha256='263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589'),
    count(*) FILTER(WHERE source_sha256='e182d9616f300e731e3e3dc957bc43934ef1f574b7b564714d433726c03fc724')
    INTO n_all,n_photo,n_ix FROM public.timetable WHERE school_id=1;
  IF n_all<>58 OR n_photo<>42 OR n_ix<>16 THEN
    RAISE EXCEPTION 'Timetable source revision changed: %, %, %; stop and reconcile',n_all,n_photo,n_ix;
  END IF;
  SELECT count(*) INTO n_evidence FROM public.employee_teaching_subject_evidence WHERE school_id=1;
  IF n_evidence<>56 THEN
    RAISE EXCEPTION 'Unexpected candidate identity evidence count: %',n_evidence;
  END IF;
  SELECT count(*) INTO n_unique_sections FROM (
    SELECT class, min(section) AS sec
    FROM public.students WHERE school_id=1 AND class IN ('Four','Five','Six','Seven')
      AND is_active=true GROUP BY class
    HAVING count(DISTINCT section)=1 AND min(section)='Blue'
  ) s;
  IF n_unique_sections<>4 THEN
    RAISE EXCEPTION 'Sections changed or unverified; expected Blue-only in Four, Five, Six, Seven, got %',n_unique_sections;
  END IF;
  SELECT count(*) INTO n_bad_evidence FROM public.employee_teaching_subject_evidence x
    LEFT JOIN public.timetable t ON t.id=x.timetable_id AND t.school_id=x.school_id
    WHERE x.school_id=1 AND (t.id IS NULL OR x.source_sha256 IS DISTINCT FROM t.source_sha256
      OR x.teacher_label IS DISTINCT FROM t.teacher_display_name
      OR x.authorization_status IS DISTINCT FROM 'schedule_reference_only');
  IF n_bad_evidence<>0 THEN
    RAISE EXCEPTION 'Timetable/evidence mismatches: %',n_bad_evidence;
  END IF;
END $guard$;

UPDATE public.timetable
 SET section='Blue',
     source_notes=concat_ws(' ', nullif(source_notes,''),
       '[Reference reconciliation 2026-10-14: section Blue inferred from unique current active enrollment; uploaded photo did not specify a section. This is not a staff authorization.]')
 WHERE school_id=1 AND class_name IN ('Four','Five','Six','Seven')
   AND COALESCE(section,'')='' AND academic_session='2026–27';
UPDATE public.employee_teaching_subject_evidence x
 SET section=t.section
 FROM public.timetable t
 WHERE x.school_id=1 AND x.timetable_id=t.id AND t.school_id=1
   AND t.class_name IN ('Four','Five','Six','Seven') AND t.section='Blue'
   AND COALESCE(x.section,'')='';

-- Only unique active identity evidence, never provisional homonyms or missing
-- names ('Miss Ausa' and 'Miss Maryam' remain unresolved).
UPDATE public.timetable t
 SET teacher_id=u.id,
     source_notes=concat_ws(' ', nullif(t.source_notes,''),
       '[Reference-only staff ID candidate from uniquely active employee/user; staff_identity_reviewed=false and no marks permission granted.]')
 FROM public.employee_teaching_subject_evidence x
 JOIN public.employees e ON e.id=x.employee_id AND e.school_id=x.school_id
 JOIN public.users u ON u.id=e.user_id AND u.school_id=e.school_id
 WHERE t.school_id=1 AND t.id=x.timetable_id AND x.school_id=1
   AND x.teacher_label=t.teacher_display_name
   AND x.authorization_status='schedule_reference_only'
   AND x.identity_status IN ('unique_active_givenname','unique_active_fullname',
      'unique_active_spelling_variant','unique_active_name_variant')
   AND e.is_active=true AND u.is_active=true AND u.role='teacher'
   AND t.teacher_id IS NULL;

DO $post$
DECLARE
  n_blue integer;
  n_linked integer;
  n_reviewed integer;
  n_grants integer;
  n_preserved integer;
  n_invalid integer;
BEGIN
  SELECT count(*) INTO n_blue FROM public.timetable
    WHERE school_id=1 AND class_name IN ('Four','Five','Six','Seven') AND section='Blue';
  SELECT count(*) INTO n_linked FROM public.timetable
    WHERE school_id=1 AND teacher_id IS NOT NULL;
  SELECT count(*) INTO n_reviewed FROM public.timetable
    WHERE school_id=1 AND staff_identity_reviewed=true;
  SELECT count(*) INTO n_grants FROM public.teacher_class_assignments
    WHERE school_id=1 AND is_active=true;
  SELECT count(*) INTO n_preserved FROM public.timetable
    WHERE school_id=1 AND class_name='Pre-Nine' AND COALESCE(section,'')='';
  SELECT count(*) INTO n_invalid
  FROM public.timetable t
  LEFT JOIN public.users u ON u.id=t.teacher_id AND u.school_id=t.school_id
  LEFT JOIN public.employee_teaching_subject_evidence x
    ON x.timetable_id=t.id AND x.school_id=t.school_id
  LEFT JOIN public.employees e ON e.id=x.employee_id AND e.school_id=x.school_id
  WHERE t.school_id=1 AND t.teacher_id IS NOT NULL
    AND (u.id IS NULL OR u.is_active IS DISTINCT FROM true OR u.role IS DISTINCT FROM 'teacher'
      OR e.id IS NULL OR e.is_active IS DISTINCT FROM true OR e.user_id IS DISTINCT FROM t.teacher_id
      OR x.authorization_status IS DISTINCT FROM 'schedule_reference_only'
      OR x.identity_status NOT IN ('unique_active_givenname','unique_active_fullname',
        'unique_active_spelling_variant','unique_active_name_variant'));
  IF n_invalid<>0 THEN
    RAISE EXCEPTION 'Invalid or revoked active timetable user links: %',n_invalid;
  END IF;
  IF n_blue<>32 OR n_linked<>43 OR n_reviewed<>0 OR n_grants<>0 OR n_preserved<>8 THEN
    RAISE EXCEPTION 'Postchecks failed blue%, linked%, reviewed%, grants%, PreNine%',n_blue,n_linked,n_reviewed,n_grants,n_preserved;
  END IF;
END $post$;
COMMIT;
