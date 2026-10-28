-- Synthetic temporary PostgreSQL 16 fixture only; no production secret included.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE ROLE apex_app_runtime NOLOGIN NOSUPERUSER NOBYPASSRLS;
CREATE SCHEMA core_security;
CREATE TABLE core_security.signing_key(singleton boolean PRIMARY KEY,secret text NOT NULL);
INSERT INTO core_security.signing_key VALUES(true,'ASSPS_SYNTHETIC_PG16_TEST_SECRET_EXAMPLE_NOT_LIVE_20261028');
CREATE OR REPLACE FUNCTION core_security.valid_signed_context()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,core_security AS $f$
DECLARE
 tenant text:=current_setting('app.tenant_id',true);
 tenant_key text:=current_setting('app.tenant_key',true);
 actor text:=current_setting('app.core_actor_id',true);
 expiry text:=current_setting('app.core_sig_exp',true);
 nonce text:=current_setting('app.core_sig_nonce',true);
 signature text:=current_setting('app.core_sig',true);
 secret_value text; payload text;
 now_epoch bigint:=extract(epoch from clock_timestamp())::bigint;
BEGIN
 IF current_setting('app.rls_enabled',true) IS DISTINCT FROM 'true'
   OR current_setting('app.is_super_admin',true) IS DISTINCT FROM 'false'
   OR tenant IS NULL OR tenant !~ '^[0-9]{1,12}$'
   OR tenant_key IS NULL OR length(tenant_key)>200
   OR actor IS NULL OR actor !~ '^[1-9][0-9]{0,11}$'
   OR expiry IS NULL OR expiry !~ '^[0-9]{10}$'
   OR nonce IS NULL OR nonce !~ '^[0-9a-f]{32}$'
   OR signature IS NULL OR signature !~ '^[0-9a-f]{64}$' THEN RETURN FALSE; END IF;
 IF expiry::bigint < now_epoch OR expiry::bigint > now_epoch+120 THEN RETURN FALSE; END IF;
 SELECT k.secret INTO secret_value FROM core_security.signing_key k WHERE singleton=TRUE;
 IF secret_value IS NULL THEN RETURN FALSE; END IF;
 payload:=tenant||'|'||tenant_key||'|'||session_user||'|'||actor||'|'||expiry||'|'||nonce||'|'||txid_current()::text;
 RETURN encode(public.hmac(convert_to(payload,'UTF8'),convert_to(secret_value,'UTF8'),'sha256'),'hex')=signature;
END
$f$;
CREATE OR REPLACE FUNCTION core_security.signed_school_allowed(p_school_id integer)
RETURNS boolean LANGUAGE sql SECURITY DEFINER
SET search_path=pg_catalog,core_security AS $f$
SELECT p_school_id::text=current_setting('app.tenant_id',true)
 AND core_security.valid_signed_context();
$f$;
REVOKE ALL ON core_security.signing_key FROM PUBLIC;
GRANT USAGE ON SCHEMA core_security TO apex_app_runtime;
GRANT EXECUTE ON FUNCTION core_security.valid_signed_context() TO apex_app_runtime;
GRANT EXECUTE ON FUNCTION core_security.signed_school_allowed(integer) TO apex_app_runtime;
CREATE TABLE public.schools(id integer PRIMARY KEY);
CREATE TABLE public.users(id integer PRIMARY KEY,school_id integer NOT NULL,role text NOT NULL,is_active boolean NOT NULL);
CREATE TABLE public.exam_results(id integer PRIMARY KEY,school_id integer NOT NULL,exam_id integer NOT NULL,student_id integer NOT NULL,subject varchar NOT NULL,marks_obtained numeric(10,2) NOT NULL);
INSERT INTO public.schools VALUES(1),(2);
INSERT INTO public.users VALUES(11,1,'principal',true),(12,1,'teacher',true),(13,1,'principal',true),(22,2,'principal',true);
INSERT INTO public.exam_results VALUES(101,1,31,42,'Science',0);
