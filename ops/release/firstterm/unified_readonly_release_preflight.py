#!/usr/bin/env python3
"""ASSPS unified fail-closed release preflight; READ ONLY against production.

Never performs DDL/DML, auth impersonation, service restarts, deployment, or data reset.
Exit 0 means all IMPLEMENTED preflight checks passed, NOT full system acceptance.
Exit 2 means one or more unverified/failed checks: RELEASE HOLD.
Writes a private, immutable audit JSON receipt ONLY when --receipt is supplied.
"""
from __future__ import annotations
import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys

FIRSTTERM=Path("/root/secure-archive/assps-firstterm-retention-20261019/verify_firstterm_integrity.py")
SOURCE_GUARD=Path(__file__).with_name("verify_live_artifact_fence.py")
PRIVACY_GUARD=Path(__file__).with_name("verify_no_public_principal_signature.py")
NGINX=Path("/etc/nginx/sites-enabled/apex-app-ssl")
REPO=Path("/root/workspace/assps-firstterm-audit-20261019")
CRITICAL_BACKUP=Path("/var/backups/assps-critical-20261019T154045Z")
ROLLBACK=Path("/root/instant_rollback_to_20261016.sh")
GUARD_TIMER="assps-firstterm-integrity-guard.timer"

SQL = """
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT json_build_object(
  'exam_results', (SELECT COUNT(*) FROM public.exam_results),
  'true_zero_marks', (SELECT COUNT(*) FROM public.exam_results WHERE marks_obtained=0),
  'null_marks', (SELECT COUNT(*) FROM public.exam_results WHERE marks_obtained IS NULL),
  'firstterm_exam9_rows', (SELECT COUNT(*) FROM public.exam_results WHERE exam_id=9),
  'firstterm_exam9_zeros', (SELECT COUNT(*) FROM public.exam_results WHERE exam_id=9 AND marks_obtained=0),
  'firstterm_exam9_nulls', (SELECT COUNT(*) FROM public.exam_results WHERE exam_id=9 AND marks_obtained IS NULL),
  'exam8_rows', (SELECT COUNT(*) FROM public.exam_results WHERE exam_id=8),
  'total_students', (SELECT COUNT(*) FROM public.students),
  'school1_active_teacher_assignments', (SELECT COUNT(*) FROM public.teacher_class_assignments WHERE school_id=1 AND is_active=true),
  'school1_lesson_plans', (SELECT COUNT(*) FROM public.lesson_plans WHERE school_id=1)
);
COMMIT;
"""
# Historical Exam8/Exam9 are the immutable assets. Future terms may legitimately add
# rows, new genuine zero marks or NULL placeholders before examination completion.
# The separate one-time SHA manifest enforces exact original row contents.
LOCKED={"firstterm_exam9_rows":1853,"firstterm_exam9_zeros":224,
        "firstterm_exam9_nulls":0,"exam8_rows":1,
        "school1_active_teacher_assignments":54}
GLOBAL_MINIMUMS={"exam_results":1854,"true_zero_marks":224}
TELEMETRY_FIELDS=("null_marks","total_students","school1_lesson_plans")

def command(argv, *, cwd=None, timeout=45):
    try:
        p=subprocess.run(argv, cwd=cwd, text=True, stdout=subprocess.PIPE,
                         stderr=subprocess.PIPE, timeout=timeout, check=False)
        # Avoid emitting stdout/stderr from arbitrarily privileged processes into release receipts.
        return p.returncode, p.stdout, p.stderr
    except (OSError, subprocess.TimeoutExpired) as exc:
        return 255, "", type(exc).__name__

def make_gate(name, ok, category, evidence, reason_if_hold=""):
    return {"id":name,"status":"PASS" if ok else "HOLD",
            "category":category,"evidence":evidence,
            **({ "hold_reason":reason_if_hold } if not ok else {})}

def validate_counts(counts):
    if not isinstance(counts,dict):
        return False
    required=(*LOCKED,*GLOBAL_MINIMUMS,*TELEMETRY_FIELDS)
    if any(type(counts.get(k)) is not int or counts[k]<0 for k in required):
        return False
    return (all(counts[k]==v for k,v in LOCKED.items())
            and all(counts[k]>=v for k,v in GLOBAL_MINIMUMS.items()))

def parse_db_json(stdout):
    lines=[x.strip() for x in stdout.splitlines()]
    objs=[x for x in lines if x.startswith("{") and x.endswith("}")]
    if len(objs)!=1:
        raise ValueError("AMBIGUOUS_DB_READONLY_RECEIPT")
    obj=json.loads(objs[0])
    if not isinstance(obj,dict):
        raise ValueError("INVALID_DB_COUNTS")
    return obj

