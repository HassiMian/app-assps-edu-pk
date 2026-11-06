#!/usr/bin/env python3
"""Read-only emergency storage, I/O pressure, active owner and DR gate.

Never cleans, deletes, resizes, deploys or promotes any production asset.
"""
import argparse
from datetime import datetime, timezone
import json
import math
import os
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path("/root/workspace")
SRC_A217 = Path("/root/workspace/assps-mission-20261106-a217-private/A217_MASTER_CERTIFICATION.json")
SRC_A218 = Path("/root/workspace/assps-mission-20261106-a218-private/A218_MASTER_CERTIFICATION.json")
RECENT_EVENTS = Path("/root/workspace/assps-mission-20261106-a219-private/A219_40MIN_EVENTS.jsonl")
REVIEW_CANDIDATES = (
    "qbank-source-cache",
    "mavnar-a104-isolated",
    "jarvis-creative-recovery-20261013",
    "assps-mission-20261104-capacity-private",
    "apex-connect-master-20261008",
    "mavnar-a106-isolated",
    "mavnar-a107-isolated",
    "mavnar-a119-isolated",
    "argus-a118-release-integrity-isolated",
)
MIN_RELEASE_HEADROOM_GIB = 16.0
CRITICAL_CAPACITY_GIB = 4.0
EMERGENCY_CAPACITY_GIB = 2.0

def disk_severity(free_gib):
    if free_gib is None or not math.isfinite(free_gib) or free_gib < 0:
        raise ValueError("Invalid capacity evidence")
    if free_gib < EMERGENCY_CAPACITY_GIB:
        return "EMERGENCY"
    if free_gib < CRITICAL_CAPACITY_GIB:
        return "CRITICAL"
    if free_gib < MIN_RELEASE_HEADROOM_GIB:
        return "BELOW_RELEASE_RESERVE"
    return "CAPACITY_RESERVE_MET_ONLY"

def pressure_severity(full_avg10):
    if full_avg10 is None or not math.isfinite(full_avg10) or full_avg10 < 0 or full_avg10 > 100:
        raise ValueError("Invalid IO pressure")
    if full_avg10 >= 20:
        return "SEVERE_IO_CONTENTION_HEURISTIC"
    if full_avg10 >= 5:
        return "ELEVATED_IO_CONTENTION_HEURISTIC"
    return "NOT_ELEVATED_BY_THIS_HEURISTIC"

def evaluate(*, free_gib, io_full_avg10, restore_offhost=False, role_passwords_acl_verified=False,
             principal_attendance_approved=False, original_papers_authorized=False,
             staff_subject_approvals=False, owner_retention_approved=False):
    severity = disk_severity(free_gib)
    pressure = pressure_severity(io_full_avg10)
    blockers = []
    if free_gib < MIN_RELEASE_HEADROOM_GIB:
        blockers.append("ACTUAL_DISK_FREE_BELOW_16_GIB")
    if not restore_offhost:
        blockers.append("INDEPENDENT_OFFHOST_RESTORE_MISSING")
    if not role_passwords_acl_verified:
        blockers.append("RECOVERED_ROLES_PASSWORDS_AND_ACL_UNPROVEN")
    if not principal_attendance_approved:
        blockers.append("LIVE_PRINCIPAL_ATTENDANCE_APPROVAL_MISSING")
    if not original_papers_authorized:
        blockers.append("ORIGINAL_PAPERS_PORTABLE_RECOVERY_AND_OWNER_APPROVAL_MISSING")
    if not staff_subject_approvals:
        blockers.append("SCHOOL_TEACHER_SUBJECT_AUTHORIZATION_MISSING")
    if not owner_retention_approved:
        blockers.append("RETENTION_OWNER_APPROVAL_MISSING")
    return {
        "actualFreeGiB": round(free_gib,3),
        "releaseHeadroomTargetGiB": MIN_RELEASE_HEADROOM_GIB,
        "actualHeadroomShortfallGiB": round(max(0, MIN_RELEASE_HEADROOM_GIB-free_gib),3),
        "diskSeverity": severity,
        "ioPressureHeuristic": pressure,
        "iOFullAvg10Percent": round(io_full_avg10,2),
        "blockers": blockers,
        "blockerCount": len(blockers),
        "release": "HOLD" if blockers else "READY_FOR_INDEPENDENT_SIGNOFF_ONLY",
        "canDeleteSourceFiles": False,
        "canAutodeploy": False
    }

def get_psi(path="/proc/pressure/io"):
    lines = Path(path).read_text().splitlines()
    result={}
    for line in lines:
        pair=line.split()
        if not pair or pair[0] not in ("some","full"):
            continue
        metrics={}
        for field in pair[1:]:
            key, value=field.split("=",1)
            if key in ("avg10","avg60","avg300"):
                metrics[key]=float(value)
        result[pair[0]]=metrics
    if "full" not in result or "avg10" not in result["full"]:
        raise ValueError("Missing PSI full avg10 evidence")
    return result

