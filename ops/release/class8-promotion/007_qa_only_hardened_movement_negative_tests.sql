-- QA ONLY. Use actual temporary student UPDATE statements inside savepoints.
-- Each bypass attempt MUST be rejected by PostgreSQL CHECK VIOLATION.
DO $qa$
DECLARE sid integer;
DECLARE message text;
BEGIN
 IF current_database()<>'assps_timetable_9staff_qa_20261014'
 OR current_setting('port')<>'55432'
 THEN RAISE EXCEPTION 'QA_DATABASE_NAME_OR_PORT_MISMATCH'; END IF;
 SELECT id INTO sid FROM students WHERE school_id=1
  AND class='Eight' AND section='Blue' AND is_active ORDER BY id LIMIT 1;
 IF sid IS NULL THEN RAISE EXCEPTION 'QA_ROSTER_MISSING'; END IF;
 -- 1. Section laundering: class stays Eight, section changes.
 BEGIN
  UPDATE students SET section='Purple' WHERE school_id=1 AND id=sid;
  RAISE EXCEPTION 'SECTION_LAUNDERING_ACCEPTED';
 EXCEPTION WHEN check_violation THEN
  GET STACKED DIAGNOSTICS message=MESSAGE_TEXT;
  IF message<>'CLASS_EIGHT_PROMOTION_AWAITS_PRINT_APPROVAL'
   THEN RAISE EXCEPTION 'WRONG_SECTION_DENIAL %',message; END IF;
 END;
 -- 2. Arbitrary alternate class.
 BEGIN
  UPDATE students SET class='Mover' WHERE school_id=1 AND id=sid;
  RAISE EXCEPTION 'ALTERNATE_CLASS_BYPASS_ACCEPTED';
 EXCEPTION WHEN check_violation THEN
  GET STACKED DIAGNOSTICS message=MESSAGE_TEXT;
  IF message<>'CLASS_EIGHT_PROMOTION_AWAITS_PRINT_APPROVAL'
   THEN RAISE EXCEPTION 'WRONG_CLASS_DENIAL %',message; END IF;
 END;
 -- 3. Direct Nine.
 BEGIN
  UPDATE students SET class='Nine' WHERE school_id=1 AND id=sid;
  RAISE EXCEPTION 'DIRECT_GRADE9_BYPASS_ACCEPTED';
 EXCEPTION WHEN check_violation THEN
  GET STACKED DIAGNOSTICS message=MESSAGE_TEXT;
  IF message<>'CLASS_EIGHT_PROMOTION_AWAITS_PRINT_APPROVAL'
   THEN RAISE EXCEPTION 'WRONG_NINE_DENIAL %',message; END IF;
 END;
 -- 4. Target Pre-Nine with no print record.
 BEGIN
  UPDATE students SET class='Pre-Nine' WHERE school_id=1 AND id=sid;
  RAISE EXCEPTION 'PRENINE_BYPASS_ACCEPTED';
 EXCEPTION WHEN check_violation THEN
  GET STACKED DIAGNOSTICS message=MESSAGE_TEXT;
  IF message<>'CLASS_EIGHT_PROMOTION_AWAITS_PRINT_APPROVAL'
   THEN RAISE EXCEPTION 'WRONG_PRENINE_DENIAL %',message; END IF;
 END;
 -- 5. Cross-school direct move.
 BEGIN
  UPDATE students SET school_id=2, class='Pre-Nine'
   WHERE school_id=1 AND id=sid;
  RAISE EXCEPTION 'OTHER_SCHOOL_BYPASS_ACCEPTED';
 EXCEPTION WHEN check_violation THEN
  GET STACKED DIAGNOSTICS message=MESSAGE_TEXT;
  IF message<>'CLASS_EIGHT_SCHOOL_SCOPE_CANNOT_CHANGE'
   THEN RAISE EXCEPTION 'WRONG_SCHOOL_DENIAL %',message; END IF;
 END;
 -- 6. Harmless no-op same source class and section must still work.
 UPDATE students SET class=class,section=section WHERE school_id=1 AND id=sid;
 IF (SELECT count(*) FROM students WHERE school_id=1
     AND class='Eight' AND section='Blue' AND is_active)<>11
 OR (SELECT count(*) FROM students WHERE school_id=1 AND class='Pre-Nine')<>0
 THEN RAISE EXCEPTION 'NEGATIVE_TEST_CHANGED_LIVE_CLONE_ROSTER'; END IF;
 RAISE NOTICE 'PASS_5_DENIED_BY_DB_AND_1_SAFE_NOOP';
END $qa$;
BEGIN;
DO $qa_not_fake_ready$
DECLARE sid integer;
DECLARE message text;
BEGIN
 IF current_database()<>'assps_timetable_9staff_qa_20261014'
 THEN RAISE EXCEPTION 'DISPOSABLE_QA_ONLY'; END IF;
 SELECT id INTO sid FROM students WHERE school_id=1
  AND class='Eight' AND section='Blue' AND is_active ORDER BY id LIMIT 1;
 -- SYNTHETIC QA fixture, never production approval:
 UPDATE school_class_promotion_plans
 SET status='READY_FOR_APPROVED_PROMOTION',print_verified_at=clock_timestamp(),
   print_verified_by_user_id=1,result_snapshot_sha256=repeat('a',64),
   academic_approved_at=clock_timestamp(),academic_approved_by_user_id=1,
   destination_section='Blue'
 WHERE school_id=1 AND exam_id=9 AND source_class='Eight';
 BEGIN
  UPDATE students SET class='Pre-Nine',section='Blue' WHERE id=sid AND school_id=1;
  RAISE EXCEPTION 'UNAPPROVED_MAXIMA_ALLOWED_MOVEMENT';
 EXCEPTION WHEN check_violation THEN
  GET STACKED DIAGNOSTICS message=MESSAGE_TEXT;
  IF message<>'CLASS_EIGHT_PAPER_MAXIMA_NOT_FULLY_APPROVED'
  THEN RAISE EXCEPTION 'WRONG_MAXIMA_DENIAL %',message; END IF;
 END;
 RAISE NOTICE 'PASS_SYNTHETIC_READY_STILL_DENIED_WITHOUT_PAPER_APPROVAL';
END $qa_not_fake_ready$;
ROLLBACK;
