#!/usr/bin/env python3
"""Fail-closed, read-only Core + APEX Connect unified release evidence.

No privileged tokens, role impersonation, database writes or deployments.
The independently signed Core release verifier retains exclusive authority.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

# Exact new Core/Paper integration, independently published and read-only checked.
CORE_PARENT_SHA = "638025c86a949b9768e5005966724e5d3e834e68"
CORE_SHA = "e301273e0d055667dc7b0787593839a006fb97f7"
CORE_DIST_SHA = "db0ef46c9922c049f0b150a1a2b00323c15c67967483cd02ccdafa48d0134237"
CONNECT_SHA = "20ebae71ca438ad1590720ac93ff1ed9d59fedd7"
CONNECT_PARENT_SHA = "e776d8f15350f62708ed55f6b7cd9fbdfc636ec3"
CONNECT_BUILD_ID = "91l6KJsI2x_oOVXPQjUd5"
PUBLIC_BUILD_ID = "ONDwxEIZlx5onDIKY7wYf"
PRIVATE_HTTP_DIGEST = "68e4a6de75d459ef1cf8192291d81ce124065c6e733ebfc686e27d608fa44fc0"

OFFICIAL_CORE_GATE = Path("/root/workspace/assps-core-connect-gate-exit-hardening-20261015/ops/release/signed-bluegreen/verify-connect-login-only-core-20261014.py")
OFFICIAL_CORE_GATE_SHA256 = "534d2a7cd14925f8b6cbdc40f1a8bed8c205983ababd42ac67a6bc265e0470bf"
NGINX_CONF = Path("/etc/nginx/sites-enabled/apex-app-ssl")
NGINX_CONF_SHA256 = "298f4156fa12d8fc055f98be38961382e4ee6df17048f8d424112cc2408e8919"
FIXED_RELEASE_ID = "connect-unified-20261016"

# Byte-pinned student print privacy and real synthetic HTTP denial acceptance.
# These remain Core/Paper-owned; Connect only verifies their identity, never
# edits or duplicates their canonical application source.
CORE_PRIVACY_FILES = {
    "al-siddique-backend/src/services/assessmentPrintJobs.js": "f28b0f570dfcd29b4613553b1fd33b37ba5485a425c3c29552d91dc9f131dfa9",
    "al-siddique-backend/src/tests/assessment-print-jobs-domain.test.js": "5685096b5408b0420ed8b815cb5b2a3e67909e19aa31d212b8385c8cb0770ad8",
    "al-siddique-backend/src/tests/assessment-truefalse-student-projection-http-isolated.test.cjs": "08cbc63b106461ec92f7d2cf593844422ff8416570827bb3ece3425412d2b5d6",
}

CONNECT_FILES = {
    "src/app/api/proxy/[...path]/route.ts": "6868d0f211ad29d0ab5b9c6daf5290d8c6c9f302d44ffddf268f102bb072d815",
    "src/lib/server/mail.ts": "6caf69cf2597d5d776df1b7eb24c361f6a8bab5db5f9f2f16b50b72eee14636b",
    "tests/apex-legacy-proxy-failclosed.test.cjs": "5c225ebfee7fc801c7d10335ed933d2891609b5487adae1590aa515188187531",
}
REQUIRED = frozenset({
    "current_blue_rollback_archive_verified",
    "exact_reviewed_ai_worker_adapter_deployed",
    "global_worker_separated_and_authenticated",
    "independent_offhost_current_recovery_certified",
    "isolated_previously_reviewed_full_acl_backup",
    "live_worker_role_and_inherited_grants_verified",
    "original_school_marks_integrity_preserved",
    "production_nginx_configuration_valid",
    "production_restricted_signed_transport_enabled",
    "production_signed_catalog_safe",
    "real_signed_peer_school_and_subject_denial",
    "release_id_pinned",
    "trusted_external_owner_pinned_key",
})
PRIVATE_PATHS = (
    "/api/auth/me",
    "/api/saas-admin/subscription-requests",
    "/api/saas-admin/subscription-requests/export",
    "/api/saas-admin/apex-leads",
    "/api/saas-admin/apex-leads/stats",
    "/api/saas-admin/apex-leads/export",
    "/api/school/settings/current",
    "/api/settings/branding",
)

def digest(path):
    h = hashlib.sha256()
    with Path(path).open("rb") as file:
        for block in iter(lambda: file.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()

def reviewed_core_privacy_bytes(core):
    # Fail closed if any expected Core-owned assessed source/QA file drifts.
    try:
        return all(digest(core / rel) == approved_sha
                   for rel, approved_sha in CORE_PRIVACY_FILES.items())
    except OSError:
        return False


def command(*args, timeout=15):
    try:
        r = subprocess.run(args, text=True, capture_output=True, check=False, timeout=timeout)
        return r.returncode, r.stdout.strip()
    except (subprocess.SubprocessError, OSError):
        return 255, ""

def git_exact_clean(folder, expected):
    a, actual = command("git", "-C", str(folder), "rev-parse", "HEAD")
    b, dirty = command("git", "-C", str(folder), "status", "--porcelain")
    return a == 0 and actual == expected and b == 0 and not dirty

def signed_assessment(receipt, rc, independently_verified=False):
    # A self-written JSON document can NEVER sign itself or override official
    # production approval. Any false, absent, or non-official result is HOLD.
    if not isinstance(receipt, dict):
        return {"status": "HOLD", "passed": 0, "total": len(REQUIRED), "blocked": sorted(REQUIRED),
                "authentic_core_release": False}
    checks = receipt.get("checks", {})
    if not isinstance(checks, dict):
        checks = {}
    complete = set(checks) == REQUIRED and all(checks.get(k) is True for k in REQUIRED)
    # A copied JSON/exit-code pair is NEVER independent cryptographic proof.
    # Future work may integrate a byte-pinned direct trusted verifier invocation;
    # until then receipt-only inspection can report counts, never grant authority.
    signed = (independently_verified is True and rc == 0 and
              receipt.get("status") == "READY_FOR_LOGIN_ONLY_CORE"
              and receipt.get("signed_runtime_security_certified") is True
              and receipt.get("production_deployment_performed") is False
              and complete)
    return {"status": "READY_FOR_OWNER_REVIEW" if signed else "HOLD",
            "passed": sum(checks.get(k) is True for k in REQUIRED),
            "total": len(REQUIRED),
            "blocked": sorted(k for k in REQUIRED if checks.get(k) is not True),
            "authentic_core_release": bool(signed)}

def decide(technical, signed):
    if not all(technical.values()) or not signed.get("authentic_core_release", False):
        return "HOLD_NO_PRODUCTION_CUTOVER"
    # Even a complete signed PRE-cutover proves only owner review eligibility,
    # never an automated or performed deployment.
    return "ELIGIBLE_FOR_CORE_OWNER_REVIEW_NOT_DEPLOYED"

def secure_receipt(path, maximum_age_seconds=3600):
    try:
        st = path.stat()
        if not path.is_file() or st.st_uid != 0 or (st.st_mode & 0o077) or (
                time.time() - st.st_mtime > maximum_age_seconds or
                st.st_size > 100_000 or st.st_size < 5):
            return None
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError, TypeError):
        return None

def root_owned_pinned_file(path, expected_sha):
    """Reject symlink, non-root, group/world-writable and byte drift."""
    try:
        st = path.lstat()
        return (path.is_file() and not path.is_symlink() and st.st_uid == 0
                and not (st.st_mode & 0o022)
                and digest(path) == expected_sha)
    except OSError:
        return False


def invoke_pinned_official_core_gate():
    """Run canonical signed verifier; no external receipt payload grants trust."""
    if not (root_owned_pinned_file(OFFICIAL_CORE_GATE, OFFICIAL_CORE_GATE_SHA256)
            and root_owned_pinned_file(NGINX_CONF, NGINX_CONF_SHA256)):
        return {}, 255, False
    try:
        call = subprocess.run([
            sys.executable, str(OFFICIAL_CORE_GATE),
            "--release-id", FIXED_RELEASE_ID,
            "--approved-proxy-sha256", NGINX_CONF_SHA256,
            "--approved-build-id", CONNECT_BUILD_ID,
        ], capture_output=True, text=True, check=False, timeout=115)
        # Treat any other return as a failed verifier rather than accepting
        # arbitrary JSON from a crashed/untrusted process.
        if call.returncode not in (0, 2):
            return {}, call.returncode, False
        receipt = json.loads(call.stdout)
        if not isinstance(receipt, dict):
            return {}, 255, False
        return receipt, call.returncode, True
    except (ValueError, TypeError, OSError, subprocess.SubprocessError):
        return {}, 255, False


def public_status(path, timeout=6):
    url = "https://api.assps.edu.pk" + path
    try:
        with urlopen(Request(url, headers={"User-Agent": "ASSPS-ReadOnly-Release-Gate/1"}),
                     timeout=timeout) as response:
            return response.status
    except HTTPError as exc:
        return exc.code
    except (URLError, TimeoutError, OSError):
        return None

def runtime_probes():
    # Never send staff tokens, tenant IDs, credentials or body data. Save codes only.
    return {path: public_status(path) for path in ("/login",) + PRIVATE_PATHS}

def evaluate(core, connect, live, official, official_rc, smoke, probe=True, direct_official=False, trusted_execution=False):
    tech = {}
    tech["core_sha_and_clean"] = git_exact_clean(core, CORE_SHA)
    core_ancestor_rc, _ = command("git", "-C", str(core),
                                  "merge-base", "--is-ancestor",
                                  CORE_PARENT_SHA, "HEAD")
    tech["core_reviewed_parent"] = core_ancestor_rc == 0
    tech["core_student_print_privacy_exact"] = reviewed_core_privacy_bytes(core)
    try:
        tech["core_compiled_sha"] = digest(core/"al-siddique-frontend/dist/index.html") == CORE_DIST_SHA
    except OSError:
        tech["core_compiled_sha"] = False
    tech["connect_sha_and_clean"] = git_exact_clean(connect, CONNECT_SHA)
    a, _ = command("git", "-C", str(connect), "merge-base", "--is-ancestor",
                   CONNECT_PARENT_SHA, "HEAD")
    tech["connect_reviewed_parent"] = a == 0
    try:
        tech["connect_source_digests"] = all(
            digest(connect / name) == sha for name, sha in CONNECT_FILES.items())
    except OSError:
        tech["connect_source_digests"] = False
    try:
        tech["private_build_id"] = (connect/".next/BUILD_ID").read_text().strip() == CONNECT_BUILD_ID
        tech["compiled_next_server_exists"] = (connect/".next/server").is_dir()
        tech["public_build_remains_original"] = (
            (live/".next/BUILD_ID").read_text().strip() == PUBLIC_BUILD_ID)
    except OSError:
        tech["private_build_id"] = False
        tech["compiled_next_server_exists"] = False
        tech["public_build_remains_original"] = False
    evidence = secure_receipt(smoke, 24 * 3600)
    try:
        sha_ok = digest(smoke) == PRIVATE_HTTP_DIGEST
    except OSError:
        sha_ok = False
    checks = evidence.get("checks", {}) if isinstance(evidence, dict) else {}
    tech["private_http_byte_pinned"] = bool(
        sha_ok and evidence.get("decision") == "PRIVATE_HTTP_PASS"
        and evidence.get("expected_build_id") == CONNECT_BUILD_ID
        and evidence.get("production_changed") is False
        and evidence.get("independent_security_certified") is False
        and evidence.get("temporary_listener_terminated") is True
        and len(checks) == 11 and all(
            isinstance(v, dict) and v.get("route_ok") is True for v in checks.values()))
    if probe:
        live_codes = runtime_probes()
        tech["current_anonymous_deny"] = (
            live_codes.get("/login") == 200 and all(
                live_codes.get(key) == 401 for key in PRIVATE_PATHS))
    else:
        live_codes = {}
        tech["current_anonymous_deny"] = False
    if direct_official:
        official_fact = signed_assessment(official, official_rc,
                                          independently_verified=trusted_execution)
    else:
        official_fact = signed_assessment(secure_receipt(official), official_rc)
    result = {
        "scope": "CURRENT_READ_ONLY_CONNECT_CORE_E301_CANDIDATE",
        "production_mutation_performed": False,
        "build": CONNECT_BUILD_ID,
        "live_build": PUBLIC_BUILD_ID if tech["public_build_remains_original"] else "DRIFT_OR_UNKNOWN",
        "core_commit": CORE_SHA,
        "connect_commit": CONNECT_SHA,
        "technical": tech,
        "anonymous_http_statuses": live_codes,
        "signed_core": official_fact,
        "direct_official_verifier_executed": bool(direct_official and trusted_execution),
        "official_core_process_exit": official_rc,
        "decision": decide(tech, official_fact),
        "deployment_executed": False,
        "remaining": [
            "independent current offhost ACL/owner recovery",
            "signed persistent restricted worker transport and actual adapter",
            "separate authenticated worker and inherited grants witness",
            "genuine independently witnessed School2/unassigned-subject denial",
            "genuine staff marks Save-success/savedCount/GET acceptance",
            "owner-approved rollback, physical Urdu Diary print and postflight",
        ],
    }
    return result

def main():
    cli = argparse.ArgumentParser()
    cli.add_argument("--core", type=Path, required=True)
    cli.add_argument("--connect", type=Path, required=True)
    cli.add_argument("--live", type=Path, default=Path("/var/www/apex-connect"))
    cli.add_argument("--signed-core-receipt", type=Path, required=True)
    cli.add_argument("--signed-core-exit-receipt", type=Path, required=True)
    cli.add_argument("--private-http-receipt", type=Path, required=True)
    cli.add_argument("--skip-live-probes", action="store_true")
    cli.add_argument("--direct-official-recheck", action="store_true",
                     help="Re-execute SHA-pinned signed Core verifier, read-only; never use supplied receipt for authority")
    cli.add_argument("--output", type=Path)
    args = cli.parse_args()
    try:
        core_rc = int(args.signed_core_exit_receipt.read_text().strip())
    except (OSError, ValueError):
        core_rc = 255
    core_gate = args.signed_core_receipt
    trusted_execution = False
    if args.direct_official_recheck:
        core_gate, core_rc, trusted_execution = invoke_pinned_official_core_gate()
    report = evaluate(args.core, args.connect, args.live,
                      core_gate, core_rc, args.private_http_receipt,
                      probe=not args.skip_live_probes,
                      direct_official=args.direct_official_recheck,
                      trusted_execution=trusted_execution)
    data = json.dumps(report, sort_keys=True, indent=2) + "\n"
    if args.output:
        dest = args.output.resolve()
        if not dest.is_relative_to(Path("/root/assps-release-evidence")):
            raise SystemExit("Refusing unprotected output outside private evidence root")
        flags = os.O_WRONLY | os.O_CREAT | os.O_TRUNC
        fd = os.open(dest, flags, 0o600)
        with os.fdopen(fd, "w") as f:
            f.write(data)
        os.chmod(dest, 0o600)
    print(data)
    return 0 if report["decision"] == "ELIGIBLE_FOR_CORE_OWNER_REVIEW_NOT_DEPLOYED" else 2

if __name__ == "__main__":
    sys.exit(main())
