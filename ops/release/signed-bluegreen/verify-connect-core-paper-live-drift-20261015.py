#!/usr/bin/env python3
"""Read-only Core278 + Connect rc1 + Paper term5f360 technical overlay audit.

Never imports human approvals, deploys public files or edits canonical records.
Default exit is HOLD (2), even if all code-only checks pass.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys

ROOT=Path(__file__).resolve().parents[3]
CORE=Path("/root/assps-release-candidates/apex-backend-core278-current-live-20261015/src")
PAPER=Path("/root/assps-release-candidates/apex-backend-core278-paper5f360a3-joint-stage-20261015/src")
PAPER_REPO=Path("/root/workspace/assps-paper-core-final-preflight-20261015")
CONNECT_REPO=Path("/root/workspace/assps-connect-current-live-role-neutral-ingress-20261015")
CONNECT_BUILD=Path("/root/assps-release-candidates/apex-connect-login-challenge-current-live-20261015/.next/BUILD_ID")
PAPER_LIVE=Path("/var/www/assps-grade910-draft-save-print-b18a8aae/index.html")
PAPER_OLD=Path("/var/www/assps-grade910-draft-save-print-b18a8aae.bak-20261015-1240/index.html")
PUBLIC_NEXT=Path("/var/www/apex-connect/.next/BUILD_ID")
RUNNING_CORE=Path("/var/www/apex-backend/src")
CONSOLIDATED_CORE_PARENT="c55922b2120232be1a392f203a35f4e9b683dfa5"
PAPER_COMMIT="5f360a36a8c3a20e6faf8612853f4ce0cf593a65"
CONNECT_COMMIT="98f6dfcff72fbe9d46d227d5c1200d388300d3d5"
NEW_NEXT_ID="rc1vIlE6prAQ8pHrw7ohX"
PUBLIC_BLUE_NEXT="ONDwxEIZlx5onDIKY7wYf"
PREVIOUS_GRADE_INDEX="92283fc8eec1d5fe1562abfe26f75b731c0b9eeb5f1883802b3e2a2cabc330ff"
CORE_WORKER="97090fee75c77283375141e21d572d52a1a9fe58952ff16a4584ca9f308592cc"
ORIGINAL_LESSON="435cf755904dcd7fdf74189d5a99d267b8ace98a6627c9180a2375e9dfaaf74f"
ORIGINAL_SERVER="cea552eee18b8fe9ac5dafb0df4937377480a4e9d7d12f4567697ec2d673ada4"
ALLOW={
 "routes/lessonPlanRoutes.js":"870de5e583fa3ef75744c11a28ab9facf30ae8e9a1d9d805653ad2dd6d6978e2",
 "services/lessonPlanningPublicationGuard.js":"143265e63e9c7957c6ae4d9756a01079dd934ee0280e1e7282a37f22f95b7dbd",
 "tests/lesson-plans-static.test.js":"7514d4708813e5e939971628a62cae8c536221211eafa335fc7011c1b83aca17",
 "tests/lesson-principal-source-bundle-http.test.js":"bd4df286679346c1dd93651035f5812fc1e1470eba5228156bf346a1c0d74d96",
 "tests/lesson-private-review-failclosed-http.test.js":"754d7e994f512f69689c5d896a2258e8222049b87c80daa73f9ba487a35f41f7",
 "tests/lesson-publication-guard.test.js":"f4c5eecd163c5d660bec1257b166fb671655d3ab153b3d086abde76b79216ddf",
}
def sha(p):
    p=Path(p)
    with p.open("rb") as stream:
        hasher=hashlib.sha256()
        for b in iter(lambda:stream.read(1048576),b""):
            hasher.update(b)
        return hasher.hexdigest()
def exact(p, h):
    p=Path(p)
    return p.is_file() and sha(p)==h
def head(p):
    x=subprocess.run(["git","-C",str(p),"rev-parse","HEAD"],capture_output=True,text=True,timeout=12)
    return x.stdout.strip() if x.returncode==0 else None
def compare_overlay(core,paper,expected=ALLOW):
    a={p.relative_to(core).as_posix():p for p in core.rglob("*") if p.is_file() and not p.is_symlink()}
    b={p.relative_to(paper).as_posix():p for p in paper.rglob("*") if p.is_file() and not p.is_symlink()}
    changes=sorted(k for k in a.keys()|b.keys() if k not in a or k not in b or sha(a[k])!=sha(b[k]))
    exact_changes=set(changes)==set(expected)
    pinned=all(exact(b[k],digest) for k,digest in expected.items() if k in b) and set(expected).issubset(b)
    return {"expected_change_set_exact":exact_changes,"all_overlay_files_hash_pinned":pinned},changes

def release_exit(technical,official_release=False):
    # No real human actor, institutional signer or actual public postflight
    # is authenticated by this source-only audit.
    return 0 if technical and not official_release else 2

def evaluate():
    differences,changed=compare_overlay(CORE,PAPER)
    checks={
        **differences,
        "paper_owner_source_revision_pinned":head(PAPER_REPO)==PAPER_COMMIT,
        "connect_owner_source_revision_pinned":head(CONNECT_REPO)==CONNECT_COMMIT,
        "joint_core_hardening_ancestor_preserved":subprocess.run(
           ["git","-C",str(ROOT),"merge-base","--is-ancestor",CONSOLIDATED_CORE_PARENT,"HEAD"],
           capture_output=True,timeout=12).returncode==0,
        "paper_staged_worker_exact_reviewed":exact(PAPER/"services/ai/aiQueueWorkerDatabase.js",CORE_WORKER),
        "core_staged_worker_exact_reviewed":exact(CORE/"services/ai/aiQueueWorkerDatabase.js",CORE_WORKER),
        "server_unchanged_from_live":exact(RUNNING_CORE/"server.js",ORIGINAL_SERVER)
             and exact(PAPER/"server.js",ORIGINAL_SERVER),
        "new_compiled_connect_build_preserved":CONNECT_BUILD.is_file()
             and CONNECT_BUILD.read_text().strip()==NEW_NEXT_ID,
        "old_blue_connect_still_running":PUBLIC_NEXT.is_file()
             and PUBLIC_NEXT.read_text().strip()==PUBLIC_BLUE_NEXT,
        "reviewed_worker_not_falsely_reported_live":not (RUNNING_CORE/"services/ai/aiQueueWorkerDatabase.js").exists(),
        "original_lesson_route_preserved_running":exact(RUNNING_CORE/"routes/lessonPlanRoutes.js",ORIGINAL_LESSON),
        "legacy_grade_index_recovery_backup_pinned":exact(PAPER_OLD,PREVIOUS_GRADE_INDEX),
        "current_live_grade_still_old_release":exact(PAPER_LIVE,PREVIOUS_GRADE_INDEX),
        "no_private_backend_env_staged":not (PAPER.parent/".env").exists()
             and not (CORE.parent/".env").exists(),
    }
    technical=all(v for k,v in checks.items() if k!="current_live_grade_still_old_release")
    index_sha=sha(PAPER_LIVE) if PAPER_LIVE.is_file() else "MISSING"
    return {
        "gate":"ASSPS_CONNECT_CORE_PAPER_CROSS_WORKSTREAM_20261015",
        "source_only_combined_backend_compatibility":"PASS" if technical else "HOLD",
        "checks":checks,
        "overlay_deltas":changed,
        "actual_public_grade_html_sha256":index_sha,
        "previous_reviewed_grade_html_sha256":PREVIOUS_GRADE_INDEX,
        "live_grade_sha_drift_detected":not checks["current_live_grade_still_old_release"],
        "paper_owner_source":PAPER_COMMIT,
        "connect_owner_source":CONNECT_COMMIT,
        "new_private_next_build":NEW_NEXT_ID,
        "institutional_actor_signed":False,
        "public_approved_transaction_executed":False,
        "production_release":"HOLD",
    }
def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--candidate-only",action="store_true",
        help="return zero only for source technical compatibility, NEVER a production GO")
    a=parser.parse_args()
    facts=evaluate()
    print(json.dumps(facts,indent=2,sort_keys=True))
    return release_exit(facts["source_only_combined_backend_compatibility"]=="PASS",not a.candidate_only)

if __name__=="__main__":
    sys.exit(main())
