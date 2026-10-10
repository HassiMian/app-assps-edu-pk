\set ON_ERROR_STOP on
BEGIN;
DO $guard$
BEGIN
 IF current_database() <> 'assps_core_signed_p7_20261008'
   OR current_setting('port') <> '55432'
   OR session_user <> 'postgres'
   OR (SELECT COUNT(*) FROM pg_roles WHERE rolname='assps_core_test_login' AND rolcanlogin AND NOT rolbypassrls)<>1
 THEN RAISE EXCEPTION 'DISPOSABLE_SIGNED_MARKS_CLONE_ONLY'; END IF;
 IF (SELECT COUNT(*) FROM students WHERE school_id=900001 AND gr_number='CORE-RLS-SYN-A')<>1
   OR (SELECT COUNT(*) FROM students WHERE school_id=900002 AND gr_number='CORE-RLS-SYN-B')<>1
 THEN RAISE EXCEPTION 'MISSING_SYNTHETIC_STUDENTS'; END IF;
END $guard$;
GRANT SELECT, UPDATE ON exams, exam_results, students, teacher_class_assignments TO apex_app_runtime;
INSERT INTO exams(school_id,name,type,class,session,total_marks,pass_marks)
 VALUES(900001,'CORE-RLS-MARKS-A','TE','One','2026-2027',100,33),
       (900002,'CORE-RLS-MARKS-B','TE','One','2026-2027',100,33);
INSERT INTO exam_results(school_id,exam_id,student_id,subject,marks_obtained,total_marks)
 SELECT e.school_id,e.id,s.id,'English',67,100
 FROM exams e JOIN students s ON s.school_id=e.school_id
 WHERE (e.name='CORE-RLS-MARKS-A' AND s.gr_number='CORE-RLS-SYN-A')
 OR (e.name='CORE-RLS-MARKS-B' AND s.gr_number='CORE-RLS-SYN-B');
DO $guard$ BEGIN
 IF (SELECT COUNT(*) FROM exam_results WHERE subject='English' AND marks_obtained=67 AND exam_id IN (SELECT id FROM exams WHERE name IN ('CORE-RLS-MARKS-A','CORE-RLS-MARKS-B')))<>2
 THEN RAISE EXCEPTION 'FIXTURE_CREATE_MISMATCH'; END IF;
END $guard$;
\o /dev/null
WITH fixture AS (
 SELECT '900001'::text tenant,''::text tenant_key,'999001'::text actor,
 (extract(epoch from clock_timestamp())::bigint+60)::text expiry,
 '0123456789abcdef0123456789abcdef'::text nonce,
 txid_current()::text transaction_id,
 (SELECT secret FROM core_security.signing_key WHERE singleton) secret
), sig AS (
 SELECT *,
 encode(public.hmac(convert_to(tenant||'|'||tenant_key||'|assps_core_test_login|'||actor||'|'||expiry||'|'||nonce||'|'||transaction_id,'UTF8'),convert_to(secret,'UTF8'),'sha256'),'hex') s
 FROM fixture
)
SELECT set_config('app.rls_enabled','true',true),
set_config('app.is_super_admin','false',true),
set_config('app.tenant_id',tenant,true),
set_config('app.tenant_key',tenant_key,true),
set_config('app.core_actor_id',actor,true),
set_config('app.core_sig_exp',expiry,true),
set_config('app.core_sig_nonce',nonce,true),
set_config('app.core_sig',s,true) FROM sig;
\o
SET LOCAL SESSION AUTHORIZATION assps_core_test_login;
SET LOCAL ROLE apex_app_runtime;
DO $assert$
DECLARE own_exams int; foreign_exams int; own_marks int; foreign_marks int;
BEGIN
 SELECT COUNT(*) INTO own_exams FROM exams WHERE name='CORE-RLS-MARKS-A';
 SELECT COUNT(*) INTO foreign_exams FROM exams WHERE name='CORE-RLS-MARKS-B';
 SELECT COUNT(*) INTO own_marks FROM exam_results WHERE subject='English' AND exam_id IN (SELECT id FROM exams WHERE name='CORE-RLS-MARKS-A');
 SELECT COUNT(*) INTO foreign_marks FROM exam_results WHERE subject='English' AND exam_id IN (SELECT id FROM exams WHERE name='CORE-RLS-MARKS-B');
 IF own_exams<>1 OR foreign_exams<>0 OR own_marks<>1 OR foreign_marks<>0 THEN
 RAISE EXCEPTION 'SIGNED_MARKS_READ_ISOLATION_FAILED exams=%/% results=%/%',
 own_exams,foreign_exams,own_marks,foreign_marks; END IF;
 RAISE NOTICE 'SIGNED_MARKS_REAL_PG_READ_SCOPE_PASS own_exam=1 other_exam=0 own_marks=1 other_marks=0';
END $assert$;
DO $write$
DECLARE touched int; own int;
BEGIN
 UPDATE exam_results SET marks_obtained=68
 WHERE school_id=900001 AND exam_id IN (SELECT id FROM exams WHERE name='CORE-RLS-MARKS-A');
 GET DIAGNOSTICS own=ROW_COUNT;
 IF own<>1 THEN RAISE EXCEPTION 'SIGNED_MARKS_OWN_SCHOOL_UPDATE_FAILED:%',own; END IF;
 RAISE NOTICE 'SIGNED_MARKS_REAL_PG_OWN_UPDATE_PASS rows=1';
 UPDATE exam_results SET marks_obtained=99 WHERE school_id=900002;
 GET DIAGNOSTICS touched=ROW_COUNT;
 IF touched<>0 THEN RAISE EXCEPTION 'SIGNED_MARKS_CROSS_TENANT_UPDATE_EXPOSED:%',touched; END IF;
 RAISE NOTICE 'SIGNED_MARKS_REAL_PG_FOREIGN_UPDATE_DENIED_PASS rows=0';
END $write$;
SELECT set_config('app.tenant_id','900002',true);
DO $spoof$
DECLARE foreign_seen int;
BEGIN
 SELECT COUNT(*) INTO foreign_seen FROM exams WHERE name='CORE-RLS-MARKS-B';
 IF foreign_seen<>0 THEN RAISE EXCEPTION 'SIGNED_MARKS_TENANT_GUC_SPOOF_EXPOSED'; END IF;
 RAISE NOTICE 'SIGNED_MARKS_REAL_PG_TENANT_SPOOF_DENIED_PASS';
END $spoof$;
ROLLBACK;
