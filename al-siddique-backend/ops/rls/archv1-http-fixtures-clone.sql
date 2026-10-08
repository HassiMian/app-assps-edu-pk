-- Disposable clone only: authenticated HTTP fixtures, NEVER production.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$
BEGIN
 IF current_database() !~ '^assps_archv1_rls_' OR current_user<>'postgres' THEN
  RAISE EXCEPTION 'HTTP fixture must only run on an isolated RLS clone';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='asspsworker' AND NOT rolbypassrls) THEN
  RAISE EXCEPTION 'Expected local non-bypass test principal missing';
 END IF;
END $guard$;
-- In the production app authentication uses its existing login pool. This
-- clone-only policy emulates that bootstrap on the restricted OS test account.
GRANT SELECT ON public.users,public.schools TO asspsworker;
DROP POLICY IF EXISTS archv1_clone_bootstrap_users ON public.users;
DROP POLICY IF EXISTS archv1_clone_bootstrap_schools ON public.schools;
CREATE POLICY archv1_clone_bootstrap_users ON public.users FOR SELECT TO asspsworker USING (true);
CREATE POLICY archv1_clone_bootstrap_schools ON public.schools FOR SELECT TO asspsworker USING (true);
INSERT INTO users(school_id,tenant_id,name,email,role,password,is_active)
SELECT s.id,s.tenant_id,v.name,v.email,v.role,'CLONE_ONLY_NO_PASSWORD_LOGIN',true
FROM (VALUES
 (1,'ARCHV1 Clone Teacher A','archv1-teacher-a@invalid.example','teacher'),
 (1,'ARCHV1 Clone Teacher B','archv1-teacher-b@invalid.example','teacher'),
 (1,'ARCHV1 Clone Principal','archv1-principal@invalid.example','principal'),
 (5,'ARCHV1 Clone Teacher C','archv1-teacher-c@invalid.example','teacher')
) v(school_id,name,email,role)
JOIN schools s ON s.id=v.school_id
ON CONFLICT(email) DO NOTHING;
INSERT INTO teacher_class_assignments(school_id,teacher_user_id,class_name,section,subject,source,is_active)
SELECT u.school_id,u.id,'Seven','','Urdu','archv1_clone_only',true
FROM users u
WHERE u.email IN('archv1-teacher-a@invalid.example','archv1-teacher-c@invalid.example')
AND NOT EXISTS (SELECT 1 FROM teacher_class_assignments t
  WHERE t.school_id=u.school_id AND t.teacher_user_id=u.id
    AND t.class_name='Seven' AND COALESCE(t.subject,'')='Urdu' AND t.is_active=true);
COMMIT;
SELECT 'ARCHV1_CLONE_HTTP_FIXTURES_PASS' AS result,
 (SELECT count(*) FROM users WHERE email LIKE 'archv1-%@invalid.example') AS actors,
 (SELECT count(*) FROM teacher_class_assignments WHERE source='archv1_clone_only') AS assignments;
