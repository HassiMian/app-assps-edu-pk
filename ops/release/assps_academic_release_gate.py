#!/usr/bin/env python3
"""Read-only ASSPS School 1 release evidence, never an approval or deploy tool."""
import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

SQL_DIR = Path(__file__).resolve().parent / "queries"
BASELINE_RESULTS_SHA256 = "420c6cbd4c433906156e771449f6ff40ef48efce6e53ca591692dace1aad0539"
PUBLISHED_GATE = Path("/root/workspace/assps-mission-20261106-a213-private/A213_RELEASE_GATE_RESULT.json")
EVIDENCE_SQL = r"""
BEGIN READ ONLY;
SELECT 'RESULTS|'||count(*)||'|'||encode(public.digest(string_agg(to_jsonb(r)::text,E'\n' ORDER BY r.id),'sha256'),'hex') FROM exam_results r WHERE r.school_id=1 AND r.exam_id=9;
SELECT 'VAULT|'||status||'|'||count(*) FROM paper_vault WHERE school_id=1 AND deleted_at IS NULL GROUP BY status ORDER BY status;
SELECT 'STORAGE|'||(SELECT count(*) FROM saved_papers WHERE school_id=1)||'|'||(SELECT count(*) FROM paper_documents WHERE school_id=1 AND deleted_at IS NULL)||'|'||(SELECT count(*) FROM assessment_papers WHERE school_id=1)||'|'||(SELECT count(*) FROM assessment_paper_revisions WHERE school_id=1);
SELECT 'ASSESSMENTS|'||count(DISTINCT e.id)||'|'||count(DISTINCT x.id)||'|'||count(DISTINCT r.id) FROM exams e LEFT JOIN exam_subjects x ON x.school_id=e.school_id AND x.exam_id=e.id AND x.is_active=true LEFT JOIN exam_results r ON r.school_id=e.school_id AND r.exam_id=e.id WHERE e.school_id=1 AND e.id IN(14,15,16,17);
SELECT 'ASSESSMENT5|'||count(*) FROM exams WHERE school_id=1 AND lower(btrim(name))='assessment 5';
SELECT 'APPROVED|'||count(*) FILTER(WHERE approval_status='approved') FROM exam_subjects WHERE school_id=1;
SELECT 'RLS|'||count(*) FILTER(WHERE c.relforcerowsecurity)||'|'||count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN('r','p') AND c.relrowsecurity AND pg_get_userbyid(c.relowner)='apexos_user';
ROLLBACK;
"""

def query(sql: str) -> list[str]:
    if not sql.lstrip().startswith("BEGIN READ ONLY;") or not sql.rstrip().endswith("ROLLBACK;"):
        raise ValueError("Only explicitly read-only SQL accepted")
    result = subprocess.run(
        ["runuser", "-u", "postgres", "--", "psql", "-X", "-q", "-At", "-v", "ON_ERROR_STOP=1", "-d", "apexos"],
        input=sql, text=True, capture_output=True, check=True, timeout=30,
    )
    return [line for line in result.stdout.splitlines() if line.strip()]

def decode_prefixed(lines, prefix, fields):
    rows = []
    for line in lines:
        if not line.startswith(prefix + "|"):
            continue
        parts = line.split("|")
        if len(parts) != fields + 1:
            raise ValueError("Unexpected evidence field count")
        rows.append(parts[1:])
    return rows

def parse_cohorts(lines):
    rows = decode_prefixed(lines, "SOURCE", 6)
    if not rows:
        raise ValueError("No live student cohort evidence")
    parsed = []
    seen = set()
    for grade, section, n, assignments, reviewed, subjects in rows:
        key = (grade, section)
        if not grade.strip() or not section.strip() or key in seen:
            raise ValueError("Ambiguous or duplicate class-section identity")
        seen.add(key)
        ints = [int(x) for x in (n, assignments, reviewed, subjects)]
        if any(x < 0 for x in ints) or ints[0] == 0:
            raise ValueError("Malformed cohort count")
        parsed.append(dict(className=grade, section=section, students=ints[0],
                           activeAssignments=ints[1], reviewedTimetableRows=ints[2],
                           verifiedSubjects=ints[3]))
    return sorted(parsed, key=lambda x: (x["className"], x["section"]))

