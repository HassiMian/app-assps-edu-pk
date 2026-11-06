#!/usr/bin/env python3
"""ASSPS A220 non-executable disk write-budget admission guard.

Neither this module nor its CLI runs build/deploy/backup/restore/cleanup.
Production authorization cannot be supplied from CLI flags or a JSON fixture.
"""
import argparse
from datetime import datetime, timezone
import json
import math
import os
from pathlib import Path
import shutil
import sys

GiB = 1024 ** 3
MiB = 1024 ** 2
MIN_FREE_GIB = 16
MIN_FREE_BYTES = MIN_FREE_GIB * GiB
CRITICAL_BYTES = 4 * GiB
EMERGENCY_BYTES = 2 * GiB
MAX_BUDGET_BYTES = 2**63-1
OPERATIONS = (
    "frontend-build",
    "database-backup",
    "database-restore",
    "production-deploy",
    "paper-import",
    "dependency-install",
    "source-archive",
)
WORK_ROOT=Path("/root/workspace/assps-mission-20261106-a220-private")

def bounded_integer(value, *, name):
    if isinstance(value,bool) or not isinstance(value,int):
        raise ValueError(f"{name} must be a nonnegative integer count of bytes")
    if value < 0 or value > MAX_BUDGET_BYTES:
        raise ValueError(f"{name} out of range")
    return value

def checked_total(values):
    total=0
    for name,v in values.items():
        v=bounded_integer(v,name=name)
        if MAX_BUDGET_BYTES-total < v:
            raise OverflowError("Budget overflow")
        total+=v
    return total

def classify_capacity(free_bytes):
    free_bytes=bounded_integer(free_bytes,name="free_bytes")
    if free_bytes<EMERGENCY_BYTES:
        return "EMERGENCY"
    if free_bytes<CRITICAL_BYTES:
        return "CRITICAL"
    if free_bytes<MIN_FREE_BYTES:
        return "INSUFFICIENT_RELEASE_RESERVE"
    return "RESERVE_MET_WITHOUT_OPERATION_BUDGET"

def evaluate_admission(*, operation, disk_free_bytes, planned_bytes, staging_bytes=0,
                       rollback_bytes=0, wal_growth_bytes=0, scratch_bytes=0,
                       independently_restored_offhost=False,
                       authorized_source_owner=False,
                       authenticated_release_owner=False,
                       proven_rollback=False,
                       observed_io_full_avg10=0.0):
    if operation not in OPERATIONS:
        raise ValueError("Unknown operation")
    if isinstance(observed_io_full_avg10,bool) or not isinstance(observed_io_full_avg10,(int,float)) or not math.isfinite(observed_io_full_avg10) or not 0<=observed_io_full_avg10<=100:
        raise ValueError("Invalid IO full avg10")
    disk_free_bytes=bounded_integer(disk_free_bytes,name="disk_free_bytes")
    pieces={
        "plannedBytes":planned_bytes,
        "stagingBytes":staging_bytes,
        "rollbackBytes":rollback_bytes,
        "walGrowthBytes":wal_growth_bytes,
        "scratchBytes":scratch_bytes
    }
    worst_case=checked_total(pieces)
    if MAX_BUDGET_BYTES-MIN_FREE_BYTES < worst_case:
        raise OverflowError("Required capacity exceeds maximum representable range")
    required=worst_case+MIN_FREE_BYTES
    shortfall=max(0,required-disk_free_bytes)
    failed=[]
    if disk_free_bytes < MIN_FREE_BYTES:
        failed.append("ACTUAL_DISK_FREE_BELOW_RELEASE_RESERVE")
    if disk_free_bytes < required:
        failed.append("WORST_CASE_WRITE_BUDGET_NOT_AVAILABLE")
    if observed_io_full_avg10>=20:
        failed.append("SEVERE_IO_PRESSURE")
    if not independently_restored_offhost:
        failed.append("OFFHOST_FULL_RESTORE_NOT_PROVEN")
    if not authorized_source_owner:
        failed.append("SOURCE_OWNER_NOT_AUTHENTICATED")
    if not authenticated_release_owner:
        failed.append("CORE_RELEASE_OWNER_NOT_AUTHENTICATED")
    if not proven_rollback:
        failed.append("INDEPENDENT_ROLLBACK_NOT_PROVEN")
    return {
        "operation": operation,
        "diskCapacityState": classify_capacity(disk_free_bytes),
        "filesystemFreeBytes": disk_free_bytes,
        "minimumFreeReserveBytes": MIN_FREE_BYTES,
        "operationEstimatedPeakBytes": worst_case,
        "minimumActualFreeBytesBeforeOperation": required,
        "shortfallBytes": shortfall,
        "estimatesAreNotObservedWrites": True,
        "assumptionsMustBeIndependentlyReviewed": True,
        "requestedBudget": pieces,
        "blockingEvidence": failed,
        "releaseReviewState": "HOLD" if failed else "ELIGIBLE_FOR_SEPARATE_HUMAN_REVIEW_ONLY",
        "productionExecutionAuthorized": False,
        "deletionAuthorized": False,
        "scriptPerformsNoPlannedOperation": True
    }

