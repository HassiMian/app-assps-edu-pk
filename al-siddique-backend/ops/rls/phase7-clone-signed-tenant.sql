-- Disposable-clone ONLY: signed runtime tenant barrier for general SaaS roles.
-- Uses real non-BYPASS login, per-transaction expiry/nonce, HMAC secret held
-- by protected DB security schema. The trusted application must sign only
-- after validated JWT + user/school identity. NOT A PRODUCTION MIGRATION.
\set ON_ERROR_STOP on
\if :{?CORE_SIGNING_KEY}
\else
\echo 'Required clone-only CORE_SIGNING_KEY absent'
\quit 3
\endif
BEGIN;
DO $guard$
BEGIN
 IF current_database() <> 'assps_core_signed_p7_20261008'
   OR current_setting('port')::int <> 55432
   OR current_user <> 'postgres' THEN
   RAISE EXCEPTION 'Phase7 signing policy is REFUSED outside isolated clone';
 END IF;
END $guard$;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;
CREATE SCHEMA IF NOT EXISTS core_security AUTHORIZATION postgres;
REVOKE ALL ON SCHEMA core_security FROM PUBLIC;
CREATE TABLE IF NOT EXISTS core_security.signing_key (
 singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK(singleton),
 secret TEXT NOT NULL CHECK(length(secret)>=32)
);
REVOKE ALL ON core_security.signing_key FROM PUBLIC;
INSERT INTO core_security.signing_key (singleton,secret)
 VALUES(TRUE,:'CORE_SIGNING_KEY')
 ON CONFLICT(singleton) DO UPDATE SET secret=EXCLUDED.secret;

CREATE OR REPLACE FUNCTION core_security.valid_signed_context()
RETURNS BOOLEAN LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,core_security
AS $f$
DECLARE
 tenant TEXT:=current_setting('app.tenant_id',true);
 tenant_key TEXT:=current_setting('app.tenant_key',true);
 actor TEXT:=current_setting('app.core_actor_id',true);
 expiry TEXT:=current_setting('app.core_sig_exp',true);
 nonce TEXT:=current_setting('app.core_sig_nonce',true);
 signature TEXT:=current_setting('app.core_sig',true);
 secret_value TEXT;
 payload TEXT;
 now_epoch BIGINT:=extract(epoch from clock_timestamp())::BIGINT;
BEGIN
 IF current_setting('app.rls_enabled',true) IS DISTINCT FROM 'true'
    OR current_setting('app.is_super_admin',true) IS DISTINCT FROM 'false'
    OR tenant IS NULL OR tenant !~ '^[0-9]{1,12}$'
    OR tenant_key IS NULL OR length(tenant_key)>200
    OR actor IS NULL OR actor !~ '^[1-9][0-9]{0,11}$'
    OR expiry IS NULL OR expiry !~ '^[0-9]{10}$'
    OR nonce IS NULL OR nonce !~ '^[0-9a-f]{32}$'
    OR signature IS NULL OR signature !~ '^[0-9a-f]{64}$' THEN
     RETURN FALSE;
 END IF;
 IF expiry::BIGINT < now_epoch OR expiry::BIGINT > now_epoch+120 THEN RETURN FALSE; END IF;
 SELECT k.secret INTO secret_value FROM core_security.signing_key k WHERE k.singleton=TRUE;
 IF secret_value IS NULL THEN RETURN FALSE; END IF;
 payload:=tenant||'|'||tenant_key||'|'||session_user||'|'||actor||'|'||expiry||'|'||nonce||'|'||txid_current()::TEXT;
 RETURN encode(public.hmac(convert_to(payload,'UTF8'),convert_to(secret_value,'UTF8'),'sha256'),'hex')=signature;
END
$f$;
CREATE OR REPLACE FUNCTION core_security.signed_school_allowed(p_school_id INTEGER)
RETURNS BOOLEAN LANGUAGE SQL VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,core_security
AS $f$
 SELECT p_school_id::TEXT=current_setting('app.tenant_id',true)
   AND core_security.valid_signed_context();
$f$;
CREATE OR REPLACE FUNCTION core_security.signed_tenant_key_allowed(p_tenant_key TEXT)
RETURNS BOOLEAN LANGUAGE SQL VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,core_security
AS $f$
 SELECT p_tenant_key IS NOT NULL AND length(p_tenant_key)>0
   AND p_tenant_key=current_setting('app.tenant_key',true)
   AND core_security.valid_signed_context();
$f$;
REVOKE ALL ON FUNCTION core_security.valid_signed_context() FROM PUBLIC;
REVOKE ALL ON FUNCTION core_security.signed_school_allowed(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION core_security.signed_tenant_key_allowed(TEXT) FROM PUBLIC;
GRANT USAGE ON SCHEMA core_security TO apex_app_runtime;
GRANT EXECUTE ON FUNCTION core_security.signed_school_allowed(INTEGER) TO apex_app_runtime;
GRANT EXECUTE ON FUNCTION core_security.signed_tenant_key_allowed(TEXT) TO apex_app_runtime;
-- Dynamic classification follows the EXACT production-schema clone, not
-- guessed table ownership. Fail if any RLS table has an unknown tenant column.
DO $policy$
DECLARE
 r RECORD;
 tenant_column TEXT;
 policy_predicate TEXT;
 protected_count INT:=0;
BEGIN
 IF (SELECT count(*) FROM pg_class WHERE relkind='r'
     AND relnamespace='public'::regnamespace AND relforcerowsecurity) <> 77 THEN
    RAISE EXCEPTION 'Unexpected protected relation set; review policy classification';
 END IF;
 FOR r IN SELECT c.oid,c.relname FROM pg_class c WHERE c.relkind='r'
    AND c.relnamespace='public'::regnamespace AND c.relforcerowsecurity
 LOOP
   IF r.relname='schools' THEN
     tenant_column:='id';
     policy_predicate:='core_security.signed_school_allowed(id)';
   ELSIF EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid=r.oid
        AND a.attname='school_id' AND NOT a.attisdropped) THEN
     tenant_column:='school_id';
     policy_predicate:='core_security.signed_school_allowed(school_id)';
   ELSIF r.relname IN ('invoices','payments','subscription_requests','tenant_branding') THEN
     tenant_column:='tenant_id';
     policy_predicate:='core_security.signed_tenant_key_allowed(tenant_id::text)';
   ELSE
     RAISE EXCEPTION 'UNKNOWN TENANT COLUMN for public.%',r.relname;
   END IF;
   EXECUTE format('DROP POLICY IF EXISTS core_signed_tenant_guard ON public.%I',r.relname);
   EXECUTE format('CREATE POLICY core_signed_tenant_guard ON public.%I AS RESTRICTIVE FOR ALL TO apex_app_runtime USING (%s) WITH CHECK (%s)',r.relname,policy_predicate,policy_predicate);
   protected_count:=protected_count+1;
 END LOOP;
 IF protected_count<>77 THEN RAISE EXCEPTION 'Incomplete signed tenant policy coverage %',protected_count; END IF;
END $policy$;
COMMIT;
SELECT 'SIGNED_CLONE_POLICY_READY',COUNT(*) FROM pg_policies
 WHERE policyname='core_signed_tenant_guard';
