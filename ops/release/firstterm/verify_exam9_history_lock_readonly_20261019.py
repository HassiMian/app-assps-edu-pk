#!/usr/bin/env python3
"""Read-only First Term Exam9 and scoped trigger catalog verification."""
import subprocess
sql = """
BEGIN TRANSACTION READ ONLY;
SELECT 'exam9',count(*),count(*) FILTER (WHERE marks_obtained=0),
       count(*) FILTER (WHERE marks_obtained IS NULL),
       count(*) FILTER (WHERE school_id IS DISTINCT FROM 1)
  FROM public.exam_results WHERE exam_id=9;
SELECT 'exam8_demo',count(*) FROM public.exam_results WHERE exam_id=8;
SELECT 'exam9_metadata',count(*) FROM public.exams
  WHERE id=9 AND school_id=1 AND name='First Term Exam' AND session='2026-2027';
SELECT 'guards',count(*) FROM pg_trigger
  WHERE tgname LIKE 'assps_firstterm_exam9_%'
    AND tgrelid IN ('public.exams'::regclass,'public.exam_results'::regclass)
    AND tgenabled='O' AND NOT tgisinternal;
SELECT 'functions',count(*) FROM pg_proc
  WHERE proname='assps_firstterm_exam9_immutability_20261019'
    AND pronamespace='public'::regnamespace;
ROLLBACK;
"""
p = subprocess.run(["sudo","-u","postgres","psql","-X","-d","apexos","-Atq","-v","ON_ERROR_STOP=1"],input=sql,text=True,capture_output=True,timeout=20)
if p.returncode:
    raise SystemExit("HOLD: read-only PG inspection failed")
actual=p.stdout.strip().splitlines()
expected=['exam9|1853|224|0|0','exam8_demo|1','exam9_metadata|1','guards|4','functions|1']
if actual != expected:
    raise SystemExit("HOLD: baseline or catalog drift "+str(actual))
print("FIRST_TERM_EXAM9_IMMUTABLE_GUARD_PASS: 1853 rows,224 genuine zeros,4 protective triggers")
