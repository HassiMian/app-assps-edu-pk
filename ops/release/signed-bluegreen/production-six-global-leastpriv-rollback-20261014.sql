\set ON_ERROR_STOP on
-- PRODUCTION ROLLBACK CANDIDATE: restores exact scoped Green-parent ACL baseline.
-- Not a traffic switch; Core must return public Next/Nginx to Blue before this.
BEGIN;
SET LOCAL lock_timeout='2500ms';
SET LOCAL statement_timeout='25000ms';
SELECT pg_advisory_xact_lock(96101406);
DO $guard$
DECLARE n int;
BEGIN
 IF current_user<>'postgres' OR current_database()<>'apexos' OR current_setting('port')<>'5432'
 THEN RAISE EXCEPTION 'Rollback production target/operator mismatch';END IF;
 SELECT count(DISTINCT tablename) INTO n FROM pg_policies
 WHERE schemaname='public' AND policyname='core_signed_tenant_guard';
 IF n<>77 THEN RAISE EXCEPTION 'Signed policy catalog changed; rollback aborted';END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='assps_core_ai_worker')
  OR EXISTS (SELECT 1 FROM pg_auth_members a JOIN pg_roles m ON m.oid=a.member
   JOIN pg_roles p ON p.oid=a.roleid WHERE m.rolname='assps_core_green_runtime' AND p.rolname='apex_app_runtime')
 THEN RAISE EXCEPTION 'Rollback not on expected migrated state';END IF;
 IF EXISTS (SELECT 1 FROM pg_stat_activity WHERE datname=current_database()
   AND usename IN ('assps_core_green_login','assps_ai_worker_login') AND pid<>pg_backend_pid())
 THEN RAISE EXCEPTION 'Active signed or worker session: safely drain first';END IF;
END $guard$;
DO $work$
DECLARE r record; seq record;
BEGIN
 FOR r IN SELECT c.oid::regclass AS target,c.oid FROM pg_class c
   JOIN pg_policies p ON p.schemaname='public' AND p.tablename=c.relname
   WHERE c.relnamespace='public'::regnamespace AND c.relkind='r'
     AND p.policyname='core_signed_tenant_guard' AND c.relrowsecurity AND c.relforcerowsecurity
 LOOP
  EXECUTE format('REVOKE SELECT,INSERT,UPDATE,DELETE ON TABLE %s FROM assps_core_green_runtime',r.target);
 END LOOP;
 FOR seq IN SELECT DISTINCT s.oid::regclass AS target FROM pg_class s
  JOIN pg_depend d ON d.objid=s.oid AND d.deptype IN ('a','i')
  JOIN pg_class t ON t.oid=d.refobjid
  JOIN pg_policies p ON p.schemaname='public' AND p.tablename=t.relname
  WHERE s.relkind='S' AND t.relnamespace='public'::regnamespace
   AND p.policyname='core_signed_tenant_guard'
   AND s.oid::regclass::text <> 'school_academic_approval_events_id_seq'
 LOOP
  EXECUTE format('REVOKE USAGE,SELECT ON SEQUENCE %s FROM assps_core_green_runtime',seq.target);
 END LOOP;
END $work$;
GRANT apex_app_runtime TO assps_core_green_runtime WITH INHERIT TRUE, SET FALSE;
DO $assert$
DECLARE n int;t text;
BEGIN
 SELECT count(*) INTO n FROM pg_class c JOIN pg_policies p
 ON p.schemaname='public' AND p.tablename=c.relname
 JOIN LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a ON true
 JOIN pg_roles r ON r.oid=a.grantee
 WHERE c.relnamespace='public'::regnamespace AND c.relkind='r'
   AND p.policyname='core_signed_tenant_guard'
   AND r.rolname='assps_core_green_runtime';
 IF n<>0 THEN RAISE EXCEPTION 'Direct grants remain; rollback transaction refused';END IF;
 FOR t IN SELECT unnest(ARRAY['admin_block_audit_log','ai_jobs','ai_queue_events','ai_queue_state','campuses','organizations']) LOOP
  IF NOT has_table_privilege('assps_core_green_runtime','public.'||t,'SELECT')
     OR NOT has_table_privilege('apex_app_runtime','public.'||t,'SELECT')
  THEN RAISE EXCEPTION 'Legacy restored read denied on %',t;END IF;
 END LOOP;
END $assert$;
COMMIT;