def get_live_snapshot():
    cohorts = parse_cohorts(query((SQL_DIR / "a214_cohort_evidence.sql").read_text()))
    config = decode_prefixed(query((SQL_DIR / "a214_subject_config.sql").read_text()), "REVIEW", 4)
    lines = query(EVIDENCE_SQL)
    storage = decode_prefixed(lines, "STORAGE", 4)
    assessments = decode_prefixed(lines, "ASSESSMENTS", 3)
    a5 = decode_prefixed(lines, "ASSESSMENT5", 1)
    approved = decode_prefixed(lines, "APPROVED", 1)
    results = decode_prefixed(lines, "RESULTS", 2)
    rls = decode_prefixed(lines, "RLS", 2)
    vault = decode_prefixed(lines, "VAULT", 2)
    if any(len(x) != 1 for x in [storage, assessments, a5, approved, results, rls]):
        raise ValueError("Missing or ambiguous live PostgreSQL aggregate")
    try:
        published = json.loads(PUBLISHED_GATE.read_text())
    except (OSError, ValueError):
        published = {}
    disk = shutil.disk_usage("/")
    return {
        "schoolId": 1, "cohorts": cohorts, "configuredSubjectRows": len(config),
        "storedPaperCounts": [int(x) for x in storage[0]],
        "assessment1to4": [int(x) for x in assessments[0]],
        "assessment5Headers": int(a5[0][0]),
        "approvedSubjectOfferings": int(approved[0][0]),
        "firstTermRows": int(results[0][0]),
        "firstTermSHA256": results[0][1],
        "paperVault": {name: int(count) for name, count in vault},
        "appRoleOwnedProtectedRls": {"forceRls": int(rls[0][0]), "total": int(rls[0][1])},
        "liveAttendanceUnsafeShells": published.get("effectiveLiveAttendanceModuleUnsafeShells"),
        "attendanceCandidateDeployed": published.get("candidateBuildDeployed") is True,
        "principalTeacherAttendanceAccepted": published.get("actualPrincipalTeacherAttendanceAcceptance") is True,
        "attendancePublishedMatrixCertified": published.get("publishedFourShellCandidateMatrixCertified") is True,
        "rollbackProven": published.get("rollbackProven") is True,
        "diskFreeGiB": round(disk.free / (1024**3), 3),
        # No source-of-truth observed for these external approvals: remain unverified (fail closed).
        "originalBrowser49Verified": False,
        "independentOffhostFullRestoreCertified": False,
        "staffSignaturesVerified": False,
        "repositoryOwnershipCertified": False,
        "appDatabaseOwnerDdlPrivilegeRetired": False,
        "collectedAtUtc": dt.datetime.now(dt.timezone.utc).isoformat(),
    }

def evaluate(d):
    blockers = []
    def require(ok, code, details):
        if not ok:
            blockers.append({"id": code, "details": details})
    cohorts = d["cohorts"]
    missing = [c for c in cohorts if c["verifiedSubjects"] == 0]
    uncovered = sum(c["students"] for c in missing)
    require(not missing, "TEACHER_SCOPE_EVIDENCE", f"{uncovered} active students across {len(missing)} class-sections lack verified teacher-subject evidence")
    require(d["approvedSubjectOfferings"] > 0, "ACADEMIC_SUBJECT_APPROVAL", "No approved active school subject offerings")
    require(d["assessment1to4"][1] > 0 and d["assessment1to4"][2] > 0,
            "ASSESSMENT_1_4_OFFERINGS_AND_MARKS", "Assessment headers are not equivalent to enrolled offerings and results")
    require(d["assessment5Headers"] > 0, "ASSESSMENT_5_SOURCE", "Assessment 5 is absent from authoritative exams")
    require(d["firstTermRows"] == 1854 and d["firstTermSHA256"] == BASELINE_RESULTS_SHA256,
            "HISTORIC_RESULTS_INTEGRITY", "First Term 1854 rows/hash no longer match certified baseline")
    require(d["originalBrowser49Verified"] is True, "ORIGINAL_PAPERS_UNVERIFIED",
            "Original workstation browser collection of 49 papers never directly certified")
    require(d["liveAttendanceUnsafeShells"] == 0 and d["attendanceCandidateDeployed"] is True and
            d["principalTeacherAttendanceAccepted"] is True and
            d["attendancePublishedMatrixCertified"] is True and d["rollbackProven"] is True,
            "LIVE_ATTENDANCE_ACCEPTANCE", "Published Pre Nine/Nine attendance, acceptance or rollback unverified")
    require(d["independentOffhostFullRestoreCertified"] is True, "OFFHOST_RESTORE",
            "Independent full data + roles + ACL restore not certified")
    require(d["diskFreeGiB"] >= 16, "DISK_HEADROOM", "Root disk free space below 16 GiB")
    require(d["staffSignaturesVerified"] is True, "STAFF_SIGNOFF", "Independent authorized academic signoff not received")
    require(d["repositoryOwnershipCertified"] is True, "REPOSITORY_PROVENANCE", "Canonical repository ownership/merge/push not certified")
    rls = d["appRoleOwnedProtectedRls"]
    require(rls["forceRls"] == rls["total"], "RLS_FORCE", "Application-owned protected tables lack FORCE RLS")
    require(d["appDatabaseOwnerDdlPrivilegeRetired"] is True, "APP_DDL_OWNERSHIP",
            "Generic app login still owns protected database tables; DDL risk unresolved")
    return {"release": "HOLD" if blockers else "READY_FOR_INDEPENDENT_SIGNOFF",
            "blocked": len(blockers), "blockers": blockers,
            "activeStudents": sum(c["students"] for c in cohorts),
            "classSections": len(cohorts), "studentsMissingScope": uncovered,
            "missingClassSections": missing, "configuredRowsNotApproval": d["configuredSubjectRows"]}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    out = Path(args.out)
    snapshot = get_live_snapshot()
    verdict = evaluate(snapshot)
    payload = {"mission": "A214_ACADEMIC_AUTHORITY_READONLY", "evidence": snapshot, "result": verdict,
               "productionWrites": 0, "productionDeployments": 0}
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    os.chmod(out, 0o600)
    print(json.dumps({"result": verdict["release"], "blockers": verdict["blocked"],
                      "students": verdict["activeStudents"], "uncovered": verdict["studentsMissingScope"],
                      "saved": str(out)}, sort_keys=True))
    return 3 if verdict["release"] == "HOLD" else 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        print(f"A214 cannot certify: {type(exc).__name__}: {exc}", file=sys.stderr)
        sys.exit(2)
