#!/usr/bin/env python3
"""Recheck byte-pinned compiled Next QA; deliberately not a production gate."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys

MANIFEST = Path(__file__).with_name("recovery") / "private-next-build-20261016.json"
PATHS = {".next/BUILD_ID", ".next/server/app/login/page.js",
         ".next/server/app/dashboard/page.js", ".next/server/app/api/auth/me/route.js",
         ".next/required-server-files.json", "src/generated/buildProvenance.ts", "eslint.config.mjs"}
SOURCE = "9fcca4320bdbeb834f6494d1af82d82f1d9b818f"
BUILD = "EvBJH9KRqqtM5ldAhJKtT"

def valid(m):
    return (isinstance(m, dict)
       and m.get("schema") == "assps-connect-isolated-build-evidence-v1"
       and m.get("source_commit") == SOURCE and m.get("build_id") == BUILD
       and m.get("scope") == "PRIVATE_NEXT_HTTPS_BROWSER_ONLY"
       and m.get("actual_anonymous_http_passed") == 5
       and m.get("actual_synthetic_chromium_passed") == 14
       and all(m.get(k) is False for k in ("optimized_build_exit_zero_confirmed",
                   "production_release_authorized", "independent_security_certified",
                   "production_changed"))
       and isinstance(m.get("artifacts"), dict)
       and set(m["artifacts"]) == PATHS
       and all(isinstance(v, str) and len(v) == 64
               and all(c in "0123456789abcdef" for c in v)
               for v in m["artifacts"].values()))

def verify(stage, m):
    if not valid(m) or not stage.is_dir() or stage.is_symlink():
        return False
    try:
        rev = subprocess.check_output(["git", "-C", str(stage), "rev-parse", "HEAD"],
                                     stderr=subprocess.DEVNULL, timeout=5).decode().strip()
        if rev != SOURCE or (stage / ".next/BUILD_ID").read_text().strip() != BUILD:
            return False
        for rel, expected in m["artifacts"].items():
            p = stage / rel
            if not p.is_file() or p.is_symlink() or hashlib.sha256(p.read_bytes()).hexdigest() != expected:
                return False
        provenance = (stage / "src/generated/buildProvenance.ts").read_text()
        return SOURCE in provenance and '"rendererPathsMatchCommit": true' in provenance
    except (OSError, subprocess.SubprocessError, UnicodeError):
        return False

if __name__ == "__main__":
    cli = argparse.ArgumentParser()
    cli.add_argument("--stage", required=True, type=Path)
    args = cli.parse_args()
    try:
        manifest = json.loads(MANIFEST.read_text())
        passed = verify(args.stage, manifest)
    except (OSError, json.JSONDecodeError):
        passed = False
    print(json.dumps({"decision": "PRIVATE_QA_HASHES_PASS" if passed else "HOLD",
       "production_changed": False, "production_release_authorized": False,
       "independent_security_certified": False}, sort_keys=True))
    sys.exit(0 if passed else 2)
