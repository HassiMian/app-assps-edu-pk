BEGIN READ ONLY;
WITH active_cohorts AS (
  SELECT school_id,class,section,count(*)::int AS students
  FROM students WHERE school_id=1 AND is_active=true
  GROUP BY school_id,class,section
)
SELECT 'SOURCE|'||s.class||'|'||s.section||'|'||s.students||'|'||
 (SELECT count(*) FROM teacher_class_assignments a WHERE a.school_id=s.school_id AND a.is_active=true
    AND (CASE WHEN lower(btrim(a.class_name))='pre-nine' THEN 'pre nine' ELSE lower(btrim(a.class_name)) END)=(CASE WHEN lower(btrim(s.class))='pre-nine' THEN 'pre nine' ELSE lower(btrim(s.class)) END)
    AND lower(btrim(a.section))=lower(btrim(s.section)))||'|'||
 (SELECT count(*) FROM timetable t WHERE t.school_id=s.school_id AND t.staff_identity_reviewed=true
    AND (CASE WHEN lower(btrim(t.class_name))='pre-nine' THEN 'pre nine' ELSE lower(btrim(t.class_name)) END)=(CASE WHEN lower(btrim(s.class))='pre-nine' THEN 'pre nine' ELSE lower(btrim(s.class)) END)
    AND lower(btrim(t.section))=lower(btrim(s.section)))||'|'||
 (SELECT count(DISTINCT a.subject) FROM teacher_class_assignments a
   JOIN users u ON u.school_id=a.school_id AND u.id=a.teacher_user_id AND u.role='teacher' AND u.is_active=true
   JOIN employees e ON e.school_id=u.school_id AND e.user_id=u.id AND e.id=a.employee_id AND e.is_active=true
   WHERE a.school_id=s.school_id AND a.is_active=true
    AND (CASE WHEN lower(btrim(a.class_name))='pre-nine' THEN 'pre nine' ELSE lower(btrim(a.class_name)) END)=(CASE WHEN lower(btrim(s.class))='pre-nine' THEN 'pre nine' ELSE lower(btrim(s.class)) END)
    AND lower(btrim(a.section))=lower(btrim(s.section))
    AND EXISTS (SELECT 1 FROM timetable t WHERE t.school_id=a.school_id AND t.teacher_id=a.teacher_user_id
    AND t.staff_identity_reviewed=true AND lower(btrim(t.class_name))=lower(btrim(a.class_name))
    AND lower(btrim(t.section))=lower(btrim(a.section)) AND lower(btrim(t.subject))=lower(btrim(a.subject)))
 ) FROM active_cohorts s ORDER BY s.class,s.section;
ROLLBACK;
