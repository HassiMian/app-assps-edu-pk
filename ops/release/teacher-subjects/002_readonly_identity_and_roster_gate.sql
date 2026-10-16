-- Read only live preflight. No student, teacher or score mutations.
BEGIN TRANSACTION READ ONLY;
SELECT 'ACTIVE_STUDENT_USERS' AS metric,COUNT(*)::bigint AS value
 FROM users WHERE school_id=1 AND role='student' AND is_active=true
UNION ALL
SELECT 'DIRECT_STUDENT_ID_BINDINGS',COUNT(*) FROM users u JOIN students s
 ON s.school_id=u.school_id AND s.id=u.entity_id
 WHERE u.school_id=1 AND u.role='student' AND u.is_active AND s.is_active
UNION ALL
SELECT 'ACTIVE_STUDENT_USERS_WITHOUT_ENTITY_LINK',COUNT(*) FROM users
 WHERE school_id=1 AND role='student' AND is_active=true AND entity_id IS NULL
UNION ALL
SELECT 'USERNAME_AND_GR_EXACT_PAIRS_NOT_BINDINGS',COUNT(*) FROM users u JOIN students s
 ON LOWER(BTRIM(u.username))=LOWER(BTRIM(s.gr_number)) AND u.school_id=s.school_id
 WHERE u.school_id=1 AND u.role='student' AND u.is_active AND s.is_active AND u.entity_id IS NULL
UNION ALL
SELECT 'AUTHORITATIVE_TEACHER_SUBJECT_GRANTS',COUNT(*) FROM teacher_class_assignments
 WHERE school_id=1 AND is_active=true
UNION ALL
SELECT 'OBSERVED_SUBJECT_PERIOD_REFERENCE_ROWS',COUNT(*) FROM timetable
 WHERE school_id=1 AND class_name<>'School-wide'
UNION ALL
SELECT 'STAFF_LOGIN_LINKS_ACTIVE',COUNT(*) FROM employees e JOIN users u ON
 u.school_id=e.school_id AND u.id=e.user_id AND u.is_active AND u.role='teacher'
 WHERE e.school_id=1 AND e.is_active
UNION ALL
SELECT 'ENROLLED_CLASS_SECTION_GROUPS',COUNT(*) FROM
 (SELECT class,section FROM students WHERE school_id=1 AND is_active GROUP BY class,section) v;
COMMIT;
