-- Assert DB trigger rejects real UPDATE statements inside QA-only exception subtransactions.
DO $test$
DECLARE sid integer;
DECLARE errmsg text;
BEGIN
 IF current_database()<>'assps_timetable_9staff_qa_20261014'
 OR current_setting('port')<>'55432'
 THEN RAISE EXCEPTION 'REAL_UPDATE_NEGATIVE_TEST_ONLY_QA'; END IF;
 SELECT id INTO sid FROM students
  WHERE school_id=1 AND class='Eight' AND section='Blue' AND is_active
  ORDER BY id LIMIT 1;
 IF sid IS NULL THEN RAISE EXCEPTION 'QA_ROSTER_MISSING'; END IF;
 BEGIN
  UPDATE students SET class='Pre-Nine' WHERE id=sid AND school_id=1;
  RAISE EXCEPTION 'PRENINE_GUARD_MISSING';
 EXCEPTION WHEN check_violation THEN
  GET STACKED DIAGNOSTICS errmsg=MESSAGE_TEXT;
  IF errmsg<>'CLASS_EIGHT_PRE_NINE_WAIT_FOR_PRINT_AND_ACADEMIC_REVIEW'
    THEN RAISE EXCEPTION 'UNEXPECTED_PRENINE_DENIAL %',errmsg; END IF;
 END;
 BEGIN
  UPDATE students SET class='Nine' WHERE id=sid AND school_id=1;
  RAISE EXCEPTION 'NINE_GUARD_MISSING';
 EXCEPTION WHEN check_violation THEN
  GET STACKED DIAGNOSTICS errmsg=MESSAGE_TEXT;
  IF errmsg<>'CLASS_EIGHT_DIRECT_TO_NINE_NOT_ALLOWED_USE_PRE_NINE'
    THEN RAISE EXCEPTION 'UNEXPECTED_NINE_DENIAL %',errmsg; END IF;
 END;
 BEGIN
  UPDATE students SET school_id=2,class='Pre-Nine' WHERE id=sid AND school_id=1;
  RAISE EXCEPTION 'TENANT_GUARD_MISSING';
 EXCEPTION WHEN check_violation THEN
  GET STACKED DIAGNOSTICS errmsg=MESSAGE_TEXT;
  IF errmsg<>'CLASS_EIGHT_SCHOOL_SCOPE_CANNOT_CHANGE'
    THEN RAISE EXCEPTION 'UNEXPECTED_TENANT_DENIAL %',errmsg; END IF;
 END;
 IF (SELECT count(*) FROM students WHERE school_id=1 AND class='Eight'
     AND section='Blue' AND is_active)<>11
 OR (SELECT count(*) FROM students WHERE school_id=1 AND class='Pre-Nine')<>0
 THEN RAISE EXCEPTION 'QA_NEGATIVE_TEST_MUTATED_ROSTER'; END IF;
 RAISE NOTICE 'THREE_CLASS_PROMOTION_NEGATIVE_TESTS_PASS';
END $test$;
