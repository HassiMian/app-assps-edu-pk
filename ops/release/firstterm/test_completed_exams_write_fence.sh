#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
pg_virtualenv -v 16 -- bash -euo pipefail -c '
  psql -X -q -v ON_ERROR_STOP=1 postgres <<SQL
CREATE TABLE public.exams (id integer PRIMARY KEY, name text NOT NULL);
CREATE TABLE public.exam_results (id integer PRIMARY KEY, exam_id integer, marks_obtained numeric);
INSERT INTO public.exams VALUES (8, '\''Prior Exam'\''),(9, '\''First Term'\''),(10, '\''Second Term'\'');
INSERT INTO public.exam_results VALUES (1,8,48),(2,9,0);
SQL
  psql -X -q -v ON_ERROR_STOP=1 postgres -f "$1"
  count=0
  expect_reject() {
    label="$1"; statement="$2"
    if psql -X -q -v ON_ERROR_STOP=1 postgres -c "$statement" > /dev/null 2>&1; then
      echo "FAIL_PROTECTION_NOT_ENFORCED $label" >&2
      exit 3
    fi
    count=$((count+1))
    echo "BLOCKED_$label"
  }
  expect_reject update_exam9 "UPDATE public.exam_results SET marks_obtained=98 WHERE id=2"
  expect_reject delete_exam9 "DELETE FROM public.exam_results WHERE id=2"
  expect_reject insert_exam9 "INSERT INTO public.exam_results VALUES (3,9,42)"
  expect_reject relabel_exam9 "UPDATE public.exam_results SET exam_id=10 WHERE id=2"
  expect_reject move_exam10_into_exam9 "INSERT INTO public.exam_results VALUES (3,10,56); UPDATE public.exam_results SET exam_id=9 WHERE id=3"
  expect_reject change_exam9_metadata "UPDATE public.exams SET name='\''Changed'\'' WHERE id=9"
  expect_reject delete_exam8_metadata "DELETE FROM public.exams WHERE id=8"
  expect_reject truncate_results "TRUNCATE public.exam_results"
  psql -X -q -v ON_ERROR_STOP=1 postgres <<SQL
UPDATE public.exam_results SET marks_obtained=57 WHERE id=3;
DELETE FROM public.exam_results WHERE id=3;
INSERT INTO public.exam_results VALUES (4,10,66);
SQL
  psql -X -A -t -v ON_ERROR_STOP=1 postgres -c "SELECT count(*) FROM public.exam_results WHERE exam_id=9 AND marks_obtained=0" | grep -qx "1"
  psql -X -A -t -v ON_ERROR_STOP=1 postgres -c "SELECT count(*) FROM public.exam_results WHERE exam_id=10 AND marks_obtained=66" | grep -qx "1"
  test "$count" -eq 8
  echo "CLOSED_EXAM_IMMUTABILITY_SYNTHETIC_PASS 8/8 intentional denial checks; future exam10 writes PASS"
' bash "$ROOT/completed_exams_write_fence_20261019.sql"
