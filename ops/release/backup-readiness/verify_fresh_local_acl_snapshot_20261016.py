#!/usr/bin/env python3
"""Read-only structural check of an existing local Core PostgreSQL backup.

Does NOT restore a database, certify offsite recovery, change the official
signed Core verifier's SHA pins, or authorize any deployment.
"""
import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys

EXPECTED_CATALOG={"entries":1743,"toc_entries":1748,"row_security":87,"acl":187,"default_acl":2,"all_acl":189}
MAX_AGE_SECONDS=86400
MAX_BYTES=1_073_741_824
MIN_BYTES=1_000_000

def inspect_archive(archive, expected_sha, *, expected=EXPECTED_CATALOG,
                    now=None, runner=subprocess.run, expected_owner_uid=0):
    archive=Path(archive)
    now=now or dt.datetime.now(dt.timezone.utc).timestamp()
    if not re.fullmatch(r"[0-9a-f]{64}",expected_sha):
        raise ValueError("INVALID_EXPECTED_DIGEST")
    st=archive.lstat()
    if not stat.S_ISREG(st.st_mode) or st.st_uid!=expected_owner_uid or stat.S_IMODE(st.st_mode)!=0o600:
        raise ValueError("ARCHIVE_MUST_BE_ROOT_OWNED_REGULAR_0600")
    if not MIN_BYTES<st.st_size<=MAX_BYTES:
        raise ValueError("ARCHIVE_SIZE_OUT_OF_RANGE")
    age=now-st.st_mtime
    if not 0<=age<=MAX_AGE_SECONDS:
        raise ValueError("BACKUP_NOT_FRESH_DONT_TOUCH_TIMESTAMP")
    h=hashlib.sha256()
    with archive.open("rb") as handle:
        for block in iter(lambda:handle.read(1024*1024),b""):
            h.update(block)
    if h.hexdigest()!=expected_sha:
        raise ValueError("ARCHIVE_SHA256_MISMATCH")
    p=runner(["pg_restore","-l",str(archive)],capture_output=True,text=True,
             timeout=45,check=False)
    if p.returncode!=0:
        raise ValueError("PG_RESTORE_CATALOG_INVALID")
    text=p.stdout
    match=re.search(r"^;\s*TOC Entries:\s*(\d+)\s*$",text,re.M)
    if not match:
        raise ValueError("MISSING_RESTORE_TOC_COUNT")
    lines=[line for line in text.splitlines() if re.match(r"^\d+;\s",line)]
    counts={
        "entries":len(lines),
        "toc_entries":int(match.group(1)),
        "row_security":sum(bool(re.search(r";\s+\d+\s+\d+\s+ROW SECURITY\s",line)) for line in lines),
        "default_acl":sum(bool(re.search(r";\s+\d+\s+\d+\s+DEFAULT ACL\s",line)) for line in lines),
        "acl":sum(bool(re.search(r";\s+\d+\s+\d+\s+ACL\s",line)) for line in lines)
    }
    counts["all_acl"]=counts["acl"]+counts["default_acl"]
    if counts!=expected:
        raise ValueError("BACKUP_ACL_OR_RLS_CATALOG_COUNT_DRIFT")
    sql=runner(["pg_restore","-f","/dev/null",str(archive)],
               capture_output=True,text=True,timeout=90,check=False)
    if sql.returncode!=0:
        raise ValueError("PG_RESTORE_FULL_SQL_STREAM_PARSE_FAILED")
    return {
        "schema":"ASSPS_PROVISIONAL_LOCAL_BACKUP_REVIEW_V1",
        "localArchiveSha256":h.hexdigest(),
        "catalogCounts":counts,
        "fullSqlStreamParsed":True,
        "ageSeconds":round(age,2),
        "decision":"LOCAL_ARCHIVE_STRUCTURALLY_VERIFIED_NOT_RELEASE_CERTIFIED",
        "offsiteRestoreCertified":False,
        "independentReviewerSignatureVerified":False,
        "officialCoreApprovedBackupUpdated":False,
        "productionDatabaseChanged":False,
        "releaseAuthorized":False
    }

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--archive",required=True)
    ap.add_argument("--expected-sha256",required=True)
    args=ap.parse_args()
    try:
        report=inspect_archive(args.archive,args.expected_sha256)
    except (ValueError,OSError,subprocess.TimeoutExpired) as e:
        report={"schema":"ASSPS_PROVISIONAL_LOCAL_BACKUP_REVIEW_V1",
                "decision":"HOLD_LOCAL_BACKUP_REVIEW",
                "reason":str(e)[:100],
                "offsiteRestoreCertified":False,
                "officialCoreApprovedBackupUpdated":False,
                "productionDatabaseChanged":False,
                "releaseAuthorized":False}
    print(json.dumps(report,sort_keys=True,separators=(",",":")))
    return 0 if report["decision"]=="LOCAL_ARCHIVE_STRUCTURALLY_VERIFIED_NOT_RELEASE_CERTIFIED" else 2

if __name__=="__main__":
    sys.exit(main())
