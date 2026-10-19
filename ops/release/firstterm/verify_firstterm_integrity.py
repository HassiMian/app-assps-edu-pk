#!/usr/bin/env python3
"""ASSPS historical First Term immutable-read audit. NEVER writes PostgreSQL."""
import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

BASE = Path("/root/secure-archive/assps-firstterm-retention-20261019/firstterm-integrity-baseline.json")

def query(sql):
    cmd = ["runuser", "-u", "postgres", "--", "psql", "-d", "apexos", "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-c", sql]
    p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    if p.returncode:
        raise RuntimeError("read-only database command failed: " + p.stderr.decode(errors="replace")[:500])
    return p.stdout

def digest(table, where):
    # Stable JSON source-row serialization sorted by original record ID.
    sql = "COPY (SELECT row_to_json(t)::text FROM (SELECT * FROM public." + table + " WHERE " + where + " ORDER BY id) AS t) TO STDOUT"
    return hashlib.sha256(query(sql)).hexdigest()

def observe():
    sql = """SELECT json_build_object(
        'first_term_exam_id',9,
        'first_term_rows',count(*),
        'real_zero_marks',count(*) FILTER (WHERE marks_obtained=0),
        'null_marks',count(*) FILTER (WHERE marks_obtained IS NULL)
        ) FROM public.exam_results WHERE exam_id=9"""
    info=json.loads(query(sql).decode().strip())
    info["exam9_sha256"]=digest("exam_results", "exam_id=9")
    info["exam8_sha256"]=digest("exam_results", "exam_id=8")
    info["exam8_9_metadata_sha256"]=digest("exams","id IN (8,9)")
    return info

def main():
    parser=argparse.ArgumentParser()
    x=parser.add_mutually_exclusive_group(required=True)
    x.add_argument("--init", action="store_true")
    x.add_argument("--check", action="store_true")
    args=parser.parse_args()
    if args.init:
        if BASE.exists():
            raise RuntimeError("BASELINE_ALREADY_EXISTS: refusing to overwrite historical baseline")
        first=observe()
        second=observe()
        if first != second:
            raise RuntimeError("LIVE_DATA_CHANGED_DURING_CAPTURE: refusing unstable baseline")
        if first["first_term_rows"] != 1853 or first["real_zero_marks"] != 224 or first["null_marks"] != 0:
            raise RuntimeError("HISTORICAL_COUNTS_UNEXPECTED: baseline initialization refused")
        BASE.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        BASE.parent.chmod(0o700)
        data={"purpose":"Immutable First Term Exam9 original marks/results and historical Exam8", "captured_utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),"policy":"Never delete, reset, reseed, replay, recalculate or overwrite historical exam results. Future terms use new IDs.", "observed":first}
        with BASE.open("x",encoding="utf-8") as f:
            json.dump(data,f,indent=2,sort_keys=True)
            f.write("\n")
        BASE.chmod(0o600)
        print("FIRST_TERM_HISTORICAL_BASELINE_CREATED", first["first_term_rows"],first["real_zero_marks"])
    else:
        baseline=json.loads(BASE.read_text(encoding="utf-8"))["observed"]
        now=observe()
        if now != baseline:
            print("HOLD_FIRST_TERM_INTEGRITY_DRIFT", json.dumps({"expected_counts":{k:v for k,v in baseline.items() if not k.endswith("sha256")},"actual_counts":{k:v for k,v in now.items() if not k.endswith("sha256")}, "hash_matches":{k:(now[k]==baseline[k]) for k in baseline if k.endswith("sha256")}}))
            return 2
        print("FIRST_TERM_IMMUTABLE_INTEGRITY_PASS",now["first_term_rows"],"real_zeros",now["real_zero_marks"],"NULL",now["null_marks"])
    return 0
if __name__=="__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        print("HOLD_FIRST_TERM_INTEGRITY_CHECK_ERROR",str(exc),file=sys.stderr)
        sys.exit(3)
