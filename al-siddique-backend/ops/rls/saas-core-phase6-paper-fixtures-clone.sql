\set ON_ERROR_STOP on
DO $$ BEGIN
 IF current_database() <> 'assps_core_rls_clone_20261008'
 OR (SELECT current_setting('port')::int) <> 55432 THEN RAISE EXCEPTION 'Refuse non-disposable paper fixtures'; END IF;
END $$;
GRANT SELECT ON public.paper_vault TO apex_app_runtime;
INSERT INTO paper_vault(school_id,owner_user_id,name,class_name,section,subject_name,status,revision,payload)
SELECT u.school_id,u.id,'P6 Synthetic Paper '||u.school_id,'Seven','A','Science','draft',1,
       '{"config":{"className":"Seven","section":"A","subject":"Science"},"sections":[]}'::jsonb
FROM users u
WHERE u.email IN ('core-security-a@example.invalid','core-security-b@example.invalid')
AND NOT EXISTS(SELECT 1 FROM paper_vault p WHERE p.school_id=u.school_id AND p.owner_user_id=u.id AND p.name='P6 Synthetic Paper '||u.school_id);
SELECT 'SYNTHETIC_PAPERS',COUNT(*) FROM paper_vault WHERE name LIKE 'P6 Synthetic Paper%';
