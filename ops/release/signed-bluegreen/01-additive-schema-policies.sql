-- ASSPS signed blue/green additive security, migration candidate v1.
-- Execute ONLY with independent backup, permissioned isolated acceptance and
-- explicit DB identity target. NEVER apply clone-only phase7 SQL to production.
\set ON_ERROR_STOP on
\if :{?CORE_SIGNING_KEY}
\else
\echo 'ERROR: confidential CORE_SIGNING_KEY missing'
\quit 3
\endif
\if :{?ASSPS_TARGET_DATABASE}
\else
\echo 'ERROR: ASSPS_TARGET_DATABASE missing'
\quit 3
\endif
BEGIN;
SELECT set_config('assps.cutover_target_database', :'ASSPS_TARGET_DATABASE', true);
DO $preflight$
DECLARE forced_count int; legacy_count int; signed_count int;
BEGIN
 IF current_user<>'postgres' OR current_database() <> current_setting('assps.cutover_target_database')
   OR (current_database()='apexos' AND current_setting('port')<>'5432')
   OR (current_database()<>'apexos' AND (current_database()<>'assps_backup_restore_check_20261011' OR current_setting('port')<>'55432'))
 THEN RAISE EXCEPTION 'ASSPS signed migration target/operator mismatch'; END IF;
 SELECT count(*) INTO forced_count FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE c.relkind='r' AND c.relforcerowsecurity AND n.nspname='public';
 SELECT count(*) INTO legacy_count FROM pg_policies WHERE schemaname='public' AND policyname NOT IN ('core_signed_tenant_guard','core_signed_tenant_allow');
 SELECT count(*) INTO signed_count FROM pg_policies WHERE schemaname='public' AND policyname IN ('core_signed_tenant_guard','core_signed_tenant_allow');
 IF forced_count<>77 OR legacy_count<>212 OR signed_count<>0
    OR NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='apex_app_runtime' AND NOT rolcanlogin AND NOT rolbypassrls)
    OR EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='core_security')
 THEN RAISE EXCEPTION 'ASSPS baseline drift: protected %, legacy %, signed %',forced_count,legacy_count,signed_count; END IF;
END $preflight$;
DO $create_signed_role$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='assps_marks_signed_runtime') THEN
   RAISE EXCEPTION 'Refusing pre-existing signed role with unverified global grants or dependencies';
 END IF;
 CREATE ROLE assps_marks_signed_runtime NOLOGIN NOINHERIT NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
END $create_signed_role$;
-- Only the NEW blue/green runtime inherits old runtime privileges.
-- No revocation or policy edit on apex_app_runtime, apex_paper_owner, apex_paper_runtime, or apexos_user.
-- IMPORTANT: no membership in old apex_app_runtime. Direct grants only.
-- The old role can reach six unprotected administrative tables; never inherit those privileges.
GRANT USAGE ON SCHEMA public TO assps_marks_signed_runtime;
DO $restricted_grants$
DECLARE r record; granted_tables int:=0; denied_tables int:=0; granted_seq int:=0; denied_seq int:=0;
BEGIN
 IF EXISTS(SELECT 1 FROM pg_auth_members a JOIN pg_roles r ON r.oid=a.member
  WHERE r.rolname='assps_marks_signed_runtime')
 THEN RAISE EXCEPTION 'New signed runtime unexpectedly inherits existing roles'; END IF;
 FOR r IN SELECT c.oid,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relkind='r' AND c.relforcerowsecurity ORDER BY c.relname LOOP
  IF r.relname IN ('paper_documents','paper_revisions') THEN
    IF has_table_privilege('apex_app_runtime',r.oid,'SELECT')
    OR has_table_privilege('apex_app_runtime',r.oid,'INSERT')
    OR has_table_privilege('apex_app_runtime',r.oid,'UPDATE')
    OR has_table_privilege('apex_app_runtime',r.oid,'DELETE')
    THEN RAISE EXCEPTION 'Protected Paper permission exception drift'; END IF;
    denied_tables:=denied_tables+1;
  ELSE
    IF NOT (has_table_privilege('apex_app_runtime',r.oid,'SELECT')
    AND has_table_privilege('apex_app_runtime',r.oid,'INSERT')
    AND has_table_privilege('apex_app_runtime',r.oid,'UPDATE')
    AND has_table_privilege('apex_app_runtime',r.oid,'DELETE'))
    THEN RAISE EXCEPTION 'Protected relation privilege baseline drift %',r.relname; END IF;
    EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.%I TO assps_marks_signed_runtime',r.relname);
    granted_tables:=granted_tables+1;
  END IF;
 END LOOP;
 FOR r IN SELECT c.oid,c.relname FROM pg_class c WHERE c.relnamespace='public'::regnamespace AND c.relkind='S' ORDER BY c.relname LOOP
  IF has_sequence_privilege('apex_app_runtime',r.oid,'USAGE')
     AND has_sequence_privilege('apex_app_runtime',r.oid,'SELECT')
     AND has_sequence_privilege('apex_app_runtime',r.oid,'UPDATE') THEN
    EXECUTE format('GRANT USAGE,SELECT,UPDATE ON SEQUENCE public.%I TO assps_marks_signed_runtime',r.relname);
    granted_seq:=granted_seq+1;
  ELSIF NOT (has_sequence_privilege('apex_app_runtime',r.oid,'USAGE')
    OR has_sequence_privilege('apex_app_runtime',r.oid,'SELECT')
    OR has_sequence_privilege('apex_app_runtime',r.oid,'UPDATE')) THEN
    denied_seq:=denied_seq+1;
  ELSE RAISE EXCEPTION 'Partially granted sequence baseline drift %',r.relname;
  END IF;
 END LOOP;
 IF granted_tables<>75 OR denied_tables<>2 OR granted_seq<>73 OR denied_seq<>4
 THEN RAISE EXCEPTION 'Exact privileges do not match 75/2,73/4'; END IF;
