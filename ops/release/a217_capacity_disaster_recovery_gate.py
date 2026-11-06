#!/usr/bin/env python3
"""A217 read-only capacity & disaster recovery certification. No live mutations."""
from datetime import datetime, timezone
import argparse
import hashlib
import json
from pathlib import Path
import os
import shutil
import subprocess
import sys

EVIDENCE_DIR = Path("/root/workspace/assps-mission-20261106-a217-private")
FULL_RELEASE = Path(__file__).resolve().parent / "assps_a216_provenance_release_boundary.py"
DR_TEMP = Path("/tmp/assps-a217-isolated-dr-20261106")
MIN_ROOT_GIB = 16
SUGGESTED_STAGING_GIB = 8

def read_json(p):
    out = json.loads(p.read_text())
    if not isinstance(out, dict):
        raise ValueError("Evidence must be object")
    return out

def inspect(dr, school_release, windows, *, disk_free_gib, dr_temp_exists):
    blockers = []
    warnings = []
    def require(cond, code, detail):
        if not cond: blockers.append({"gate":code,"detail":detail})
    certified_same_host = (
        dr.get("fullDataRestoreCompleted") is True and
        dr.get("sourceAndRestoredDataAggregatesIdentical") is True and
        dr.get("sourceAndRestoredObjectOwnerEffectiveAclRoleShapeAndPolicyMetadataIdentical") is True and
        dr.get("metadataCanonicalRowCount") == 610 and
        dr.get("sourceCanonicalCatalogSha256") == dr.get("restoredCanonicalCatalogSha256") and
        dr.get("sourceCanonicalCatalogSha256") == dr.get("canonicalCatalogSha256") and
        dr.get("localIsolatedClusterStopped") is True and
        dr.get("temporaryClusterAndFullDataArchiveDeleted") is True and
        dr.get("productionDatabaseModifiedByRestore") is False and
        not dr_temp_exists
    )
    # The catalog digest must be a real 64-digit SHA and anchored by the supporting
    # source+clone hashes rather than accepted from any single arbitrary JSON field.
    sha = dr.get("sourceCanonicalCatalogSha256")
    if not isinstance(sha,str) or len(sha)!=64 or any(c not in "0123456789abcdef" for c in sha):
        certified_same_host = False
    require(certified_same_host, "SAME_HOST_ROLE_ACL_PARITY",
      "Same-VPS isolated data/role-shape/effective-ACL test incomplete or temporary data remains")
    require(dr.get("rolePasswordsRestoredOrTested") is True, "LOGIN_SECRET_RESTORATION",
      "Role password authentication was NOT recovered or independently exercised")
    require(dr.get("offHostRestoreCertified") is True, "FULL_OFFHOST_DR",
      "Same VPS is not an independent off-host disaster recovery destination")
    require(dr.get("crossDeviceKeyMaterialRestored") is True, "CROSS_DEVICE_KEYS",
      "Independent storage keys, recovery passphrases and decryption are not tested")
    require(disk_free_gib >= MIN_ROOT_GIB, "VPS_DISK_CAPACITY",
      f"Only {disk_free_gib:.3f} GiB available, at least {MIN_ROOT_GIB} GiB required")
    require(school_release.get("result",{}).get("release") == "READY_FOR_INDEPENDENT_HUMAN_RELEASE_REVIEW" and
            school_release.get("result",{}).get("blockerCount") == 0,
            "EXISTING_ACADEMIC_AND_ATTENDANCE_RELEASE_HOLD",
            "Previous signed original-paper, attendance, academic and DB authorization gates remain unresolved")
    check_evidence = windows.get("freeGiB")
    if not (isinstance(check_evidence,(int,float)) and 0 <= check_evidence and windows.get("independentOffhostRestorePerformed") is True
            and windows.get("postgresqlInstalled") is True and windows.get("paperOrDatabaseContentsTransferred") is True):
        warnings.append({"code":"WINDOWS_NOT_VERIFIED_AS_OFFHOST_DR_TARGET",
            "detail":"Windows machine has no demonstrated isolated PostgreSQL recovery and is low on free space"})
    if isinstance(check_evidence,(int,float)) and check_evidence < SUGGESTED_STAGING_GIB:
        warnings.append({"code":"WINDOWS_LOW_FREE_SPACE",
            "detail":f"Windows C: free {check_evidence:.3f} GiB, suggested staging safety target {SUGGESTED_STAGING_GIB} GiB"})
    return {
      "release":"HOLD" if blockers else "READY_FOR_INDEPENDENT_HUMAN_RELEASE_REVIEW",
      "blockerCount":len(blockers),"blockers":blockers,"warnings":warnings,
      "sameVpsDataAndEffectiveRoleAclDrill":"PASS" if certified_same_host else "UNVERIFIED",
      "offhostRecoveryCertified":dr.get("offHostRestoreCertified") is True,
      "rolePasswordsVerified":dr.get("rolePasswordsRestoredOrTested") is True,
      "vpsFreeGiB":round(disk_free_gib,3),
      "vpsAdditionalNeededGiB":round(max(0,MIN_ROOT_GIB-disk_free_gib),3),
      "windowsObservedFreeGiB":check_evidence,
      "productionWrites":0,"productionDeployments":0,
      "note":"Review gate only, never automatic promotion or live role migration."}

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--out",required=True)
    ap.add_argument("--school-out",required=True)
    ap.add_argument("--school-academic-out",required=True)
    a=ap.parse_args()
    source=EVIDENCE_DIR/"A217_SAME_HOST_DR_ROLE_OWNER_ACL_CERT.json"
    windows=EVIDENCE_DIR/"A217_WINDOWS_DISK_READONLY.json"
    for f in (source,windows):
        if not f.is_file():raise FileNotFoundError(str(f))
    p=subprocess.run([sys.executable,str(FULL_RELEASE),"--out",a.school_out,"--academic-out",a.school_academic_out],
                     capture_output=True,text=True,timeout=45)
    if p.returncode not in (0,3):
        raise RuntimeError("Authoritative A216 school release gate unavailable: "+p.stderr[-240:])
    school=read_json(Path(a.school_out))
    dr=read_json(source)
    w=read_json(windows)
    disk_free_gib = shutil.disk_usage("/").free/1024**3
    result=inspect(dr,school,w,disk_free_gib=disk_free_gib,dr_temp_exists=DR_TEMP.exists())
    record={
      "mission":"A217_CAPACITY_FULL_DR_RELEASE_BOUNDARY",
      "checkedUtc":datetime.now(timezone.utc).isoformat(),
      "sourceEvidenceSha256":hashlib.sha256(source.read_bytes()).hexdigest(),
      "windowsEvidenceSha256":hashlib.sha256(windows.read_bytes()).hexdigest(),
      "schoolEvidenceSha256":hashlib.sha256(Path(a.school_out).read_bytes()).hexdigest(),
      "result":result
    }
    out=Path(a.out);out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(record,indent=2)+"\n");os.chmod(out,0o600)
    print(json.dumps({"release":result["release"],"blockers":result["blockerCount"],
     "sameHostRecovery":result["sameVpsDataAndEffectiveRoleAclDrill"],
     "freeGiB":result["vpsFreeGiB"],"shortfallGiB":result["vpsAdditionalNeededGiB"]}))
    return 3 if result["release"]=="HOLD" else 0

if __name__=="__main__":
    try:sys.exit(main())
    except Exception as e:
        print(f"A217 gate cannot certify: {type(e).__name__}: {e}",file=sys.stderr)
        sys.exit(2)
