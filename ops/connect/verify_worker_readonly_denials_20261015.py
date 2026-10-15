#!/usr/bin/env python3
"""Read-only worker capability and denial probe against the Core-approved live DB identity.

Run on authorized VPS as root. Never print, persist, or forward worker credentials.
No mutations, role SET, SQL DDL, user tokens, or school records. This is a
technical capability test only, not signed production worker transport certification.
"""
from __future__ import annotations
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys

CORE_VERIFIER = Path("/root/workspace/assps-core-connect-gate-exit-hardening-20261015/ops/release/signed-bluegreen/verify-live-restricted-ai-worker-20261015.py")
PROTECTED = ("organizations","campuses","admin_block_audit_log")
QUEUES = ("ai_jobs","ai_queue_events","ai_queue_state")
EXPECTED_ROLE = "assps_ai_worker_login"
EXPECTED_DB = "apexos"

def reviewed_credentials():
    spec = importlib.util.spec_from_file_location("assps_core_reviewed_worker", CORE_VERIFIER)
    if spec is None or spec.loader is None:
        raise RuntimeError("CORE_WORKER_VERIFIER_UNAVAILABLE")
    core = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(core)
    cfg = core.load_env()  # Core's strict root-only owner/mode/schema validation.
    if cfg["DB_AI_WORKER_USER"] != EXPECTED_ROLE or cfg["DB_AI_WORKER_NAME"] != EXPECTED_DB:
        raise ValueError("WRONG_APPROVED_WORKER")
    return cfg

def sql_readonly(statement, cfg):
    env = os.environ.copy()
    for key in list(env):
        if key.startswith("PG") and key not in ("PGCONNECT_TIMEOUT",):
            env.pop(key)
    env["PGCONNECT_TIMEOUT"] = "5"
    env["PGPASSWORD"] = cfg["DB_AI_WORKER_PASSWORD"]
    process = subprocess.run(
        ["psql","-XqAt","-h","127.0.0.1","-p","5432","-U",EXPECTED_ROLE,
         "-d",EXPECTED_DB,"-v","ON_ERROR_STOP=1","-c",statement],
        capture_output=True,text=True,env=env,timeout=12,
    )
    # Do not expose command stderr/stdout beyond sanitized local boolean checks.
    return process.returncode, process.stdout.strip(), process.stderr

def verify():
    result = {"gate":"APEX_CONNECT_REAL_RESTRICTED_WORKER_READ_ONLY_DENIAL",
              "production_changes":False,"private_credentials_exposed":False,
              "authenticated_http_user_or_school2_certified":False,
              "public_worker_deployment_certified":False,"release_authorized":False,
              "checks":{}}
    checks=result["checks"]
    try:
        cfg = reviewed_credentials()
        checks["trusted_root_only_service_identity_config"]=True
        q = ("SELECT current_user,rolcanlogin,rolsuper,rolbypassrls,rolinherit,"
             "pg_has_role(current_user,'assps_core_ai_worker','USAGE'),"
             "pg_has_role(current_user,'assps_core_ai_worker','SET') "
             "FROM pg_roles WHERE rolname=current_user")
        code, text, _ = sql_readonly(q, cfg)
        checks["authenticated_login_is_not_super_or_bypassrls"] = (
            code == 0 and text == "assps_ai_worker_login|t|f|f|f|t|f")
        for table in QUEUES:
            query = f"SELECT has_table_privilege(current_user,'public.{table}','SELECT')"
            code, text, _ = sql_readonly(query,cfg)
            checks[f"authorized_{table}_select"] = code == 0 and text == "t"
        for table in PROTECTED:
            for privilege in ("SELECT","INSERT","UPDATE","DELETE"):
                query = f"SELECT has_table_privilege(current_user,'public.{table}','{privilege}')"
                code,text,_=sql_readonly(query,cfg)
                checks[f"forbidden_{table}_{privilege.lower()}"] = code == 0 and text == "f"
            code,text,err=sql_readonly(f"SELECT count(*) FROM public.{table}",cfg)
            checks[f"actual_select_{table}_rejected"] = (
                code != 0 and "permission denied" in err.lower())
        result["technical_status"]="PASS" if all(checks.values()) else "HOLD"
    except (OSError,ValueError,RuntimeError,subprocess.TimeoutExpired) as err:
        checks["failed_closed"]=False
        result["technical_status"]="HOLD"
        result["error_class"]=type(err).__name__
    result["passed"]=sum(v is True for v in checks.values())
    result["checked"]=len(checks)
    return result

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--production-release-gate",action="store_true")
    opts=p.parse_args()
    report=verify()
    print(json.dumps(report,indent=2,sort_keys=True))
    return 2 if opts.production_release_gate or report["technical_status"]!="PASS" else 0

if __name__=="__main__":
    sys.exit(main())
