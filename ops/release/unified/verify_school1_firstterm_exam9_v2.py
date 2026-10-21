#!/usr/bin/env python3
"""School1-only First Term original-record integrity. Read-only PostgreSQL.
V2 intentionally excludes School2 Demo Exam8 from *First Term* release blocking.
The V1 manifest is retained as historical evidence and is never rewritten.
"""
import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

VAULT=Path("/root/secure-archive/assps-firstterm-retention-20261019")
LEGACY=VAULT/"firstterm-integrity-baseline.json"
BASE=VAULT/"school1-firstterm-exam9-v2-baseline.json"
EXPECTED={"exam_id":9,"school_id":1,"first_term_rows":1853,"real_zero_marks":224,
          "null_marks":0,"non_school1_rows":0,"school1_exam_name":"First Term Exam"}

def query(sql):
    # The database role is only used to SELECT or COPY; never writes examination data.
    proc=subprocess.run(["runuser","-u","postgres","--","psql",
                         "-d","apexos","-X","-q","-A","-t","-v","ON_ERROR_STOP=1",
                         "-c",sql],stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=45,check=False)
    if proc.returncode:
        raise RuntimeError("READONLY_SQL_UNAVAILABLE")
    return proc.stdout

def digest(table,where):
    if table not in ("exam_results","exams"):
        raise ValueError("UNEXPECTED_TABLE")
    sql="COPY (SELECT row_to_json(t)::text FROM (SELECT * FROM public."+table+" WHERE "+where+" ORDER BY id) t) TO STDOUT"
    return hashlib.sha256(query(sql)).hexdigest()

def observe():
    sql="""SELECT json_build_object(
      'exam_id',9,'school_id',1,
      'first_term_rows',COUNT(*),
      'real_zero_marks',COUNT(*) FILTER (WHERE marks_obtained=0),
      'null_marks',COUNT(*) FILTER (WHERE marks_obtained IS NULL),
      'non_school1_rows',COUNT(*) FILTER (WHERE school_id IS DISTINCT FROM 1),
      'school1_exam_name',(SELECT CASE WHEN school_id=1 THEN name ELSE NULL END FROM public.exams WHERE id=9)
    ) FROM public.exam_results WHERE exam_id=9"""
    value=json.loads(query(sql).decode().strip())
    value["exam9_sha256"]=digest("exam_results","exam_id=9")
    value["exam9_metadata_sha256"]=digest("exams","id=9")
    return value

def ensure_scope_and_legacy(value):
    if any(value.get(k)!=v for k,v in EXPECTED.items()):
        raise RuntimeError("FIRST_TERM_EXAM9_SCOPE_OR_COUNTS_UNEXPECTED")
    legacy=json.loads(LEGACY.read_text(encoding="utf-8"))["observed"]
    if legacy.get("exam9_sha256")!=value["exam9_sha256"]:
        raise RuntimeError("LEGACY_EXAM9_SHA_MISMATCH")
    for old,new in (("first_term_rows","first_term_rows"),
                    ("real_zero_marks","real_zero_marks"),("null_marks","null_marks")):
        if legacy.get(old)!=value.get(new):
            raise RuntimeError("LEGACY_EXAM9_COUNTS_MISMATCH")

def check_status():
    first=observe()
    second=observe()
    if first!=second:return False,"LIVE_CHANGING_DURING_CHECK"
    baseline=json.loads(BASE.read_text(encoding="utf-8"))["observed"]
    if first!=baseline:return False,"SCHOOL1_FIRST_TERM_HASH_DRIFT"
    return True,"SCHOOL1_FIRST_TERM_IMMUTABLE_INTEGRITY_PASS"

def run_init():
    if BASE.exists():raise FileExistsError("V2_BASELINE_EXISTS_NO_OVERWRITE")
    first=observe()
    ensure_scope_and_legacy(first)
    second=observe()
    if first!=second:raise RuntimeError("UNSTABLE_LIVE_BASELINE")
    data={"schema":"ASSPS_SCHOOL1_FIRSTTERM_EXAM9_V2",
          "captured_utc":dt.datetime.now(dt.timezone.utc).isoformat(),
          "historical_policy":"School1 Exam9 completed, permanently preserved; excludes School2 Demo Exam8.",
          "observed":first}
    flags=os.O_WRONLY|os.O_CREAT|os.O_EXCL
    fd=os.open(BASE,flags,0o600)
    with os.fdopen(fd,"w",encoding="utf-8") as f:
        json.dump(data,f,sort_keys=True,indent=2)
        f.write("\n")
        f.flush()
        os.fsync(f.fileno())
    print("FIRST_TERM_SCHOOL1_V2_BASELINE_CREATED",
          first["first_term_rows"],first["real_zero_marks"])

def main(argv=None):
    a=argparse.ArgumentParser()
    g=a.add_mutually_exclusive_group(required=True)
    g.add_argument("--init",action="store_true")
    g.add_argument("--check",action="store_true")
    args=a.parse_args(argv)
    try:
        if args.init:
            run_init()
        else:
            ok,msg=check_status()
            print(msg)
            if not ok:return 2
        return 0
    except (OSError,ValueError,RuntimeError,KeyError,subprocess.TimeoutExpired) as exc:
        print("HOLD_SCHOOL1_FIRSTTERM_V2",type(exc).__name__,str(exc)[:110],file=sys.stderr)
        return 3

if __name__=="__main__":
    sys.exit(main())
