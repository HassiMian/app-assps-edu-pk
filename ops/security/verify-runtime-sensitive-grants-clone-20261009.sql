\set ON_ERROR_STOP on
BEGIN READ ONLY;
DO $check$
DECLARE t text; n integer:=0;
BEGIN
 IF current_database()<>'assps_core_rls_clone_20261008' THEN RAISE EXCEPTION 'CLONE_ONLY_REFUSAL:%',current_database(); END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='apex_app_runtime' AND NOT rolsuper AND NOT rolbypassrls) THEN RAISE EXCEPTION 'UNSAFE_RUNTIME_ROLE'; END IF;
 FOREACH t IN ARRAY ARRAY['attendance','fee_challans','fee_payment_transactions','student_fee_profiles','lesson_plans','paper_documents','paper_revisions','saved_papers','assessment_papers'] LOOP
  IF to_regclass(format('public.%I',t)) IS NULL THEN RAISE EXCEPTION 'MISSING_SENSITIVE_TABLE:%',t; END IF;
  IF has_table_privilege('apex_app_runtime', format('public.%I',t),'SELECT') OR has_table_privilege('apex_app_runtime', format('public.%I',t),'INSERT') OR has_table_privilege('apex_app_runtime', format('public.%I',t),'UPDATE') OR has_table_privilege('apex_app_runtime', format('public.%I',t),'DELETE') THEN RAISE EXCEPTION 'SENSITIVE_TABLE_GRANT_CHANGED:%',t; END IF;
  n:=n+1;
 END LOOP;
 RAISE NOTICE 'SENSITIVE_RUNTIME_NO_GRANT_CLONE_PASS count=%',n;
END $check$;
SET LOCAL ROLE apex_app_runtime;
DO $check$
DECLARE t text; denied integer:=0;
BEGIN
 FOREACH t IN ARRAY ARRAY['attendance','fee_challans','fee_payment_transactions','student_fee_profiles','lesson_plans','paper_documents','paper_revisions','saved_papers','assessment_papers'] LOOP
  BEGIN
   EXECUTE format('SELECT 1 FROM public.%I LIMIT 1',t);
   RAISE EXCEPTION 'UNEXPECTED_READ_ACCESS:%',t;
  EXCEPTION WHEN insufficient_privilege THEN denied:=denied+1;
  END;
 END LOOP;
 IF denied<>9 THEN RAISE EXCEPTION 'DENIAL_COUNT_INVALID:%',denied; END IF;
 RAISE NOTICE 'EFFECTIVE_RUNTIME_SENSITIVE_READ_DENIED_PASS count=%',denied;
END $check$;
ROLLBACK;
