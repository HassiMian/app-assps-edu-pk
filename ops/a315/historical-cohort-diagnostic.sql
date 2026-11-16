BEGIN TRANSACTION READ ONLY;
WITH exam_window AS (
 SELECT id,school_id,end_date FROM public.exams WHERE id=9 AND school_id=1
), scored AS (
 SELECT DISTINCT r.student_id FROM public.exam_results r JOIN exam_window e
 ON e.id=r.exam_id AND e.school_id=r.school_id
), candidates AS (
 SELECT DISTINCT ON (m.student_id) m.student_id,
   m.source_class,m.source_section,m.target_class,m.target_section,
   m.moved_at
 FROM public.student_class_movement_audit m
 JOIN public.students s ON s.school_id=m.school_id AND s.id=m.student_id
 JOIN exam_window e ON e.school_id=m.school_id
 WHERE m.moved_at::date>e.end_date
   AND lower(btrim(m.target_class))=lower(btrim(s.class))
   AND lower(btrim(m.target_section))=lower(btrim(s.section))
   AND ((m.source_class='Eight' AND m.target_class='Pre Nine')
    OR (m.source_class='One' AND m.target_class='Flyer'))
 ORDER BY m.student_id,m.moved_at DESC
), context AS (
 SELECT 'raw_current_class' AS mode,s.id student_id,s.class class_name,s.section,
        s.admission_date,true AS eligible,false AS reclassified
 FROM public.students s JOIN scored p ON p.student_id=s.id WHERE s.school_id=1
 UNION ALL
 SELECT 'historical_candidate' AS mode,s.id student_id,
   COALESCE(c.source_class,s.class) class_name,
   COALESCE(c.source_section,s.section) section,
   s.admission_date, (s.admission_date IS NULL OR s.admission_date<=e.end_date) eligible,
   (c.student_id IS NOT NULL) reclassified
 FROM public.students s JOIN scored p ON p.student_id=s.id
 CROSS JOIN exam_window e
 LEFT JOIN candidates c ON c.student_id=s.id
 WHERE s.school_id=1
), expected AS (
 SELECT c.mode,c.student_id,es.subject
 FROM context c JOIN public.exam_subjects es ON es.school_id=1 AND es.exam_id=9
  AND es.is_active
  AND lower(btrim(c.class_name))=lower(btrim(es.class_name))
  AND lower(btrim(c.section))=lower(btrim(es.section))
 WHERE c.eligible
), actual AS (
 SELECT c.mode,r.id result_id,r.student_id,r.subject,r.total_marks
 FROM context c JOIN public.exam_results r ON r.school_id=1 AND r.exam_id=9 AND r.student_id=c.student_id
 WHERE c.eligible
), modes AS (
 SELECT mode,COUNT(DISTINCT student_id) scored_students,
        COUNT(DISTINCT student_id) FILTER (WHERE NOT eligible) excluded_post_term_students,
        COUNT(DISTINCT student_id) FILTER (WHERE reclassified) mapped_promotion_students
 FROM context GROUP BY mode
), measures AS (
 SELECT m.mode,m.scored_students,m.excluded_post_term_students,m.mapped_promotion_students,
 (SELECT count(*) FROM actual a WHERE a.mode=m.mode) AS recorded_subject_rows,
 (SELECT count(*) FROM expected es WHERE es.mode=m.mode) AS expected_subject_rows,
 (SELECT count(*) FROM expected es
    WHERE es.mode=m.mode AND NOT EXISTS (
      SELECT 1 FROM actual r WHERE r.mode=m.mode
        AND r.student_id=es.student_id
        AND lower(btrim(r.subject))=lower(btrim(es.subject)))) AS missing_entries,
 (SELECT count(*) FROM actual r WHERE r.mode=m.mode AND NOT EXISTS (
    SELECT 1 FROM public.exam_subjects es JOIN context c
    ON c.mode=r.mode AND c.student_id=r.student_id
    WHERE es.school_id=1 AND es.exam_id=9 AND es.is_active
      AND lower(btrim(es.class_name))=lower(btrim(c.class_name))
      AND lower(btrim(es.section))=lower(btrim(c.section))
      AND lower(btrim(es.subject))=lower(btrim(r.subject)))) AS unmapped_rows
 FROM modes m
)
SELECT mode,scored_students,excluded_post_term_students,mapped_promotion_students,
 recorded_subject_rows,expected_subject_rows,missing_entries,unmapped_rows
FROM measures ORDER BY mode;
COMMIT;
