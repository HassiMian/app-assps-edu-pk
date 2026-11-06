BEGIN READ ONLY;
WITH roster AS (
 SELECT s.class AS class_name,s.section,COUNT(*)::int AS active_students,
   CASE LOWER(BTRIM(s.class))
     WHEN 'starter' THEN 'starter' WHEN 'mover' THEN 'mover' WHEN 'flyer' THEN 'flyer'
     WHEN 'one' THEN '1' WHEN 'two' THEN '2' WHEN 'three' THEN '3' END AS config_class
 FROM students s WHERE s.school_id=1 AND s.is_active=true
 AND LOWER(BTRIM(s.class)) IN ('starter','mover','flyer','one','two','three')
 GROUP BY s.class,s.section
), config AS (
 SELECT jsonb_array_elements(settings.academic_setup::jsonb->'subjects') AS subject
 FROM settings WHERE school_id=1
)
SELECT 'REVIEW|'||r.class_name||'|'||r.section||'|'||r.active_students||'|'||(c.subject->>'name')
 FROM roster r JOIN config c ON (c.subject->'classes') ? r.config_class
 ORDER BY r.class_name,r.section,c.subject->>'name';
ROLLBACK;
