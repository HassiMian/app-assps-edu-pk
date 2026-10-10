\set ON_ERROR_STOP on
BEGIN;
DO $guard$ BEGIN
 IF current_database() <> 'assps_core_signed_p7_20261008' OR current_setting('port') <> '55432' OR session_user <> 'postgres' THEN
 RAISE EXCEPTION 'DISPOSABLE_SIGNED_CLONE_ONLY'; END IF;
END $guard$;
-- Privileged disposable fixture creates a signature; never exports the secret or connects to production.
\o /dev/null
WITH fixture AS (
 SELECT '900001'::text AS tenant,''::text AS tenant_key,'999001'::text AS actor,
 (extract(epoch from clock_timestamp())::bigint + 60)::text AS expiry,
 '0123456789abcdef0123456789abcdef'::text AS nonce,
 txid_current()::text AS transaction_id,
 (SELECT secret FROM core_security.signing_key WHERE singleton) AS secret
), signature AS (
 SELECT *, encode(public.hmac(convert_to(tenant||'|'||tenant_key||'|assps_core_test_login|'||actor||'|'||expiry||'|'||nonce||'|'||transaction_id,'UTF8'),convert_to(secret,'UTF8'),'sha256'),'hex') AS sig FROM fixture
)
SELECT set_config('app.rls_enabled','true',true),set_config('app.is_super_admin','false',true),
 set_config('app.tenant_id',tenant,true),set_config('app.tenant_key',tenant_key,true),
 set_config('app.core_actor_id',actor,true),set_config('app.core_sig_exp',expiry,true),
 set_config('app.core_sig_nonce',nonce,true),set_config('app.core_sig',sig,true)
FROM signature;
\o
SET LOCAL SESSION AUTHORIZATION assps_core_test_login;
SET LOCAL ROLE apex_app_runtime;
DO $check$
DECLARE a int; b int;
BEGIN
 SELECT count(*) INTO a FROM public.students WHERE gr_number='CORE-RLS-SYN-A';
 SELECT count(*) INTO b FROM public.students WHERE gr_number='CORE-RLS-SYN-B';
 IF a<>1 OR b<>0 THEN RAISE EXCEPTION 'SIGNED_ACCESS_FAILURE school_a=% school_b=%',a,b; END IF;
 RAISE NOTICE 'SIGNED_DB_FIXTURE_POSITIVE_PASS allowed_a=% denied_b=%',a,b;
END $check$;
-- Signed non-superadmin actor cannot flip a mutable session GUC to bypass RLS.
\o /dev/null
SELECT set_config('app.is_super_admin','true',true);
\o
DO $check$
DECLARE a integer; b integer;
BEGIN
 SELECT count(*) INTO a FROM public.students WHERE gr_number='CORE-RLS-SYN-A';
 SELECT count(*) INTO b FROM public.students WHERE gr_number='CORE-RLS-SYN-B';
 IF a<>0 OR b<>0 THEN RAISE EXCEPTION 'SIGNED_SUPERADMIN_SPOOF_EXPOSURE:a=% b=%',a,b; END IF;
 RAISE NOTICE 'SIGNED_SUPERADMIN_SPOOF_DENIED_PASS a=% b=%',a,b;
END $check$;
ROLLBACK;
