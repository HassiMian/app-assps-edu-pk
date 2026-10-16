#!/usr/bin/env python3
"""ASSPS production operational attestation: READ ONLY, no credentials, no printing.
Retains prior school-owner Ricoh and institutional acceptance while refusing to
mislabel machine evidence as independent faculty academic review.
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
import tempfile

SITE = Path("/etc/nginx/sites-enabled/apex-app-ssl")
V3_GUARD = Path(__file__).with_name("verify-resultcards-v3-active-20261015.cjs")
DIARY_GUARD = Path(__file__).with_name("verify-diary-controls-in-active-bundle-20261015.cjs")
MARKS_GUARD = Path(__file__).with_name("verify-marks-register-ui-20261015.cjs")
APP_URL = "https://app.assps.edu.pk/"
API_URL = "https://api.assps.edu.pk/health"

READ_ONLY_SQL = r"""
WITH subject_evidence AS (
  SELECT x.id, x.approval_status, x.approved_by_user_id, x.approved_at,
    COUNT(r.id) AS scored_rows,
    COUNT(DISTINCT r.total_marks) AS distinct_maxima,
    COUNT(r.id) FILTER (WHERE r.marks_obtained IS NULL
      OR r.marks_obtained < 0 OR r.marks_obtained > r.total_marks
      OR r.total_marks IS NULL OR r.total_marks <= 0) AS invalid_rows
  FROM public.exam_subjects x
  LEFT JOIN public.students s ON s.school_id=x.school_id
    AND lower(btrim(s.class))=lower(btrim(x.class_name))
    AND lower(btrim(s.section))=lower(btrim(x.section))
  LEFT JOIN public.exam_results r ON r.school_id=x.school_id
    AND r.exam_id=x.exam_id AND r.student_id=s.id
    AND lower(btrim(r.subject))=lower(btrim(x.subject))
  WHERE x.school_id=1 AND x.exam_id=9 AND x.is_active
  GROUP BY x.id
),
subject_rollup AS (
  SELECT COUNT(*) total_configurations,
    COUNT(*) FILTER (WHERE scored_rows>0 AND distinct_maxima=1
      AND invalid_rows=0) machine_checkable_configurations,
    COUNT(*) FILTER (WHERE scored_rows=0) configurations_without_score_evidence,
    COUNT(*) FILTER (WHERE distinct_maxima>1 OR invalid_rows>0) inconsistent_configurations,
    COUNT(*) FILTER (WHERE approval_status='approved'
      AND approved_by_user_id IS NOT NULL AND approved_at IS NOT NULL) signed_configurations
  FROM subject_evidence
),
score_rollup AS (
  SELECT COUNT(*) total_score_rows,
    COUNT(*) FILTER (WHERE marks_obtained=0) actual_zeros,
    COUNT(DISTINCT school_id) school_count,
    COUNT(*) FILTER (WHERE marks_obtained IS NULL OR total_marks IS NULL
      OR total_marks <= 0 OR marks_obtained < 0 OR marks_obtained > total_marks) invalid_rows
  FROM public.exam_results
),
term_rollup AS (
  SELECT COUNT(*) first_term_rows,COUNT(DISTINCT student_id) first_term_students
  FROM public.exam_results WHERE school_id=1 AND exam_id=9
),
scored_students AS (
  SELECT DISTINCT student_id FROM public.exam_results
  WHERE school_id=1 AND exam_id=9
),
expected_subjects AS (
  SELECT s.id student_id,es.subject
  FROM scored_students p
  JOIN public.students s ON s.id=p.student_id AND s.school_id=1
  JOIN public.exam_subjects es ON es.school_id=1 AND es.exam_id=9
    AND es.is_active
    AND lower(btrim(es.class_name))=lower(btrim(s.class))
    AND lower(btrim(es.section))=lower(btrim(s.section))
),
missing_subjects AS (
  SELECT e.student_id FROM expected_subjects e
  LEFT JOIN public.exam_results r ON r.school_id=1 AND r.exam_id=9
    AND r.student_id=e.student_id
    AND lower(btrim(r.subject))=lower(btrim(e.subject))
  WHERE r.id IS NULL
),
unmapped_results AS (
  SELECT r.id FROM public.exam_results r
  JOIN public.students s ON s.school_id=r.school_id AND s.id=r.student_id
  LEFT JOIN public.exam_subjects es ON es.school_id=1 AND es.exam_id=9
    AND es.is_active AND lower(btrim(es.class_name))=lower(btrim(s.class))
    AND lower(btrim(es.section))=lower(btrim(s.section))
    AND lower(btrim(es.subject))=lower(btrim(r.subject))
  WHERE r.school_id=1 AND r.exam_id=9 AND es.id IS NULL
),
duplicate_scores AS (
  SELECT r.student_id,lower(btrim(r.subject))
  FROM public.exam_results r WHERE r.school_id=1 AND r.exam_id=9
  GROUP BY r.student_id,lower(btrim(r.subject)) HAVING count(*)>1
),
subject_percentage_gaps AS (
  SELECT r.id FROM public.exam_results r
  WHERE r.school_id=1 AND r.exam_id=9 AND r.total_marks>0
    AND NOT EXISTS (
      SELECT 1 FROM public.grade_settings g WHERE g.school_id=1
        AND floor(r.marks_obtained*100.0/r.total_marks)
           BETWEEN g.min_percentage AND g.max_percentage)
),
student_totals AS (
  SELECT r.student_id,sum(r.marks_obtained) AS marks,
         sum(r.total_marks) AS total
  FROM public.exam_results r WHERE r.school_id=1 AND r.exam_id=9
  GROUP BY r.student_id
),
student_percentage_gaps AS (
  SELECT t.student_id FROM student_totals t
  WHERE t.total>0 AND NOT EXISTS (
      SELECT 1 FROM public.grade_settings g WHERE g.school_id=1
        AND floor(t.marks*100.0/t.total)
           BETWEEN g.min_percentage AND g.max_percentage)
)
SELECT json_build_object(
 'scores',(SELECT row_to_json(score_rollup) FROM score_rollup),
 'firstTerm',(SELECT row_to_json(term_rollup) FROM term_rollup),
 'firstTermCompleteness',(SELECT json_build_object(
     'missingEntries',(SELECT count(*) FROM missing_subjects),
     'affectedStudents',(SELECT count(DISTINCT student_id) FROM missing_subjects),
     'unmappedRecordedSubjects',(SELECT count(*) FROM unmapped_results),
     'duplicateStudentSubjects',(SELECT count(*) FROM duplicate_scores),
     'subjectGradeBandGaps',(SELECT count(*) FROM subject_percentage_gaps),
     'studentGradeBandGaps',(SELECT count(*) FROM student_percentage_gaps))),
 'subjectEvidence',(SELECT row_to_json(subject_rollup) FROM subject_rollup),
 'formalReviewEvents',(SELECT COUNT(*) FROM public.school_academic_approval_events
   WHERE school_id=1 AND exam_id=9)
)::text
"""

def execute(args: list[str], timeout=20) -> subprocess.CompletedProcess:
    return subprocess.run(args, capture_output=True, text=True,
                          timeout=timeout, check=False, env={**os.environ, "LC_ALL": "C"})

def probe_json(cmd: list[str]) -> dict:
    p=execute(cmd)
    if p.returncode:
        return {"status":"FAIL","error":(p.stderr or p.stdout).strip()[:210]}
    try:
        return json.loads(p.stdout.strip().splitlines()[-1])
    except (ValueError,IndexError):
        return {"status":"FAIL","error":"NON_JSON_VERIFIER_OUTPUT"}

def public_http_code(url: str) -> int:
    p=execute(["curl","-sSL","--max-time","12","-o","/dev/null","-w","%{http_code}",url])
    try:
        return int(p.stdout.strip()) if p.returncode==0 else 0
    except ValueError:
        return 0

def metric_read_only() -> dict:
    # runuser DROPS root to postgres under systemd NoNewPrivileges=yes.
    # sudo's PAM/audit plugin is incompatible with that sandbox and MUST NOT be used.
    p=execute(["/usr/sbin/runuser","-u","postgres","--","/usr/bin/psql","-X","-At","-v","ON_ERROR_STOP=1",
               "-d","apexos","-c","BEGIN TRANSACTION READ ONLY;\n"+READ_ONLY_SQL+";\nCOMMIT;"],timeout=20)
    if p.returncode:
        raise RuntimeError("READ_ONLY_DB_AUDIT_FAILED: "+(p.stderr or p.stdout)[:200])
    lines=[line for line in p.stdout.splitlines() if line.startswith("{")]
    if len(lines)!=1:
        raise RuntimeError("READ_ONLY_DB_MISSING_METRICS")
    return json.loads(lines[0])

def evaluate(health:dict,previous:dict|None) -> tuple[str,list[str]]:
    issues=[]
    if health["appHTTP"]!=200 or health["apiHTTP"]!=200:
        issues.append("PUBLIC_APP_OR_API_UNHEALTHY")
    for name in ("resultCards","marks"):
        if health["checks"][name].get("status")!="PASS":
            issues.append(name.upper()+"_RELEASE_GUARD_FAILED")
    # The Diary verifier publishes prePromotionDecision, not a generic status.
    if health["checks"]["diary"].get("prePromotionDecision")!="PASS_DIARY_ACTIVE_CONTROLLER_PRESERVATION_ONLY":
        issues.append("DIARY_RELEASE_GUARD_FAILED")
    if health["checks"]["resultCards"].get("distinctPremiumTemplates")!=10:
        issues.append("TEN_PREMIUM_THEMES_NOT_PROVEN")

    metrics=health["metrics"]
    if metrics["scores"]["invalid_rows"]>0:
        issues.append("INVALID_SCORED_MARKS_DETECTED")
    if metrics["subjectEvidence"]["inconsistent_configurations"]>0:
        issues.append("SUBJECT_MAXIMUM_CONFLICT_DETECTED")
    diagnostics=metrics.get("firstTermCompleteness",{})
    if diagnostics.get("duplicateStudentSubjects",0)>0:
        issues.append("DUPLICATE_STUDENT_SUBJECT_RESULT")
    if diagnostics.get("subjectGradeBandGaps",0)>0 or diagnostics.get("studentGradeBandGaps",0)>0:
        issues.append("GRADE_BAND_COVERAGE_REGRESSION")
    if previous:
        old=previous.get("metrics",{}).get("scores",{})
        if metrics["scores"]["total_score_rows"]<old.get("total_score_rows",0):
            issues.append("SAVED_RESULT_ROW_COUNT_DROPPED_SINCE_PRIOR_CHECK")
        if metrics["scores"]["school_count"]<old.get("school_count",0):
            issues.append("RESULT_TENANT_COUNT_DROPPED_SINCE_PRIOR_CHECK")
    return ("CRITICAL" if issues else "OPERATIONAL"),issues

def write_receipt(path:Path,object:dict) -> None:
    path.parent.mkdir(parents=True,exist_ok=True)
    fd,tmp=tempfile.mkstemp(prefix=".assps-audit-",dir=path.parent)
    try:
        os.fchmod(fd,0o600)
        with os.fdopen(fd,"w",encoding="utf-8") as f:
            json.dump(object,f,ensure_ascii=False,sort_keys=True,indent=2)
            f.write("\n")
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp,path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)

def main() -> int:
    parser=argparse.ArgumentParser()
    parser.add_argument("--receipt",default="/var/lib/assps/technical-self-verification/latest.json")
    parser.add_argument("--no-write",action="store_true")
    args=parser.parse_args()
    receipt=Path(args.receipt)
    previous=None
    if receipt.exists():
        try: previous=json.loads(receipt.read_text())
        except (OSError,ValueError): previous=None
    try:
        site=SITE.read_text()
        matches=re.findall(r"^\s*root\s+(/var/www/assps-[^;]+);",site,re.M)
        if not matches:
            raise RuntimeError("STATIC_ROOT_NOT_VERIFIABLE")
        dist=Path(matches[0])
        if not dist.is_dir() or not (dist/"index.html").is_file():
            raise RuntimeError("STATIC_ROOT_MISSING")
        checks={
          "resultCards":probe_json(["node",str(V3_GUARD),"--dist",str(dist)]),
          "diary":probe_json(["node",str(DIARY_GUARD),"--dist",str(dist)]),
          "marks":probe_json(["node",str(MARKS_GUARD),"--dist",str(dist)])
        }
        raw=metric_read_only()
        metric={
          "scores":{
            "total_score_rows":int(raw["scores"]["total_score_rows"]),
            "actual_zeros":int(raw["scores"]["actual_zeros"]),
            "school_count":int(raw["scores"]["school_count"]),
            "invalid_rows":int(raw["scores"]["invalid_rows"])},
          "firstTerm":{
            "first_term_rows":int(raw["firstTerm"]["first_term_rows"]),
            "first_term_students":int(raw["firstTerm"]["first_term_students"])},
          "firstTermCompleteness":{
            k:int(value) for k,value in raw["firstTermCompleteness"].items()},
          "subjectEvidence":{
            k:int(value) for k,value in raw["subjectEvidence"].items()},
          "formalReviewEvents":int(raw["formalReviewEvents"])
        }
        data={
           "schemaVersion":1,
           "observedUTC":dt.datetime.now(dt.timezone.utc).isoformat(),
           "staticRoot":str(dist),
           "publicIndexSHA256":hashlib.sha256((dist/"index.html").read_bytes()).hexdigest(),
           "appHTTP":public_http_code(APP_URL),
           "apiHTTP":public_http_code(API_URL),
           "checks":checks,"metrics":metric,
           "principalInstitutionalAcceptance":"ACKNOWLEDGED_CARRY_FORWARD",
           "printerHardwareAcceptance":"RICOH_MP_C307_OWNER_ACCEPTED_CARRY_FORWARD",
           "subjectMaximumVerification":"MACHINE_EVIDENCE_ONLY_NOT_INDEPENDENT_FACULTY_REVIEW",
           "realFacultyRevisionApproval":"NO_AUTOMATIC_SIGNING",
           "productionMutations":False,
           "printerJobsDispatched":0
        }
        data["decision"],data["criticalIssues"]=evaluate(data,previous)
    except Exception as exc:
        data={"schemaVersion":1,
              "observedUTC":dt.datetime.now(dt.timezone.utc).isoformat(),
              "decision":"CRITICAL",
              "criticalIssues":["AUDIT_EXECUTION_FAILURE"],
              "error":str(exc)[:300],
              "productionMutations":False,"printerJobsDispatched":0}
    if not args.no_write:
        write_receipt(receipt,data)
    print(json.dumps(data,sort_keys=True,separators=(",",":")))
    return 0 if data["decision"]=="OPERATIONAL" else 3

if __name__=="__main__":
    sys.exit(main())
