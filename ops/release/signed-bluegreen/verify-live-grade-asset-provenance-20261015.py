#!/usr/bin/env python3
"""Read-only production static bundle provenance and direct asset integrity.

This is NOT Git source ancestry or human SaaS Core deployment approval.
No running process, frontend, database, secret, Nginx, or credential writes.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import sys

LIVE = Path("/var/www/assps-grade910-draft-save-print-b18a8aae")
RESULT = Path("/var/www/assps-resultcards-class-isolation-8b5d370e")
ARCHIVE = Path("/var/www/assps-grade910-draft-save-print-b18a8aae.bak-20261015-1240")
APPROVED_PREVIOUS = "92283fc8eec1d5fe1562abfe26f75b731c0b9eeb5f1883802b3e2a2cabc330ff"
OBSERVED_CURRENT = "0af53ae824340f2ddc0b91e848163f8bddad4263d1bb7a7cf92a2bcda923325a"
ASSET = re.compile(r"assets/[A-Za-z0-9_.-]+\.(?:js|css|svg|png|woff2?|ttf|jpg|webp)")
ENTRY = re.compile(r'/assets/(index-[A-Za-z0-9_.-]+\.js)')

def sha(path):
    h = hashlib.sha256()
    with Path(path).open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()

def file_set(root):
    return {p.relative_to(root).as_posix():p for p in root.rglob("*")
            if p.is_file() and not p.is_symlink()}

def evaluate(live=LIVE, reference=RESULT, archive=ARCHIVE,
             reviewed=APPROVED_PREVIOUS, observed=OBSERVED_CURRENT):
    index = live/"index.html"
    assert index.is_file() and not index.is_symlink(), "live index missing/symlink"
    text = index.read_text(encoding="utf-8")
    entries = ENTRY.findall(text)
    refs = set(ASSET.findall(text))
    for entry_name in entries:
        entry = live/"assets"/entry_name
        if entry.is_file() and not entry.is_symlink():
            refs.update(ASSET.findall(entry.read_text(encoding="utf-8",errors="replace")))
    missing = sorted(x for x in refs if not (live/x).is_file() or (live/x).is_symlink())
    live_files = file_set(live)
    reference_files = file_set(reference)
    overlap = live_files.keys() & reference_files.keys()
    identical = sum(sha(live_files[k]) == sha(reference_files[k]) for k in overlap)
    current_hash = sha(index)
    reference_index = reference/"index.html"
    source_matches = (reference_index.is_file() and
                      sha(reference_index)==current_hash)
    archive_index = archive/"index.html"
    archive_valid = archive_index.is_file() and sha(archive_index)==reviewed
    checks = {
       "current_index_matches_observed_review_snapshot":current_hash==observed,
       "exactly_one_entry":len(entries)==1,
       "all_entry_direct_assets_exist":len(refs)>0 and not missing,
       "previous_grade_archive_reviewed_hash_preserved":archive_valid,
       "current_main_js_identical_to_resultcards_reference":
           bool(entries) and (live/"assets"/entries[0]).is_file()
           and (reference/"assets"/entries[0]).is_file()
           and sha(live/"assets"/entries[0])==sha(reference/"assets"/entries[0]),
    }
    approved = current_hash==reviewed
    return {
      "gate":"ASSPS_GRADE_ACTIVE_ASSET_PROVENANCE_20261015",
      "checks":checks,
      "technical_assets_complete":all(checks.values()),
      "current_public_index_sha256":current_hash,
      "prior_reviewed_index_sha256":reviewed,
      "previous_reviewed_grade_index_still_active":approved,
      "live_index_byte_identical_to_other_resultcards_tree":source_matches,
      "live_file_count":len(live_files),
      "other_reference_file_count":len(reference_files),
      "identical_files_in_both":identical,
      "different_shared_files":len(overlap)-identical,
      "live_files_not_in_other_reference":len(live_files.keys()-reference_files.keys()),
      "direct_entry_asset_count":len(refs),
      "missing_direct_assets":missing,
      "release_ownership_cryptographically_verified":False,
      "authorized_human_current_source_approval":False,
      "production_release":"HOLD",
    }

def exit_status(report,source_only):
    # A readable/complete bundle does not establish provenance, school security
    # or any independent human approval for changing the running release.
    return 0 if source_only and report["technical_assets_complete"] else 2

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--source-only",action="store_true",
                        help="return 0 for technical asset checks only; never approve deployment")
    args=parser.parse_args()
    report=evaluate()
    print(json.dumps(report,indent=2,sort_keys=True))
    return exit_status(report,args.source_only)

if __name__=="__main__":
    sys.exit(main())
