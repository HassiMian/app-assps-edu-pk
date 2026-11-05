BEGIN READ ONLY;
WITH verified AS MATERIALIZED (
 SELECT DISTINCT a.class_name,a.section,a.subject
 FROM teacher_class_assignments a
 JOIN users u ON u.school_id=a.school_id AND u.id=a.teacher_user_id AND u.role='teacher' AND u.is_active=true
 JOIN employees e ON e.school_id=u.school_id AND e.user_id=u.id AND e.id=a.employee_id AND e.is_active=true
 WHERE a.school_id=1 AND a.is_active=true
 AND EXISTS (
   SELECT 1 FROM timetable t
   WHERE t.school_id=a.school_id AND t.teacher_id=a.teacher_user_id AND t.staff_identity_reviewed=true
   AND lower(btrim(t.class_name))=lower(btrim(a.class_name))
   AND lower(btrim(t.section))=lower(btrim(a.section))
   AND lower(btrim(t.subject))=lower(btrim(a.subject))
 )
 AND EXISTS(
   SELECT 1 FROM students s WHERE s.school_id=a.school_id AND s.is_active=true
   AND (CASE WHEN lower(btrim(s.class))='pre-nine' THEN 'pre nine' ELSE lower(btrim(s.class)) END)=
     (CASE WHEN lower(btrim(a.class_name))='pre-nine' THEN 'pre nine' ELSE lower(btrim(a.class_name)) END)
   AND lower(btrim(s.section))=lower(btrim(a.section))
 )
),
cohorts AS (
 SELECT s.class AS class_name,s.section,count(*)::int AS students
 FROM students s WHERE s.school_id=1 AND s.is_active=true
 GROUP BY s.class,s.section
)
SELECT 'COHORT|'||c.class_name||'|'||c.section||'|'||c.students||'|'||count(DISTINCT v.subject)
 FROM cohorts c LEFT JOIN verified v ON
 (CASE WHEN lower(btrim(c.class_name))='pre-nine' THEN 'pre nine' ELSE lower(btrim(c.class_name)) END)=
 (CASE WHEN lower(btrim(v.class_name))='pre-nine' THEN 'pre nine' ELSE lower(btrim(v.class_name)) END)
 AND lower(btrim(c.section))=lower(btrim(v.section))
 GROUP BY c.class_name,c.section,c.students ORDER BY c.class_name,c.section;
ROLLBACK;
