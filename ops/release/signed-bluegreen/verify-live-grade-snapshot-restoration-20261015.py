#!/usr/bin/env python3
"""Read-only confirmation of isolated restore of the CURRENT live Grade snapshot.

Technical restoration is NOT signed offsite recovery, approved source ancestry,
a PostgreSQL restore test, or permission to switch Nginx/production traffic.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import sys

LIVE = Path("/var/www/assps-grade910-draft-save-print-b18a8aae")
RESTORED = Path("/root/assps-release-candidates/grade-live-current-restoration-rehearsal-20261015/assps-grade910-draft-save-print-b18a8aae")
ARCHIVE = Path("/root/assps-release-backups/grade-live-origin-forensics-20261015/current-live-grade-root.tar.zst")
ARCHIVE_SHA = "2cfa671d73aebd2120e5c911b1ec668c31faa1b5c2db7b3cb6f794844d2701c1"
INDEX_SHA = "0af53ae824340f2ddc0b91e848163f8bddad4263d1bb7a7cf92a2bcda923325a"
EXPECTED_FILES = 290
ENTRY = re.compile(r"/assets/[A-Za-z0-9_.-]+\.(?:js|css)")

def digest(path):
    h=hashlib.sha256()
    with Path(path).open("rb") as f:
        for b in iter(lambda:f.read(1048576),b""):
            h.update(b)
    return h.hexdigest()

def snapshot(root):
    base=Path(root)
    files={}
    symlinks=[]
    for p in base.rglob("*"):
        if p.is_symlink():
            symlinks.append(p.relative_to(base).as_posix())
        elif p.is_file():
            files[p.relative_to(base).as_posix()]=digest(p)
    return files,symlinks

def evaluate(live=LIVE,restored=RESTORED,archive=ARCHIVE,
             expected_archive=ARCHIVE_SHA,expected_index=INDEX_SHA,
             expected_count=EXPECTED_FILES):
    left,left_links=snapshot(live)
    right,right_links=snapshot(restored)
    missing=sorted(left.keys()-right.keys())
    extras=sorted(right.keys()-left.keys())
    changed=sorted(k for k in left.keys() & right.keys() if left[k]!=right[k])
    index=restored/"index.html"
    entry_refs=ENTRY.findall(index.read_text(encoding="utf-8")) if index.is_file() else []
    no_missing_entries=bool(entry_refs) and all(
        (restored/ref.lstrip("/")).is_file() and not (restored/ref.lstrip("/")).is_symlink()
        for ref in entry_refs
    )
    checks={
        "archive_sha_matches_reviewed_live_snapshot":archive.is_file() and digest(archive)==expected_archive,
        "live_and_restored_exact_file_count":len(left)==expected_count and len(right)==expected_count,
        "no_missing_or_unexpected_files":not missing and not extras,
        "all_restored_file_bytes_match_running":not changed,
        "no_symlinks_in_live_or_restored_snapshot":not left_links and not right_links,
        "both_indexes_match_recorded_sha":left.get("index.html")==expected_index and right.get("index.html")==expected_index,
        "restored_frontend_entry_assets_present":no_missing_entries,
    }
    return {
      "gate":"ASSPS_CURRENT_GRADE_DISPOSABLE_RESTORE_20261015",
      "technical_restore_status":"PASS" if all(checks.values()) else "HOLD",
      "checks":checks,
      "live_file_count":len(left),
      "restored_file_count":len(right),
      "restored_bootstrap_asset_references":len(entry_refs),
      "missing_files":missing,
      "unreviewed_extra_files":extras,
      "mismatched_files":changed,
      "live_symlinks":left_links,
      "restored_symlinks":right_links,
      "technical_backup_current_not_offsite":True,
      "human_authorized_release_certified":False,
      "actual_prod_traffic_cutover_verified":False,
      "production_release":"HOLD",
    }

def exit_status(evidence,release_mode=False):
    return 2 if release_mode or evidence["technical_restore_status"]!="PASS" else 0

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--release-gate",action="store_true",
                   help="must HOLD until separate Core human+RLS signed release certification")
    args=p.parse_args()
    evidence=evaluate()
    print(json.dumps(evidence,indent=2,sort_keys=True))
    return exit_status(evidence,args.release_gate)
if __name__=="__main__":
    sys.exit(main())
