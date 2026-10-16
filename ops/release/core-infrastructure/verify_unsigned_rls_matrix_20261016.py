#!/usr/bin/env python3
"""Actual PostgreSQL read-only no-ticket RLS denial matrix; never certifies signed School2."""
import json
import os
import re
import subprocess
import sys

DB = "apexos"
PORT = "5432"
ROLES = ("assps_marks_signed_runtime", "assps_core_green_runtime")
EXPECTED_SIGNED = 77
NEW_TABLES = (
    "grade910_human_signoff_evidence", "grade910_personal_signature_assets",
    "grade910_supporting_evidence_objects", "grade910_verified_paper_publications",
    "school_academic_approval_events", "assps_grade_revision_audit_20261014",
    "employee_teaching_subject_evidence", "school_class_promotion_plans",
    "school_class_promotion_source_roster",
)
CATALOG = """SELECT DISTINCT p.tablename FROM pg_policies p
JOIN pg_class c ON c.relname=p.tablename AND c.relnamespace='public'::regnamespace
WHERE p.schemaname='public' AND p.policyname='core_signed_tenant_guard'
AND p.permissive='RESTRICTIVE' AND c.relrowsecurity AND c.relforcerowsecurity
AND 'assps_marks_signed_runtime'=ANY(p.roles)
AND 'assps_core_green_runtime'=ANY(p.roles) ORDER BY p.tablename"""
IDENTIFIER = re.compile(r"[a-z][a-z0-9_]*\Z")

def safe_identifier(x):
    return isinstance(x,str) and bool(IDENTIFIER.fullmatch(x))

def classify(role, code, stdout, stderr):
    lines = [x.strip() for x in stdout.splitlines() if x.strip()]
    if not lines or lines[0] != role:
        return "HOLD_IDENTITY"
    if code == 0 and len(lines)==2 and lines[1]=="0":
        return "DENIED_RLS_ZERO"
    if code != 0 and "42501" in stderr and len(lines)==1:
        return "DENIED_PRIVILEGE"
    return "HOLD_VISIBILITY_OR_ERROR"

def run_sql(statement, timeout=12):
    env = dict(os.environ)
    env["PGOPTIONS"]="-c default_transaction_read_only=on -c statement_timeout=8000"
    p = subprocess.run(
        ["runuser","-u","postgres","--","psql","-X","-q","-A","-t",
         "-v","ON_ERROR_STOP=1","-v","VERBOSITY=verbose",
         "-p",PORT,"-d",DB,"-c",statement],
        capture_output=True,text=True,timeout=timeout,env=env)
    return p.returncode,p.stdout,p.stderr

def main():
    code,stdout,stderr=run_sql(CATALOG)
    tables=[t.strip() for t in stdout.splitlines() if t.strip()]
    if code!=0 or len(tables)!=EXPECTED_SIGNED or len(set(tables))!=EXPECTED_SIGNED or not all(map(safe_identifier,tables)):
        print(json.dumps({"status":"HOLD","reason":"INVALID_SIGNED_PROTECTED_CATALOG",
            "signedCount":len(tables),"releaseAuthorized":False}))
        return 2
    targets=sorted(set(tables).union(NEW_TABLES))
    if len(targets)!=EXPECTED_SIGNED+len(NEW_TABLES):
        print(json.dumps({"status":"HOLD","reason":"UNEXPECTED_ADDITIONAL_SCOPE",
            "releaseAuthorized":False}))
        return 2
    outcomes={}
    failures=[]
    for role in ROLES:
        for table in targets:
            sql=f'BEGIN READ ONLY; SET LOCAL ROLE {role}; SELECT current_user; SELECT count(*) FROM public."{table}"; ROLLBACK;'
            try:
                exit_code,out,err=run_sql(sql)
                result=classify(role,exit_code,out,err)
            except (OSError,subprocess.TimeoutExpired):
                result="HOLD_EXECUTION"
            outcomes[result]=outcomes.get(result,0)+1
            if not result.startswith("DENIED_"):
                failures.append({"role":role,"table":table,"state":result})
    status="UNSIGNED_SCOPE_DENIED_NOT_INDEPENDENT_CERTIFICATION" if not failures else "HOLD"
    print(json.dumps({"schema":"ASSPS_UNSIGNED_RLS_MATRIX_V1","status":status,
        "signedTableCount":len(tables),"additionalTableCount":len(NEW_TABLES),
        "expectedProbes":len(targets)*len(ROLES),"outcomes":outcomes,
        "failures":failures,"productionChanged":False,
        "authenticatedPeerSchoolTest":False,"releaseAuthorized":False},sort_keys=True))
    return 0 if not failures else 2

if __name__=="__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        print(json.dumps({"status":"HOLD","reason":type(exc).__name__,
            "releaseAuthorized":False}))
        sys.exit(2)
