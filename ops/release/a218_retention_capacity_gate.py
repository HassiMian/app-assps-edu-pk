#!/usr/bin/env python3
"""A218: non-destructive release-capacity and archive-retention decision gate.

No cleanup or retention changes can be triggered via this script.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess

THRESHOLD_GIB=16.0
MONITORED_ROOT=Path("/root/workspace")
LATEST_A217=Path("/root/workspace/assps-mission-20261106-a217-private/A217_MASTER_CERTIFICATION.json")
NO_TOUCH_ROOTS=(
 "/root/secure-archive",
 "/var/lib/postgresql",
 "/var/www",
 "/root/workspace/assps-mission-20261106-a217-private",
 "/root/workspace/assps-mission-20261106-a218-private",
)
CANDIDATE_NAMES=(
 "qbank-source-cache", "mavnar-a104-isolated",
 "jarvis-creative-recovery-20261013",
 "assps-mission-20261104-capacity-private",
 "apex-connect-master-20261008",
 "mavnar-a106-isolated",
 "mavnar-a102-isolated",
 "mavnar-a107-isolated",
)

def classify_candidate(path, *, is_active_owner=False, signed_owner_approval=False,
                       offhost_full_restore=False, cryptographic_backup_verified=False,
                       reversible_operation=False):
    """Exact allow-list for review-only archive planning. Never grants deletion."""
    actual=Path(path)
    try:
        root=actual.resolve(strict=True)
        within=root.parent==MONITORED_ROOT and actual.name in CANDIDATE_NAMES
    except (OSError, RuntimeError):
        within=False
    has_symlink=actual.is_symlink()
    protected=any(str(actual)==p or str(actual).startswith(p+"/") for p in NO_TOUCH_ROOTS)
    reasons=[]
    if not within or has_symlink:reasons.append("OUTSIDE_EXACT_REVIEW_CANDIDATES_OR_SYMLINK")
    if protected:reasons.append("PROTECTED_EVIDENCE_OR_SERVICE_ROOT")
    if is_active_owner:reasons.append("OWNER_STILL_ACTIVE")
    if not signed_owner_approval:reasons.append("NO_SIGNED_RETENTION_OWNER_APPROVAL")
    if not offhost_full_restore:reasons.append("NO_INDEPENDENT_OFFHOST_FULL_RESTORE")
    if not cryptographic_backup_verified:reasons.append("NO_SHA256_PROVENANCE_FOR_BACKUP")
    if not reversible_operation:reasons.append("NO_PROVEN_REVERSIBLE_OPERATION")
    return {
      "path":str(actual),"classification":"REVIEW_ONLY_NOT_DELETION",
      "blockers":reasons,"eligibleForReviewOfReversibleArchivePlan":not reasons,
      "deletionAuthorized":False
    }

def evaluate_capacity(*, disk_free_gib, offhost_full_restore=False, role_password_acl_restore=False,
                      owners_approved=False, proposed_reclaim_gib=0, has_verified_snapshot=False):
    if disk_free_gib<0 or proposed_reclaim_gib<0:raise ValueError("negative capacity")
    required=max(0,THRESHOLD_GIB-disk_free_gib)
    blockers=[]
    if disk_free_gib<THRESHOLD_GIB:blockers.append("INSUFFICIENT_ACTUAL_FREE_SPACE")
    if not offhost_full_restore:blockers.append("OFFHOST_FULL_DATA_RESTORE_MISSING")
    if not role_password_acl_restore:blockers.append("OFFHOST_ROLE_PASSWORD_ACL_RESTORE_MISSING")
    if not owners_approved:blockers.append("OWNER_RETENTION_APPROVAL_MISSING")
    if not has_verified_snapshot:blockers.append("INDEPENDENT_BACKUP_HASH_NOT_VERIFIED")
    return {"freeGiB":round(disk_free_gib,3),"targetGiB":THRESHOLD_GIB,
            "shortfallGiB":round(required,3),
            "proposedReclaimGiB":round(proposed_reclaim_gib,3),
            "reclaimEstimateNotEquivalentToFreeSpace":True,
            "release":"HOLD" if blockers else "READY_FOR_INDEPENDENT_RELEASE_REVIEW",
            "blockers":blockers,"safeToDeleteProductionOrSourceFiles":False}

def create_report():
    origin=json.loads(LATEST_A217.read_text())
    if not origin.get("observedFull40Minutes") or origin.get("mainMonitorCyclesFailed")!=0 or origin.get("release")!="HOLD":
        raise ValueError("A217 baseline failed or not HOLD")
    actual_free=shutil.disk_usage("/").free/1024**3
    root=MONITORED_ROOT
    candidates=[classify_candidate(root/name) for name in CANDIDATE_NAMES if (root/name).exists()]
    assert all(not x["deletionAuthorized"] for x in candidates)
    historic=origin.get("offhostDisasterRestoreCertified") is True
    review=evaluate_capacity(disk_free_gib=actual_free,offhost_full_restore=historic)
    mount=subprocess.run(["findmnt","-rn","-o","TARGET,FSTYPE,SOURCE"],capture_output=True,text=True,timeout=10)
    mounts=[]
    if mount.returncode==0:
        for line in mount.stdout.splitlines():
            fields=line.split(maxsplit=2)
            if len(fields)==3 and not fields[0].startswith(("/proc","/sys","/dev","/run")):
                mounts.append({"target":fields[0],"fsType":fields[1],"sourceType":"block" if fields[2].startswith("/dev/") else "other"})
    report={
      "mission":"A218_CAPACITY_RETENTION_NONDESTRUCTIVE",
      "checkedUtc":datetime.now(timezone.utc).isoformat(),
      "a217EvidenceSha256":hashlib.sha256(LATEST_A217.read_bytes()).hexdigest(),
      "releaseDecision":review,
      "candidateReview":candidates,
      "mountTypes":mounts,
      "candidateSelectionIsNotOwnershipApproval":True,
      "neverDelete":list(NO_TOUCH_ROOTS),
      "productionWrites":0,"productionDeployments":0,"actualDeletions":0,
      "caveat":"No signed owner approval, offhost restore or content-provenance clearance has been supplied."
    }
    return report

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--out",required=True)
    args=parser.parse_args()
    report=create_report()
    path=Path(args.out)
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(report,indent=2)+"\n")
    os.chmod(path,0o600)
    r=report["releaseDecision"]
    print(json.dumps({"freeGiB":r["freeGiB"],"shortfallGiB":r["shortfallGiB"],
                      "candidateCount":len(report["candidateReview"]),
                      "release":r["release"],"deletions":0}))
    return 3 if r["release"]=="HOLD" else 0

if __name__=="__main__":
    try:raise SystemExit(main())
    except (OSError,RuntimeError,ValueError) as e:
        print("A218 capacity evidence invalid: "+type(e).__name__+": "+str(e))
        raise SystemExit(2)