def monitor_history(events=RECENT_EVENTS):
    first=None; last=None; total=0; bad=0
    if not events.is_file():
        return {"samples":0,"validTrend":False,"trendNotAForecast":True}
    with events.open() as f:
        for line in f:
            if not line.strip(): continue
            row=json.loads(line)
            if row.get("pass") is not True:
                bad+=1
                continue
            details=row.get("data",{})
            if "freeGiB" not in details:
                continue
            free=float(details["freeGiB"])
            if free < 0:
                raise ValueError("Invalid monitoring free bytes")
            if first is None:
                first=free
            last=free
            total+=1
    return {"samples":total,"failedCycles":bad,"firstFreeGiB":first,"latestFreeGiB":last,
            "netObservedGiB":round(last-first,3) if total else None,
            "validTrend":total>=2,"trendNotAForecast":True}

def get_live_dir_refs(candidates, proc=Path("/proc")):
    """Only count /proc cwd refs. No command-line arguments, IP, secrets or files read."""
    found={str(p):0 for p in candidates}
    for item in proc.iterdir():
        if not item.name.isdigit():
            continue
        try:
            current=os.readlink(item/"cwd")
        except (OSError,PermissionError):
            continue
        for folder in found:
            if current==folder or current.startswith(folder+"/"):
                found[folder]+=1
    return found

def get_registered_worktrees():
    p=subprocess.run(["git","-C","/root/workspace/assps-term-planner-mission-20261015",
                      "worktree","list","--porcelain"],
                     capture_output=True,text=True,timeout=12,check=True)
    return [x[9:] for x in p.stdout.splitlines() if x.startswith("worktree ")]

def inspect_owner_paths(candidate_names=REVIEW_CANDIDATES):
    candidates=[ROOT/x for x in candidate_names if (ROOT/x).exists()]
    refs=get_live_dir_refs(candidates)
    trees=get_registered_worktrees()
    rows=[]
    for folder in candidates:
        s=str(folder)
        registered=any(s==t or t.startswith(s+"/") for t in trees)
        active=refs[s]>0
        rows.append({
            "rootName": folder.name,
            "symbolicLink": folder.is_symlink(),
            "activeWorkingDirectoryReferences": refs[s],
            "registeredGitWorktreeOrParent": registered,
            "ownerSignatureVerified": False,
            "offhostCopyAndRestoreVerified": False,
            "reconstructibleClaimNotVerified": True,
            "risk": "LIVE_PROCESS_REFERENCE" if active else ("GIT_WORKTREE_REFERENCE" if registered else "UNVERIFIED_OWNER"),
            "deletionAuthorized": False
        })
    return rows

def certify_inputs(a217, a218):
    if a217.get("release")!="HOLD" or not a217.get("observedFull40Minutes"):
        raise ValueError("A217 source certification unavailable")
    if a218.get("release")!="HOLD" or not a218.get("observedFull40Minutes"):
        raise ValueError("A218 source certification unavailable")
    return {
        "sameHostRoleOwnerAclDrillVerified": bool(a217.get("roleShapeObjectOwnerAndEffectiveAclParity")),
        "independentOffhostFullDrVerified": bool(a217.get("offhostDisasterRestoreCertified")),
        "rolePasswordsRecovered": bool(a217.get("rolePasswordsRestored"))
    }

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--out",required=True)
    args=ap.parse_args()
    a217=json.loads(SRC_A217.read_text())
    a218=json.loads(SRC_A218.read_text())
    dr=certify_inputs(a217,a218)
    free=shutil.disk_usage("/").free/1024**3
    io=get_psi()
    verdict=evaluate(free_gib=free,io_full_avg10=io["full"]["avg10"],
                     restore_offhost=dr["independentOffhostFullDrVerified"],
                     role_passwords_acl_verified=dr["rolePasswordsRecovered"])
    report={
        "mission":"A219_IO_PRESSURE_DISK_GROWTH_AND_OWNER_RELEASE_GATE",
        "checkedUtc":datetime.now(timezone.utc).isoformat(),
        "diskVerdict":verdict,
        "livePsi":io,"history":monitor_history(),"disasterRecovery":dr,
        "ownerPathReview":inspect_owner_paths(),
        "productionWrites":0,"productionDeployments":0,"actualDeletions":0,
        "limits":["Full I/O pressure heuristic is an operational warning, not diagnostic attribution.",
                  "No process currently using a directory does not prove deletion safety.",
                  "Offhost restore or owner approval must be independently verified, never inferred from cache names.",
                  "No database, disk partition, backup archives, or published assets were modified."]
    }
    p=Path(args.out)
    p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(json.dumps(report,indent=2)+"\n")
    os.chmod(p,0o600)
    print(json.dumps({"release":verdict["release"],"severity":verdict["diskSeverity"],
                      "freeGiB":verdict["actualFreeGiB"],"shortfallGiB":verdict["actualHeadroomShortfallGiB"],
                      "ioPressure":verdict["ioPressureHeuristic"],"liveCandidates":len(report["ownerPathReview"]),
                      "blockers":verdict["blockerCount"],"deletions":0}))
    return 3 if verdict["release"]=="HOLD" else 0

if __name__=="__main__":
    try:sys.exit(main())
    except Exception as exc:
        print("A219 failed closed: "+type(exc).__name__+": "+str(exc),file=sys.stderr)
        sys.exit(2)
