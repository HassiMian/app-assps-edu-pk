-- Read-only transaction-local signed-role SQL acceptance; restored-production CLONE ONLY.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$
BEGIN
 IF current_database()<>'assps_backup_restore_check_20261011' OR current_setting('port')<>'55432' OR session_user<>'postgres' THEN
   RAISE EXCEPTION 'Isolated accept test target mismatch';
 END IF;
END $guard$;
\pset tuples_only on
\o /dev/null
SELECT id AS school_scope FROM public.schools ORDER BY id LIMIT 1 \gset
SELECT set_config('app.tenant_id', :'school_scope', true);
SELECT set_config('app.tenant_key', 'assps_disposable_test_scope',true);
SELECT set_config('app.core_actor_id','999998',true);
SELECT set_config('app.rls_enabled','true',true);
SELECT set_config('app.is_super_admin','false',true);
SELECT set_config('app.core_sig_exp',extract(epoch from clock_timestamp() + interval '90 seconds')::bigint::text,true);
SELECT set_config('app.core_sig_nonce','abcdef1234567890abcdef1234567890',true);
SELECT set_config('app.core_sig', encode(public.hmac(convert_to(
  current_setting('app.tenant_id')||'|'||current_setting('app.tenant_key')||'|'||session_user||'|'||
  current_setting('app.core_actor_id')||'|'||current_setting('app.core_sig_exp')||'|'||
  current_setting('app.core_sig_nonce')||'|'||txid_current()::text,'UTF8'),
  convert_to((SELECT secret FROM core_security.signing_key WHERE singleton),'UTF8'),'sha256'),'hex'),true);
SET ROLE assps_marks_signed_runtime;
DO $check$
DECLARE allowed bigint; denied bigint;
BEGIN
 IF NOT core_security.signed_school_allowed(current_setting('app.tenant_id')::int) THEN RAISE EXCEPTION 'Valid signed scope rejected'; END IF;
 SELECT count(*) INTO allowed FROM public.schools WHERE id=current_setting('app.tenant_id')::int;
 IF allowed<>1 THEN RAISE EXCEPTION 'Expected school row not accessible'; END IF;
 SELECT count(*) INTO denied FROM public.schools WHERE id<>current_setting('app.tenant_id')::int;
 IF denied<>0 THEN RAISE EXCEPTION 'Cross-school row escaped'; END IF;
END $check$;
\o
\echo SIGNED_RESTORED_PRODUCTION_CLONE_TENANT_POSITIVE_AND_CROSS_SCHOOL_DENIAL_PASS
-- Invalidated in SAME transaction: forged user-controlled tenant claim must NOT grant access.
SELECT set_config('app.tenant_id','987654321',true);
DO $spoof$
DECLARE denied bigint;
BEGIN
 IF core_security.signed_school_allowed(current_setting('app.tenant_id')::int) THEN RAISE EXCEPTION 'Forged tenant scope accepted'; END IF;
 SELECT count(*) INTO denied FROM public.schools;
 IF denied<>0 THEN RAISE EXCEPTION 'Spoofed signed context yielded rows'; END IF;
END $spoof$;
\echo SIGNED_RESTORED_PRODUCTION_CLONE_SPOOF_DENIAL_PASS
ROLLBACK;