END $restricted_grants$;
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
 ON CONFLICT(singleton) DO NOTHING;

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
GRANT USAGE ON SCHEMA core_security TO assps_marks_signed_runtime;
GRANT EXECUTE ON FUNCTION core_security.signed_school_allowed(INTEGER) TO assps_marks_signed_runtime;
GRANT EXECUTE ON FUNCTION core_security.signed_tenant_key_allowed(TEXT) TO assps_marks_signed_runtime;
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
   EXECUTE format('CREATE POLICY core_signed_tenant_guard ON public.%I AS RESTRICTIVE FOR ALL TO assps_marks_signed_runtime USING (%s) WITH CHECK (%s)',r.relname,policy_predicate,policy_predicate);
   EXECUTE format('CREATE POLICY core_signed_tenant_allow ON public.%I AS PERMISSIVE FOR ALL TO assps_marks_signed_runtime USING (%s) WITH CHECK (%s)',r.relname,policy_predicate,policy_predicate);
   protected_count:=protected_count+1;
 END LOOP;
 IF protected_count<>77 THEN RAISE EXCEPTION 'Incomplete signed tenant policy coverage %',protected_count; END IF;
END $policy$;

-- Revalidate exact scope. Any failure rolls back role/schema/policies together.
DO $postflight$
BEGIN
 IF (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND policyname='core_signed_tenant_guard' AND roles=ARRAY['assps_marks_signed_runtime']::name[])<>77
 OR (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND policyname NOT IN ('core_signed_tenant_guard','core_signed_tenant_allow'))<>212
 OR (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND policyname='core_signed_tenant_allow' AND roles=ARRAY['assps_marks_signed_runtime']::name[])<>77
 OR (SELECT count(*) FROM pg_roles WHERE rolname='assps_marks_signed_runtime' AND NOT rolcanlogin AND NOT rolinherit AND NOT rolbypassrls AND NOT rolsuper)<>1
 OR (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND c.relkind='r' AND c.relforcerowsecurity AND c.relrowsecurity)<>77
 OR EXISTS(SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.member WHERE r.rolname='assps_marks_signed_runtime')
 OR EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relforcerowsecurity
     AND (has_table_privilege('assps_marks_signed_runtime',c.oid,'SELECT')
       OR has_table_privilege('assps_marks_signed_runtime',c.oid,'INSERT')
       OR has_table_privilege('assps_marks_signed_runtime',c.oid,'UPDATE')
       OR has_table_privilege('assps_marks_signed_runtime',c.oid,'DELETE')))
 OR has_table_privilege('assps_marks_signed_runtime','public.paper_documents','SELECT')
 OR has_table_privilege('assps_marks_signed_runtime','public.paper_revisions','SELECT')
 THEN RAISE EXCEPTION 'ASSPS signed postflight policy/privilege/role isolation mismatch'; END IF;
END $postflight$;
COMMIT;