def parse_io(path="/proc/pressure/io"):
    rows=Path(path).read_text().splitlines()
    for line in rows:
        if line.startswith("full "):
            for kv in line.split()[1:]:
                key, val=kv.split("=",1)
                if key=="avg10":
                    value=float(val)
                    if not math.isfinite(value) or value<0 or value>100:
                        raise ValueError("Invalid IO PSI avg10")
                    return value
    raise ValueError("Missing IO PSI full avg10")

def parse_mib(value):
    # User-specified untrusted integer estimate, not source/backup data
    if isinstance(value,bool) or not isinstance(value,int) or value<0:
        raise ValueError("MiB estimate must be a nonnegative integer")
    if value > MAX_BUDGET_BYTES//MiB:
        raise OverflowError("MiB estimate exceeds max")
    return value*MiB

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--operation",required=True,choices=OPERATIONS)
    parser.add_argument("--planned-mib",type=int,required=True)
    parser.add_argument("--staging-mib",type=int,default=0)
    parser.add_argument("--rollback-mib",type=int,default=0)
    parser.add_argument("--wal-mib",type=int,default=0)
    parser.add_argument("--scratch-mib",type=int,default=0)
    parser.add_argument("--out",required=True)
    args=parser.parse_args()
    out=Path(args.out).resolve()
    # Hard-coded audit evidence boundary: refuse writing outside the private audit tree
    if out.parent != WORK_ROOT or out.is_symlink() or not out.name.startswith("A220_WRITE_BUDGET_") or out.suffix != ".json":
        raise ValueError("Audit report output must be a direct file in the dedicated private evidence directory")
    actual=shutil.disk_usage("/").free
    decision=evaluate_admission(
        operation=args.operation,
        disk_free_bytes=actual,
        planned_bytes=parse_mib(args.planned_mib),
        staging_bytes=parse_mib(args.staging_mib),
        rollback_bytes=parse_mib(args.rollback_mib),
        wal_growth_bytes=parse_mib(args.wal_mib),
        scratch_bytes=parse_mib(args.scratch_mib),
        observed_io_full_avg10=parse_io()
        # No CLI flag can assert source owner, independent offhost recovery, rollback or release authority.
    )
    artifact={"mission":"A220_READONLY_DISK_WRITE_BUDGET_ADMISSION",
              "checkedUtc":datetime.now(timezone.utc).isoformat(),
              "readOnlySourceEvidence":True,
              "report":decision,
              "operationAttempted":False,
              "productionDatabaseWrites":0,
              "deploymentChanges":0,
              "deletedFiles":0}
    temp=out.with_suffix(".tmp")
    temp.write_text(json.dumps(artifact,indent=2)+"\n")
    os.chmod(temp,0o600)
    os.replace(temp,out)
    print(json.dumps({
        "operation":args.operation,
        "freeGiB":round(actual/GiB,3),
        "requiredGiB":round(decision["minimumActualFreeBytesBeforeOperation"]/GiB,3),
        "shortfallGiB":round(decision["shortfallBytes"]/GiB,3),
        "releaseReviewState":decision["releaseReviewState"],
        "blockers":len(decision["blockingEvidence"])
    }))
    return 3 if decision["releaseReviewState"]=="HOLD" else 0

if __name__=="__main__":
    try:sys.exit(main())
    except (ValueError,OverflowError,OSError,RuntimeError) as ex:
        print(f"A220 fail-closed: {type(ex).__name__}: {str(ex)}",file=sys.stderr)
        sys.exit(2)
