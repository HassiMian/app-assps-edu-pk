-- PRIVATE QA CLUSTER ONLY. This intentionally DOES NOT reproduce the real
-- production apexos_user LOGIN/BYPASSRLS attributes or group memberships.
-- A safe NOLOGIN ownership placeholder supports archive ACL replay rehearsal.
BEGIN;
DO $precheck$
BEGIN
 IF current_database()<>'assps_core_acl_replay_qa_20261013'
 OR current_setting('port')<>'55432' OR current_user<>'postgres'
 THEN RAISE EXCEPTION 'REFUSE_OUTSIDE_DISPOSABLE_ACL_REPLAY_DB'; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='apexos_user')
 THEN RAISE EXCEPTION 'PREEXISTING_LEGACY_ROLE_REQUIRES_REVIEW'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='apex_paper_owner'
 AND NOT rolcanlogin AND NOT rolbypassrls AND NOT rolsuper)
 THEN RAISE EXCEPTION 'PAPER_OWNER_SAFE_MAPPING_MISSING'; END IF;
END $precheck$;
CREATE ROLE apexos_user NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
DO $postcheck$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='apexos_user'
 AND (rolcanlogin OR rolsuper OR rolbypassrls OR rolinherit OR rolcreatedb OR rolcreaterole))
 THEN RAISE EXCEPTION 'UNSAFE_LEGACY_OWNER_PLACEHOLDER'; END IF;
 IF EXISTS(SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.member
 WHERE r.rolname='apexos_user')
 THEN RAISE EXCEPTION 'PLACEHOLDER_MUST_HAVE_ZERO_ROLE_MEMBERSHIPS'; END IF;
END $postcheck$;
COMMIT;
