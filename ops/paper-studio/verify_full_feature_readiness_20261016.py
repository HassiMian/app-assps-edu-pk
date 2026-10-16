#!/usr/bin/env python3
"""Read-only Paper Studio static-release readiness; never grants production approval."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys

REPO = Path(__file__).resolve().parents[2]
RELEASE = Path("ops/release")
PROBES = (
    ("resultCardsV3", "node", "verify-resultcards-v3-active-20261015.cjs"),
    ("savedMarks", "node", "verify-marks-register-ui-20261015.cjs"),
    ("dailyDiary", "node", "verify-diary-controls-in-active-bundle-20261015.cjs"),
    ("lessonPlannerV5", "python", "check-lesson-planner-ui.py"),
    ("earlyYearsPrint", "python", "check-preserved-companion-features.py"),
)

def verdict(name, payload, code):
    if code != 0:
        return False
    if name in ("resultCardsV3", "savedMarks"):
        return payload.get("status") == "PASS" and (
            name != "resultCardsV3" or payload.get("distinctPremiumTemplates") == 10)
    if name == "dailyDiary":
        return payload.get("prePromotionDecision") == "PASS_DIARY_ACTIVE_CONTROLLER_PRESERVATION_ONLY"
    if name == "lessonPlannerV5":
        return payload.get("pass") is True and payload.get("result") == "PASS"
    if name == "earlyYearsPrint":
        checks = payload.get("checks", {})
        return payload.get("result") == "PASS" and bool(checks) and all(checks.values())
    return False

def run_matrix(repo, dist, runner=subprocess.run):
    repo, dist = Path(repo).resolve(), Path(dist)
    if dist.is_symlink() or not dist.is_dir() or dist.resolve() == Path("/"):
        raise ValueError("UNSAFE_OR_MISSING_DIST")
    index = dist / "index.html"
    if not index.is_file() or index.is_symlink():
        raise ValueError("UNTRUSTED_OR_MISSING_INDEX")
    results = {}
    for name, interpreter, filename in PROBES:
        script = repo / RELEASE / filename
        if not script.is_file() or script.is_symlink():
            results[name] = {"status": "HOLD", "reason": "MISSING_REVIEWED_VERIFIER"}
            continue
        argv = (["node"] if interpreter == "node" else [sys.executable])
        argv += [str(script), "--dist", str(dist)]
        if name == "lessonPlannerV5":
            argv.append("--no-source")
        if name == "earlyYearsPrint":
            argv += ["--repo", str(repo)]
        try:
            proc = runner(argv, capture_output=True, text=True, timeout=75, check=False)
            try:
                value = json.loads(proc.stdout.strip())
                if not isinstance(value, dict):
                    value = {}
            except (ValueError, TypeError):
                value = {}
            passed = verdict(name, value, proc.returncode)
            results[name] = {"status": "PASS" if passed else "HOLD",
                             "reason": "FEATURE_VERIFIED" if passed else
                             ("NON_JSON_VERIFIER_OUTPUT" if not value else "FEATURE_CONTRACT_FAILED"),
                             "exitCode": proc.returncode}
        except (OSError, subprocess.TimeoutExpired):
            results[name] = {"status": "HOLD", "reason": "VERIFIER_UNAVAILABLE_OR_TIMEOUT"}
    ready = len(results) == len(PROBES) and all(x["status"] == "PASS" for x in results.values())
    return {"schema": "ASSPS_PAPER_FULL_FEATURE_READINESS_V1", "staticRoot": str(dist.resolve()),
            "indexSha256": hashlib.sha256(index.read_bytes()).hexdigest(),
            "checks": results, "fullFeatureReadiness": "STATIC_FEATURES_PASS" if ready else "HOLD",
            "productionReleaseAuthorized": False, "studentRecordsChanged": False,
            "printerJobsDispatched": 0, "requiresRealRoleAndCoreReleaseGate": True}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", default=str(REPO))
    parser.add_argument("--dist", required=True)
    args = parser.parse_args()
    try:
        result = run_matrix(Path(args.repo), Path(args.dist))
    except (OSError, ValueError) as e:
        result = {"schema": "ASSPS_PAPER_FULL_FEATURE_READINESS_V1",
                  "fullFeatureReadiness": "HOLD", "error": str(e)[:110],
                  "productionReleaseAuthorized": False, "studentRecordsChanged": False,
                  "printerJobsDispatched": 0}
    print(json.dumps(result, sort_keys=True, separators=(",", ":")))
    return 0 if result["fullFeatureReadiness"] == "STATIC_FEATURES_PASS" else 2

if __name__ == "__main__":
    sys.exit(main())
