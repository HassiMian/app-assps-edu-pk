#!/usr/bin/env python3
"""Check protected on-host dump/log hashes; this is NOT an independent restore certificate."""
import argparse
import hashlib
import json
from pathlib import Path
import sys

DEFAULT=Path(__file__).with_name("recovery")/"verified-local-fullacl-restore-20261016.json"
ARCHIVE=Path("/root/assps-release-backups/core-acl-fresh-candidate-20261016/apexos-full-fresh-20261016.dump")
LOG=Path("/root/assps-release-evidence/connect-fullacl-offline-restore-20261016/isolated-pg-restore.log")

def valid(report):
    if not isinstance(report,dict):
        return False
    checks={
        "schema":"assps-connect-same-host-fullacl-restore-20261016-v1",
        "scope":"LOCAL_OFFLINE_RESTORE_ONLY",
        "pg_restore_exit_code":0,
        "source_archive_bytes":2706585,
        "catalog_entries":1743,
        "rls_enabled_tables":87,
        "rls_forced_tables":83,
        "rls_policies":379,
        "effective_grant_entries":1685,
        "public_schema_tables":98,
        "live_and_restored_exam_rows":1763,
        "live_and_restored_real_zeros":213,
        "live_and_restored_school1_exam9_rows":1762,
        "source_archive_sha256":"e4564c8228994c4b395d43e73ca02c3d308cefad55b5b241f2d4a7becd17e277",
        "private_restore_log_sha256":"a88c993b63ed6dffc774f641aa51812ce596f71076645451b0510f6b834cb0ad",
        "student_record_content_parity":True,
        "exam_record_content_parity":True,
        "normalized_effective_grant_parity":True,
        "rls_policy_definition_parity":True,
        "rls_owner_force_flag_parity":True,
        "no_tcp_listener":True,
        "sandbox_stopped_and_removed":True,
        "private_restore_log_in_git":False,
        "production_data_modified":False,
        "independent_offsite_restore_certified":False,
        "core_reviewer_approved_current_sha":False,
        "production_release_authorized":False,
    }
    return all(type(report.get(k))==type(v) and report[k]==v for k,v in checks.items())

def digest(path):
    h=hashlib.sha256()
    with path.open("rb") as f:
        for piece in iter(lambda:f.read(1<<20),b""):
            h.update(piece)
    return h.hexdigest()

def check_local(report,archive,log):
    if not valid(report):
        return False
    try:
        if archive.is_symlink() or log.is_symlink():
            return False
        if not archive.is_file() or not log.is_file():
            return False
        if archive.stat().st_size!=report["source_archive_bytes"]:
            return False
        if digest(archive)!=report["source_archive_sha256"] or digest(log)!=report["private_restore_log_sha256"]:
            return False
        # Logs are internal security evidence: do not print their contents.
        if b"pg_restore: error:" in log.read_bytes():
            return False
        return True
    except OSError:
        return False

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--manifest",type=Path,default=DEFAULT)
    p.add_argument("--source-archive",type=Path,default=ARCHIVE)
    p.add_argument("--private-restore-log",type=Path,default=LOG)
    a=p.parse_args()
    try:
        r=json.loads(a.manifest.read_text())
        ok=check_local(r,a.source_archive,a.private_restore_log)
    except (OSError,ValueError):
        ok=False
    print(json.dumps({"decision":"LOCAL_RESTORE_LOG_AND_ARCHIVE_HASH_PASS" if ok else "HOLD",
     "production_release_authorized":False,"independent_offsite_restore_certified":False,
     "production_data_modified":False},sort_keys=True))
    sys.exit(0 if ok else 2)