def probe():
    gates=[]
    rc,out,err=command(["python3",str(FIRSTTERM),"--check"])
    gates.append(make_gate("first_term_immutable_sha",rc==0 and "FIRST_TERM_IMMUTABLE_INTEGRITY_PASS" in out,
                          "data","protected baseline SHA comparison", "missing/changed historical exam record or read error"))
    rc,out,err=command(["runuser","-u","postgres","--","psql","-d","apexos","-X","-A","-t","-v",
                        "ON_ERROR_STOP=1","-c",SQL])
    try:
        counts=parse_db_json(out) if rc==0 else {}
    except (ValueError,json.JSONDecodeError):
        counts={}
    passed=rc==0 and validate_counts(counts)
    gates.append(make_gate("historical_db_counts",passed,"data",
                           {k:counts.get(k) for k in sorted(counts)} if counts else "read-only SELECT unavailable",
                           "protected exam/zero/assignment counts mismatch or SQL failed"))

    manifest=CRITICAL_BACKUP/"SHA256SUMS"
    rc,out,err=command(["sha256sum","--status","-c",str(manifest)],cwd=str(CRITICAL_BACKUP),timeout=120) if manifest.is_file() else (255,"","")
    gates.append(make_gate("critical_backup_sha",rc==0,"recovery",
                           "existing 4-item backup manifest SHA-256 recheck",
                           "backup missing or SHA mismatch"))
    rc,out,err=command(["bash",str(ROLLBACK),"--check"],timeout=25)
    gates.append(make_gate("rollback_preflight",rc==0 and "ROLLBACK_PREFLIGHT_PASS_NO_MUTATION" in out,"recovery",
                           "rollback dry check, no mutation requested","rollback preflight refusal/error"))
    rc,out,err=command(["nginx","-t"])
    gates.append(make_gate("nginx_valid_syntax",rc==0,"infrastructure",
                           "nginx -t only","Nginx parse error"))
    rc,out,err=command(["systemctl","is-active",GUARD_TIMER])
    gates.append(make_gate("hourly_history_guard_active",rc==0 and out.strip()=="active","data",
                           "read-only hourly systemd integrity timer","timer absent or inactive"))

    rc,out,err=command(["python3",str(PRIVACY_GUARD)],timeout=12)
    try:
        privacy=json.loads(out)
    except (ValueError,json.JSONDecodeError):
        privacy={}
    gates.append(make_gate("principal_signature_not_public",rc==0 and privacy.get("status")=="PASS",
                           "security",{"http_status":privacy.get("http_status"),
                                       "noncacheable":privacy.get("no_store")},
                           "anonymous signature request not proven blocked"))

    for name,url,expected in [
      ("public_app_http","https://app.assps.edu.pk/",200),
      ("public_login_http","https://app.assps.edu.pk/login",200),
      ("core_api_http","https://app.assps.edu.pk/api/",200),
      ("backend_health_http","https://api.assps.edu.pk/health",200),
    ]:
        rc,out,err=command(["curl","-sS","-L","--max-time","8","-o","/dev/null","-w","%{http_code}",url],timeout=12)
        gates.append(make_gate(name,rc==0 and out.strip()==str(expected),"availability",
                               {"expected_http":expected,"actual_http":out.strip() if out.isdigit() else None},
                               "current service HTTP expectation not demonstrated"))

    rc,out,err=command(["python3",str(SOURCE_GUARD),"--nginx",str(NGINX),"--repo",str(REPO)],timeout=25)
    try:
        source=json.loads(out)
    except (ValueError,json.JSONDecodeError):
        source={}
    gates.append(make_gate("live_frontend_attestation",rc==0 and source.get("status")=="PASS",
                           "provenance",{"actual_index_sha256":source.get("actual_index_sha256"),
                                        "claimed_index_sha256":source.get("claimed_index_sha256"),
                                        "checks":source.get("checks")},
                           "served index/claimed source hash not source-attested"))

    rc,out,err=command(["df","-Pk","/"])
    try:
        available_kib=int(out.strip().splitlines()[-1].split()[3]) if rc==0 else 0
    except (IndexError,ValueError):
        available_kib=0
    gates.append(make_gate("backup_capacity_5gb",available_kib>=5*1024*1024,"capacity",
                           {"free_gib_rounded":round(available_kib/1024/1024,1)},
                           "less than 5 GiB storage headroom"))
    return gates

def evaluate(gates):
    seen=set()
    for gate in gates:
        if gate["id"] in seen or gate.get("status") not in ("PASS","HOLD"):
            raise ValueError("INVALID_GATE_COLLECTION")
        seen.add(gate["id"])
    passed=sum(g["status"]=="PASS" for g in gates)
    holds=[g["id"] for g in gates if g["status"]!="PASS"]
    return {"all_implemented_preflight_pass":not holds,"passed":passed,"total":len(gates),
            "hold_gate_ids":holds,"production_full_certification":"NOT_CERTIFIED"}

def create_receipt(path,report):
    dest=Path(path)
    if dest.is_symlink() or dest.exists():
        raise FileExistsError("HOLD_RECEIPT_ALREADY_EXISTS_NO_OVERWRITE")
    if not dest.parent.is_dir():
        raise FileNotFoundError("HOLD_RECEIPT_PARENT_MISSING")
    data=(json.dumps(report,sort_keys=True,indent=2)+"\n").encode()
    fd=os.open(dest,os.O_CREAT | os.O_WRONLY | os.O_EXCL,0o600)
    with os.fdopen(fd,"wb") as f:
        f.write(data)
        f.flush()
        os.fsync(f.fileno())
    return hashlib.sha256(data).hexdigest()

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--receipt",help="create NEW existing-parent root-private JSON file, never overwrite")
    args=parser.parse_args()
    gates=probe()
    decision=evaluate(gates)
    receipt={"schema":"ASSPS_UNIFIED_READONLY_PREFLIGHT_V1",
             "observed_utc":dt.datetime.now(dt.timezone.utc).isoformat(),
             "mode":"READ_ONLY_NO_DEPLOY_NO_DB_WRITE",
             "programme":"ASSPS-UNIFIED-20261019",
             "gates":gates,"decision":decision}
    if args.receipt:
        digest=create_receipt(args.receipt,receipt)
        print("PRIVATE_RECEIPT_CREATED_SHA256",digest)
    print(json.dumps(decision,sort_keys=True))
    return 0 if decision["all_implemented_preflight_pass"] else 2

if __name__=="__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        # Fail closed; avoid dumping environment variables, sql or student content into stderr.
        print("HOLD_UNIFIED_PREFLIGHT_FATAL",type(exc).__name__,file=sys.stderr)
        sys.exit(3)
