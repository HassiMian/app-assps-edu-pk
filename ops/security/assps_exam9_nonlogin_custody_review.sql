-- REVIEWED-CANDIDATE SOURCE. This already ran on the authorized live database
-- on 2026-10-23, after a successful full same-VPS restored-copy rehearsal.
-- Do NOT rerun without a new DBA-controlled preflight, checksums and rollback.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='15000ms';
CREATE ROLE assps_immutable_data_owner_20261023 NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE;
ALTER EVENT TRIGGER assps_exam9_protected_ddl_end_20261023 DISABLE;
ALTER EVENT TRIGGER assps_exam9_protected_drop_20261023 DISABLE;
ALTER DATABASE apexos OWNER TO assps_immutable_data_owner_20261023;
ALTER SCHEMA public OWNER TO assps_immutable_data_owner_20261023;
GRANT CONNECT,TEMPORARY,CREATE ON DATABASE apexos TO apexos_user;
GRANT USAGE,CREATE ON SCHEMA public TO apexos_user;
ALTER TABLE public.exam_results OWNER TO assps_immutable_data_owner_20261023;
ALTER TABLE public.exams OWNER TO assps_immutable_data_owner_20261023;
GRANT SELECT,INSERT,UPDATE,DELETE,REFERENCES ON TABLE public.exam_results,public.exams TO apexos_user;
GRANT USAGE,SELECT,UPDATE ON SEQUENCE public.exam_results_id_seq,public.exams_id_seq TO apexos_user;
ALTER EVENT TRIGGER assps_exam9_protected_ddl_end_20261023 ENABLE;
ALTER EVENT TRIGGER assps_exam9_protected_drop_20261023 ENABLE;
COMMIT;
