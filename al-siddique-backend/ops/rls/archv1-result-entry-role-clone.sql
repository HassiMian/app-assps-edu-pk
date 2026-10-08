-- Clone-only role schema rehearsal for Release-bound Result Entry.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$
BEGIN
 IF current_database() !~ '^assps_archv1_rls_' OR current_user <> 'postgres' THEN
  RAISE EXCEPTION 'Result Entry role rehearsal requires disposable isolated clone';
 END IF;
END $guard$;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN (
 'super_admin','school_admin','admin','principal','teacher','accountant','parent','student','result_entry'));
COMMIT;
SELECT 'ARCHV1_CLONE_RESULT_ENTRY_ROLE_SCHEMA_PASS' AS result;
