\set ON_ERROR_STOP on
-- Repeatable grant fixture on dedicated loopback disposable Phase 7 DB only.
DO $$
BEGIN
 IF current_database() <> 'assps_core_signed_p7_20261008'
 OR current_setting('port')::int <> 55432
 THEN RAISE EXCEPTION 'Refuse non-disposable clone fixture';
 END IF;
END $$;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.lesson_plans,public.daily_diaries TO apex_app_runtime;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO apex_app_runtime;
SELECT 'LESSON_DIARY_SCHEMA',
(SELECT count(*) FROM pg_policies WHERE policyname='core_signed_tenant_guard' AND tablename IN ('lesson_plans','daily_diaries'));
