-- A315: SCHOOL 1 ONLY; strictly read-only. Never alters marks, approvals, or archived baseline.
BEGIN TRANSACTION READ ONLY;
WITH exam AS (
 SELECT id,school_id,start_date,end_date
 FROM public.exams WHERE school_id=1 AND id=9
), scored AS (
 SELECT r.id,r.student_id,r.subject,r.marks_obtained,r.total_marks,r.grade,
  s.class current_class,s.section current_section,s.admission_date,
  e.end_date AS exam_end
 FROM public.exam_results r
 JOIN exam e ON e.id=r.exam_id AND e.school_id=r.school_id
 JOIN public.students s ON s.id=r.student_id AND s.school_id=r.school_id
), grade_resolved AS (
 SELECT s.*, g.label AS official_grade
 FROM scored s
 LEFT JOIN public.grade_settings g
 ON g.school_id=1
  AND floor(s.marks_obtained*100.0/nullif(s.total_marks,0))
      BETWEEN g.min_percentage AND g.max_percentage
), subject_configuration AS (
 SELECT x.id, x.class_name,x.section,x.subject,x.approval_status,
  COUNT(r.id) AS count_rows,COUNT(DISTINCT r.total_marks) AS maxima_count
 FROM public.exam_subjects x
 LEFT JOIN public.students s ON s.school_id=x.school_id AND
 lower(btrim(s.class))=lower(btrim(x.class_name)) AND
 lower(btrim(s.section))=lower(btrim(x.section))
 LEFT JOIN public.exam_results r ON r.school_id=1 AND r.exam_id=9
  AND r.student_id=s.id AND lower(btrim(r.subject))=lower(btrim(x.subject))
 WHERE x.school_id=1 AND x.exam_id=9 AND x.is_active
 GROUP BY x.id
), grade910 AS (
 SELECT COUNT(*) FILTER (WHERE is_approved) AS approved,
 COUNT(*) FILTER (
  WHERE is_approved AND
  (source_file_id IS NULL OR source_page_no IS NULL OR
   NULLIF(btrim(answer),'') IS NULL OR lower(btrim(source_type))='json_seed'
   OR lower(btrim(coalesce(metadata->>'review_state','')))= 'provisional_internal')
 ) AS approved_unverified
 FROM public.question_bank WHERE school_id=1 AND class_level IN ('9th','10th')
), grade_mismatches AS (
 SELECT current_class,COUNT(*) AS n
 FROM grade_resolved
 WHERE grade IS DISTINCT FROM official_grade
 GROUP BY current_class
)
SELECT json_build_object(
 'schema','ASSPS_A315_READ_ONLY_ACADEMIC_RELEASE_READINESS',
 'school_id',1,'exam_id',9,
 'exam9_rows',(SELECT COUNT(*) FROM scored),
 'exam9_students',(SELECT COUNT(DISTINCT student_id) FROM scored),
 'actual_zero_marks',(SELECT COUNT(*) FROM scored WHERE marks_obtained=0),
 'late_admission_after_exam',(SELECT COUNT(*) FROM scored WHERE admission_date>exam_end),
 'subject_score_40_to_49_pct',(SELECT COUNT(*) FROM scored
  WHERE floor(marks_obtained*100/nullif(total_marks,0)) BETWEEN 40 AND 49),
 'stored_grades_outside_configured_policy',(SELECT COUNT(*) FROM grade_resolved
  WHERE grade IS DISTINCT FROM official_grade),
 'configured_grade_policy_missing_rows',(SELECT COUNT(*) FROM grade_resolved
  WHERE official_grade IS NULL),
 'subjects_with_mixed_maximum',(SELECT COUNT(*) FROM subject_configuration WHERE maxima_count>1),
 'subjects_without_scores',(SELECT COUNT(*) FROM subject_configuration WHERE count_rows=0),
 'subject_configurations_approved',(SELECT COUNT(*) FROM subject_configuration WHERE approval_status='approved'),
 'approved_grade910_questions',(SELECT approved FROM grade910),
 'approved_grade910_questions_missing_evidence',(SELECT approved_unverified FROM grade910),
 'grade_mismatch_by_class',(SELECT coalesce(json_object_agg(current_class,n),'{}'::json) FROM grade_mismatches),
 'academic_release_decision','HOLD',
 'production_mutations',false
)::text AS readiness;
COMMIT;
