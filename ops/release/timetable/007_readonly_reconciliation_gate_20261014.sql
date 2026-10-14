-- Read-only, school-scoped reference-metadata acceptance. NOT an academic release.
-- Returns a truthful verdict even when the canonical timetable is unchanged.
BEGIN TRANSACTION READ ONLY;
WITH
 t AS (
   SELECT count(*) AS total,
     count(*) FILTER(WHERE source_sha256='263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589') AS photo,
     count(*) FILTER(WHERE source_sha256='e182d9616f300e731e3e3dc957bc43934ef1f574b7b564714d433726c03fc724') AS grade9,
     count(*) FILTER(WHERE class_name IN ('Four','Five','Six','Seven') AND section='Blue') AS blue,
     count(*) FILTER(WHERE teacher_id IS NOT NULL) AS linked,
     count(*) FILTER(WHERE staff_identity_reviewed) AS staff_reviewed,
     count(*) FILTER(WHERE class_name='Pre-Nine' AND COALESCE(section,'')='') AS prenine_unassigned,
     count(*) FILTER(WHERE source_notes LIKE '%[Reference-only staff ID candidate from uniquely active employee/user;%') AS logged_links
   FROM public.timetable WHERE school_id=1
 ),
 x AS (
   SELECT count(*) AS total,
     count(*) FILTER(WHERE section='Blue' AND class_name IN ('Four','Five','Six','Seven')) AS blue
   FROM public.employee_teaching_subject_evidence WHERE school_id=1
 ),
 grants AS (
   SELECT count(*) AS active_grants FROM public.teacher_class_assignments WHERE school_id=1 AND is_active=true
 ),
 results AS (
   SELECT count(*) AS saved_marks, count(*) FILTER(WHERE marks_obtained=0) AS scored_zero
   FROM public.exam_results WHERE exam_id=9
 )
SELECT jsonb_pretty(jsonb_build_object(
  'school_id',1,
  'reference_metadata_verdict',
    CASE WHEN t.total=58 AND t.photo=42 AND t.grade9=16 AND t.blue=32 AND
      t.linked=43 AND t.logged_links=43 AND t.staff_reviewed=0 AND t.prenine_unassigned=8 AND
      x.total=56 AND x.blue=32 AND grants.active_grants=0 THEN
      'PASS_REFERENCE_ONLY_NOT_TEACHER_AUTHORIZATION'
    ELSE 'HOLD_REFERENCE_METADATA_RECONCILIATION'
    END,
  'timetable_rows',t.total,'photo_rows',t.photo,'grade9_rows',t.grade9,
  'blue_sections',t.blue,'linked_candidate_user_ids',t.linked,
  'staff_identity_reviewed',t.staff_reviewed,'pre_nine_unassigned',t.prenine_unassigned,
  'evidence_rows',x.total,'evidence_blue',x.blue,
  'official_active_grants',grants.active_grants,
  'real_exam9_scores',results.saved_marks,'numeric_zero_scores',results.scored_zero,
  'full_academic_release_certified',false,
  'note','This gate checks timetable REFERENCES only; authenticated staff/principal review, active signed RLS and marks printing require separate gates.'
)) AS reference_release_evidence
FROM t,x,grants,results;
COMMIT;
