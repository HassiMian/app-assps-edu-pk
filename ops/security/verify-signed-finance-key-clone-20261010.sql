\set ON_ERROR_STOP on
BEGIN;
DO $guard$ BEGIN
 IF current_database() <> 'assps_core_signed_p7_20261008' OR current_setting('port') <> '55432' OR session_user <> 'postgres' THEN
 RAISE EXCEPTION 'DISPOSABLE_SIGNED_CLONE_ONLY'; END IF;
END $guard$;
-- Privileged disposable fixture creates a signature; never exports the secret or connects to production.
\o /dev/null
WITH fixture AS (
 SELECT '900001'::text AS tenant,'synthetic-core-a'::text AS tenant_key,'999001'::text AS actor,
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
DO $allow$
DECLARE good boolean; other boolean;
BEGIN
 SELECT core_security.signed_tenant_key_allowed('synthetic-core-a'),core_security.signed_tenant_key_allowed('synthetic-core-b') INTO good,other;
 IF good IS DISTINCT FROM TRUE OR other IS DISTINCT FROM FALSE THEN RAISE EXCEPTION 'SIGNED_FINANCE_TENANT_KEY_INVALID allowed=% foreign=%',good,other; END IF;
 RAISE NOTICE 'SIGNED_FINANCE_KEY_ALLOW_DENY_PASS allowed=% foreign=%',good,other;
END $allow$;
\o /dev/null
SELECT set_config('app.tenant_key','synthetic-core-b',true);
\o
DO $tamper$
DECLARE forged boolean; original_school boolean;
BEGIN
 SELECT core_security.signed_tenant_key_allowed('synthetic-core-b'),core_security.signed_school_allowed(900001) INTO forged,original_school;
 IF forged IS DISTINCT FROM FALSE OR original_school IS DISTINCT FROM FALSE THEN RAISE EXCEPTION 'SIGNED_FINANCE_KEY_TAMPER_EXPOSURE foreign=% school=%',forged,original_school; END IF;
 RAISE NOTICE 'SIGNED_FINANCE_KEY_TAMPER_DENIED_PASS foreign=% school=%',forged,original_school;
END $tamper$;
ROLLBACK;
