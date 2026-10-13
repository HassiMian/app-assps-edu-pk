#!/usr/bin/env python3
"""Read-only fail-closed integration proof: latest Core ancestry + byte-identical tested Paper runtime.

This does NOT certify production RLS, authentic school marks, physical printing or deployment.
"""
import argparse
import json
import pathlib
import re
import subprocess
import sys

FRONT = "al-siddique-frontend"
BACK = "al-siddique-backend"
CORE_REF = "refs/heads/fix/core-rls-clone-candidate-and-ops-20261012"
TESTED_CODE = "a74d13e04458eb74c91e9e17956ba8bd35e8c9a6"


def assess(facts):
    holds = []
    if facts["dirty"]:
        holds.append("integration_worktree_not_clean")
    if not facts["core_is_ancestor"]:
        holds.append("latest_core_not_in_candidate_ancestry")
    if facts["core_remote"] != facts["core_expected"]:
        holds.append("core_remote_advanced_or_missing")
    if facts["source_remote"] != facts["source_head"]:
        holds.append("integration_branch_not_published_at_exact_SHA")
    for key in ("frontend", "backend"):
        if facts[f"tested_{key}_tree"] != facts[f"integrated_{key}_tree"]:
            holds.append(f"{key}_runtime_differs_from_fully_tested_commit")
    if not facts["original_evidence_verified"]:
        holds.append("original_full_16_gate_evidence_unverified")
    return {"status": "PASS_RUNTIME_EQUIVALENT_SOURCE_ONLY" if not holds else "HOLD",
            "holds": holds, "source_head": facts["source_head"],
            "core_source": facts["core_expected"], "tested_paper_code": TESTED_CODE,
            "production_certified": False, "human_approval_certified": False,
            "physical_print_certified": False}


def git(repo, *args):
    p = subprocess.run(["git", "-C", str(repo), *args], capture_output=True,
                       text=True, timeout=20, check=False)
    if p.returncode:
        raise RuntimeError(f"git {args[0]} exit={p.returncode}")
    return p.stdout.strip()


def collect(repo, evidence_dir, tested_code, core_head):
    if not re.fullmatch(r"[0-9a-f]{40}", core_head) or not re.fullmatch(r"[0-9a-f]{40}", tested_code):
        raise ValueError("Explicit exact Core SHA and tested-source SHA required")
    git(repo, "cat-file", "-t", core_head)
    remote = git(repo, "ls-remote", "origin", CORE_REF,
                 "refs/heads/" + git(repo, "branch", "--show-current"))
    remotes = dict(item.split("\t", 1)[::-1] for item in remote.splitlines() if "\t" in item)
    head = git(repo, "rev-parse", "HEAD")
    core_ancestor = subprocess.run(
        ["git", "-C", str(repo), "merge-base", "--is-ancestor", core_head, head],
        capture_output=True, timeout=15, check=False).returncode == 0
    attest = pathlib.Path(__file__).with_name("verify-paper-offline-evidence-20261012.py")
    import importlib.util
    spec = importlib.util.spec_from_file_location("paper_offline_attestor", attest)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    evidence_ok = False
    try:
        proof = mod.verify(evidence_dir, tested_code)
        evidence_ok = proof.get("gates") == 16
    except (ValueError, OSError, KeyError):
        evidence_ok = False
    return {
        "dirty": bool(git(repo, "status", "--porcelain")),
        "core_is_ancestor": core_ancestor,
        "core_expected": core_head,
        "core_remote": remotes.get(CORE_REF),
        "source_head": head,
        "source_remote": remotes.get("refs/heads/" + git(repo, "branch", "--show-current")),
        "tested_frontend_tree": git(repo, "rev-parse", f"{tested_code}:{FRONT}"),
        "integrated_frontend_tree": git(repo, "rev-parse", f"HEAD:{FRONT}"),
        "tested_backend_tree": git(repo, "rev-parse", f"{tested_code}:{BACK}"),
        "integrated_backend_tree": git(repo, "rev-parse", f"HEAD:{BACK}"),
        "original_evidence_verified": evidence_ok,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", required=True)
    parser.add_argument("--evidence-dir", required=True)
    parser.add_argument("--tested-code", default=TESTED_CODE)
    parser.add_argument("--core-sha", required=True)
    args = parser.parse_args()
    try:
        result = assess(collect(pathlib.Path(args.repo), args.evidence_dir, args.tested_code, args.core_sha))
    except (RuntimeError, OSError, ValueError, subprocess.TimeoutExpired, KeyError) as exc:
        result = {"status": "HOLD", "holds": ["verification_error:" + type(exc).__name__],
                  "production_certified": False}
    print(json.dumps(result, sort_keys=True))
    return 0 if result["status"] == "PASS_RUNTIME_EQUIVALENT_SOURCE_ONLY" else 2


if __name__ == "__main__":
    sys.exit(main())
