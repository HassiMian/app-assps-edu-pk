#!/usr/bin/env bash
# Reproduces expected 1853-row, 224-zero historical snapshot on DISPOSABLE PG16.
# Production Postgres clusters (5432 / 55432) MUST never be used by this harness.
set -euo pipefail
MIG="$(cd "$(dirname "$0")" && pwd)/001_lock_firstterm_exam9_20261019.sql"
if [[ "${ASSPS_FIRSTTERM_CLONE_QA:-}" != 1 ]]; then
  exec pg_virtualenv -v 16 -t env ASSPS_FIRSTTERM_CLONE_QA=1 bash "$0"
fi
test -n "${PGPORT:-}"
test "$PGPORT" != 5432
test "$PGPORT" != 55432
psql -X -q -v ON_ERROR_STOP=1 -d postgres <<'SQL'
CREATE TABLE public.exams (
  id integer PRIMARY KEY, school_id integer, name text, session text
);
CREATE TABLE public.exam_results (
  id integer PRIMARY KEY, school_id integer, exam_id integer,
  marks_obtained numeric
);
INSERT INTO public.exams VALUES
 (8,2,'Demo Monthly Test','2026-27'),
 (9,1,'First Term Exam','2026-2027'),
 (10,1,'Next Term Exam','2026-2027');
INSERT INTO public.exam_results
SELECT i,1,9,CASE WHEN i<=224 THEN 0 ELSE 75 END
FROM generate_series(1,1853) AS i;
INSERT INTO public.exam_results VALUES (2000,2,8,42),(2001,1,10,50);
CREATE ROLE assps_qa_writer NOLOGIN NOSUPERUSER NOBYPASSRLS;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.exams,public.exam_results TO assps_qa_writer;
SQL
psql -X -q -v ON_ERROR_STOP=1 -d postgres -f "$MIG" >/dev/null
check_rejection() {
  local name="$1" statement="$2" output status=0
  output="$(psql -X -v ON_ERROR_STOP=1 -d postgres -Atqc "$statement" 2>&1)" || status=$?
  if [[ "$status" == 0 ]] || ! grep -q 'FIRST_TERM_IMMUTABLE:' <<<"$output"; then
    echo "FAIL $name: missing protective rejection"
    exit 1
  fi
  echo "PASS_DENIED $name"
}
check_rejection update_closed 'UPDATE public.exam_results SET marks_obtained=1 WHERE id=1;'
check_rejection delete_closed 'DELETE FROM public.exam_results WHERE id=1;'
check_rejection insert_closed 'INSERT INTO public.exam_results VALUES (3000,1,9,10);'
check_rejection reassign_out_of_closed 'UPDATE public.exam_results SET exam_id=10 WHERE id=1;'
check_rejection reassign_into_closed 'UPDATE public.exam_results SET exam_id=9 WHERE id=2001;'
check_rejection delete_exam9 'DELETE FROM public.exams WHERE id=9;'
check_rejection edit_exam9 'UPDATE public.exams SET name=upper(name) WHERE id=9;'
check_rejection truncate_results 'TRUNCATE public.exam_results;'
check_rejection truncate_exams 'TRUNCATE public.exams;'
psql -X -q -v ON_ERROR_STOP=1 -d postgres <<'SQL'
SET ROLE assps_qa_writer;
UPDATE public.exam_results SET marks_obtained=48 WHERE id=2000;
UPDATE public.exam_results SET marks_obtained=60 WHERE id=2001;
INSERT INTO public.exam_results VALUES (2002,1,10,50);
DELETE FROM public.exam_results WHERE id=2002;
RESET ROLE;
SQL
actual="$(psql -X -A -t -q -v ON_ERROR_STOP=1 -d postgres -c "SELECT count(*)||','||count(*) FILTER(WHERE marks_obtained=0) FROM public.exam_results WHERE exam_id=9")"
test "$actual" = '1853,224'
echo 'PASS_CLOSED_FIRSTTERM_INTACT 1853,224'
demo="$(psql -X -A -t -q -v ON_ERROR_STOP=1 -d postgres -c 'SELECT marks_obtained FROM public.exam_results WHERE exam_id=8')"
test "$demo" = 48
echo 'PASS_SCHOOL2_DEMO_NOT_RESTRICTED'
# Verify rollback DDL only on disposable cluster and ensure historic data unchanged.
psql -X -q -v ON_ERROR_STOP=1 -d postgres -f "$(dirname "$MIG")/rollback_exam9_history_guards_20261019.sql" >/dev/null
left="$(psql -X -A -t -q -d postgres -c "SELECT count(*) FROM pg_trigger WHERE tgname LIKE 'assps_firstterm_exam9_%'")"
test "$left" = 0
echo 'PASS_SCHEMA_ROLLBACK_AVAILABLE_NO_DATA_REMOVAL'
echo 'PASS_FIRSTTERM_DISPOSABLE_PG16_COMPLETE'
