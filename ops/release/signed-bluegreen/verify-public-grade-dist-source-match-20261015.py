#!/usr/bin/env python3
"""Read-only byte-for-byte static artifact reconciliation.

Matching a dist tree proves a file association, never approved clean-source
ancestry or actor signatures. Production release mode always exits HOLD=2.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys

LIVE=Path("/var/www/assps-grade910-draft-save-print-b18a8aae")
REPO=Path("/root/workspace/assps-resultcards-core-review-20261012")
DIST=REPO/"al-siddique-frontend/dist"
OBSERVED_LIVE_SHA="0af53ae824340f2ddc0b91e848163f8bddad4263d1bb7a7cf92a2bcda923325a"
REVIEWED_GRADE_PREVIOUS="92283fc8eec1d5fe1562abfe26f75b731c0b9eeb5f1883802b3e2a2cabc330ff"
OBSERVED_GIT_LOCAL="66162f08a00c076627ae3ed0755857a213bdf91a"
OBSERVED_GIT_REMOTE="00da1e296c3116086a1d1e98c272eb0534e4ee8e"
OBSERVED_DIST_COUNT=89

def digest(p):
    h=hashlib.sha256()
    with p.open("rb") as f:
        for chunk in iter(lambda:f.read(1024*1024),b""):
            h.update(chunk)
    return h.hexdigest()

def listed(root):
    return {p.relative_to(root).as_posix():p for p in root.rglob("*")
            if p.is_file() and not p.is_symlink()}

def overlay(live,dist):
    source=listed(dist)
    running=listed(live)
    source_symlinks=sorted(p.relative_to(dist).as_posix() for p in dist.rglob("*") if p.is_symlink())
    live_symlinks=sorted(p.relative_to(live).as_posix() for p in live.rglob("*") if p.is_symlink())
    shared=source.keys() & running.keys()
    changed=sorted(k for k in shared if digest(source[k])!=digest(running[k]))
    missing=sorted(source.keys()-running.keys())
    extras=sorted(running.keys()-source.keys())
    return {
      "dist_file_count":len(source),
      "dist_symlinks":source_symlinks,
      "live_symlinks":live_symlinks,
      "live_file_count":len(running),
      "byte_identical_dist_files":len(shared)-len(changed),
      "missing_dist_files":missing,
      "mismatched_dist_files":changed,
      "unmatched_live_file_count":len(extras),
      "all_dist_files_identical_to_live":
         len(source)==OBSERVED_DIST_COUNT and not changed and not missing
         and not source_symlinks and not live_symlinks,
    }

def git_cmd(repo,args):
    q=subprocess.run(["git","-C",str(repo),*args],capture_output=True,text=True,timeout=15)
    return q.stdout.strip() if q.returncode==0 else None

def evaluate(live=LIVE,dist=DIST,repo=REPO,
             observed=OBSERVED_LIVE_SHA,previous=REVIEWED_GRADE_PREVIOUS,
             local_expected=OBSERVED_GIT_LOCAL,remote_expected=OBSERVED_GIT_REMOTE,
             check_git=True):
    files=overlay(live,dist)
    live_hash=digest(live/"index.html") if (live/"index.html").is_file() else "MISSING"
    dist_hash=digest(dist/"index.html") if (dist/"index.html").is_file() else "MISSING"
    git_head=git_cmd(repo,["rev-parse","HEAD"]) if check_git else None
    dirty_paths=(git_cmd(repo,["diff","--name-only"]) or "").splitlines() if check_git else []
    remote_parts=(git_cmd(repo,["ls-remote","origin","refs/heads/audit/core-private-finance-evidence-20261012"]) or "").split() if check_git else []
    remote_head=remote_parts[0] if remote_parts else None
    index_tracked=bool(git_cmd(repo,["ls-files","--","al-siddique-frontend/dist/index.html"])) if check_git else False
    checks={
      "all_located_dist_files_match_running_static_root":files["all_dist_files_identical_to_live"],
      "current_running_html_exact_observed_sha":live_hash==observed,
      "located_build_html_exact_running_html":dist_hash==live_hash,
      "source_local_git_head_still_observed":git_head==local_expected,
      "source_remote_branch_still_observed":remote_head==remote_expected,
    }
    technical=all(checks.values())
    return {
      "gate":"ASSPS_LIVE_GRADE_DIST_SOURCE_FORENSICS_20261015",
      "checks":checks,**files,
      "technical_match":"PASS" if technical else "HOLD",
      "running_html_sha256":live_hash,
      "located_dist_html_sha256":dist_hash,
      "previously_reviewed_grade_sha256":previous,
      "source_git_local_head":git_head,
      "source_git_remote_head":remote_head,
      "source_git_local_remote_equal":bool(git_head) and git_head==remote_head,
      "source_git_tracked_modified_paths":dirty_paths,
      "source_dist_index_git_tracked":index_tracked,
      "reviewed_clean_source_commit_proven":False,
      "institutional_human_approved_release":False,
      "production_release":"HOLD",
    }

def exit_code(result,source_only):
    # Even byte-identical untracked build artifacts cannot certify a signed,
    # immutable source commit or a genuine independent release approval.
    return 0 if source_only and result["technical_match"]=="PASS" else 2

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--source-only",action="store_true",help="technical byte-integrity only, never release permission")
    args=p.parse_args()
    report=evaluate()
    print(json.dumps(report,sort_keys=True,indent=2))
    return exit_code(report,args.source_only)

if __name__=="__main__":
    sys.exit(main())
