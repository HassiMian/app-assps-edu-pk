\set ON_ERROR_STOP on
-- Synthetic RLS and real-route HTTP fixtures ONLY on the isolated PostgreSQL cluster.
DO $$ BEGIN
 IF current_database() <> 'assps_core_rls_clone_20261008'
 OR (SELECT current_setting('port')::int) <> 55432 THEN
   RAISE EXCEPTION 'Refuse Phase 6 fixtures outside localhost isolated 55432 clone';
 END IF;
END $$;
GRANT SELECT ON public.settings TO apex_app_runtime;
INSERT INTO settings(school_id,school_name,school_access)
 SELECT 900001,'Synthetic campus A','[{"active":true,"adminEmail":"phase6-branch-a@example.invalid","schoolName":"Synthetic campus A","schoolCode":"SECURITY-CLONE-A"}]'::jsonb
 WHERE NOT EXISTS (SELECT 1 FROM settings WHERE school_id=900001);
INSERT INTO settings(school_id,school_name,school_access)
 SELECT 900002,'Synthetic campus B','[{"active":true,"adminEmail":"phase6-branch-b@example.invalid","schoolName":"Synthetic campus B","schoolCode":"SECURITY-CLONE-B"}]'::jsonb
 WHERE NOT EXISTS (SELECT 1 FROM settings WHERE school_id=900002);
GRANT SELECT,INSERT,UPDATE,DELETE ON
 public.teacher_class_assignments,public.assessment_papers,
 public.assessment_releases,public.assessment_result_records,
 public.assessment_result_revisions
 TO apex_app_runtime;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO apex_app_runtime;
UPDATE schools SET tenant_id='synthetic-core-a' WHERE id=900001;
UPDATE schools SET tenant_id='synthetic-core-b' WHERE id=900002;
UPDATE users SET tenant_id='synthetic-core-a'
 WHERE school_id=900001 AND email LIKE 'core-%@example.invalid';
UPDATE users SET tenant_id='synthetic-core-b'
 WHERE school_id=900002 AND email LIKE 'core-%@example.invalid';
INSERT INTO users(school_id,name,email,password,role)
  VALUES (900001,'Synthetic Unassigned Teacher','core-unassigned@example.invalid','no-login','teacher'),
         (900001,'Synthetic School Administrator','core-admin@example.invalid','no-login','admin'),
         (900001,'Synthetic Student Role','core-student@example.invalid','no-login','student')
  ON CONFLICT (email) DO NOTHING;
INSERT INTO teacher_class_assignments(school_id,teacher_user_id,class_name,section,subject,source,is_active)
 SELECT 900001,u.id,'Seven','A','Science','phase6-synthetic',true
 FROM users u WHERE u.email='core-security-a@example.invalid'
   AND NOT EXISTS(SELECT 1 FROM teacher_class_assignments a WHERE a.school_id=900001 AND a.teacher_user_id=u.id AND a.class_name='Seven' AND a.subject='Science');
INSERT INTO assessment_papers(school_id,public_id,title,status,current_revision)
 SELECT s.id,'CORE-P6-PAPER-'||s.id,'Synthetic Grade Seven Science','FINALIZED',1
 FROM schools s WHERE s.id IN (900001,900002)
 AND NOT EXISTS (SELECT 1 FROM assessment_papers p WHERE p.school_id=s.id AND p.public_id='CORE-P6-PAPER-'||s.id);
INSERT INTO assessment_releases(school_id,paper_id,release_id,revision_number,content_hash,renderer_version,snapshot_json)
 SELECT p.school_id,p.id,'CORE-P6-RELEASE-'||p.school_id,1,
   repeat('a',64),'phase6-synthetic',
   '{"metadata":{"className":"Seven","section":"A","subject":"Science"},"sections":[{"id":"q1","authoritativeSectionTotal":10}]}'::jsonb
 FROM assessment_papers p WHERE p.public_id IN ('CORE-P6-PAPER-900001','CORE-P6-PAPER-900002')
 AND NOT EXISTS (SELECT 1 FROM assessment_releases r WHERE r.school_id=p.school_id AND r.release_id='CORE-P6-RELEASE-'||p.school_id);
INSERT INTO assessment_result_records(school_id,result_id,release_id,student_key,current_revision,status)
 VALUES
 (900001,'CORE-P6-RESULT-A','CORE-P6-RELEASE-900001','synthetic-student-a',1,'IN_PROGRESS'),
 (900002,'CORE-P6-RESULT-B','CORE-P6-RELEASE-900002','synthetic-student-b',1,'IN_PROGRESS') ON CONFLICT (school_id,release_id,student_key) DO NOTHING;
INSERT INTO assessment_result_revisions(school_id,result_record_id,revision_number,entries_json,obtained_marks,maximum_marks)
 SELECT r.school_id,r.id,1,'[{"questionInstanceId":"q1","state":"SCORED","score":7}]'::jsonb,7,10
 FROM assessment_result_records r
 WHERE r.result_id IN ('CORE-P6-RESULT-A','CORE-P6-RESULT-B')
   AND NOT EXISTS(SELECT 1 FROM assessment_result_revisions v WHERE v.result_record_id=r.id AND v.revision_number=1);
SELECT 'PHASE6_FIXTURE',
 (SELECT count(*) FROM assessment_result_records WHERE result_id LIKE 'CORE-P6-RESULT-%'),
 (SELECT count(*) FROM users WHERE email LIKE 'core-%@example.invalid'),
 (SELECT count(*) FROM teacher_class_assignments WHERE source='phase6-synthetic');
