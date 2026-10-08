\set ON_ERROR_STOP on
DO $$ BEGIN
 IF current_database() <> 'assps_core_rls_clone_20261008'
 OR (SELECT current_setting('port')::int) <> 55432 THEN
   RAISE EXCEPTION 'Refusing non-disposable Phase 6 attendance fixtures';
 END IF;
END $$;
GRANT SELECT ON public.attendance, public.fee_challans TO apex_app_runtime;
UPDATE students SET class='Seven',section='A' WHERE gr_number IN ('CORE-RLS-SYN-A','CORE-RLS-SYN-B')
  AND school_id IN (900001,900002);
INSERT INTO attendance(school_id,student_id,date,status)
 SELECT s.school_id,s.id,DATE '2026-10-08','present'
 FROM students s
 WHERE s.gr_number IN ('CORE-RLS-SYN-A','CORE-RLS-SYN-B')
 AND NOT EXISTS (SELECT 1 FROM attendance a WHERE a.school_id=s.school_id AND a.student_id=s.id AND a.date=DATE '2026-10-08');
SELECT 'PHASE6_ATTENDANCE_SYNTHETIC',count(*) FROM attendance WHERE school_id IN (900001,900002);
