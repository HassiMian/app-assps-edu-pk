#!/usr/bin/env python3
"""Run an existing built Next candidate on loopback and fail closed on login-route regressions.

This checks anonymous HTTP behavior only: it never claims teacher login,
cross-school access, signed security acceptance, or production cutover.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path
import signal
import socket
import subprocess
import sys
import tempfile
import time
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlparse
from urllib.request import HTTPRedirectHandler, build_opener

PRIVATE_API_PATHS = (
    "/api/saas-admin/subscription-requests/export",
    "/api/saas-admin/apex-leads/export",
    "/api/saas-admin/subscription-requests",
    "/api/saas-admin/apex-leads",
    "/api/school/settings/current",
    "/api/settings/branding",
)
PATHS = ("/dashboard", "/dashboard/history", "/teacher", "/login", "/api/auth/me") + PRIVATE_API_PATHS
ALLOWED_ROOT = Path("/root/assps-release-candidates")
REVIEWED_BUILD_STAGE = Path("/root/workspace/apex-connect-eslint-full-source-reconcile-20261016")
REVIEWED_BUILD_ID = "SAsg3cC_el5cq2_nN2a46"
REVIEWED_SOURCE = "9fcca4320bdbeb834f6494d1af82d82f1d9b818f"
REVIEWED_LINT_SHA = "520ddbd1a0d347a8e3d12e2fce14c4a2ca8b700cb87cf93be3c65efb449b8b83"


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def assess(path: str, status: int, location: str | None) -> bool:
    if path == "/login":
        return status == 200 and not location
    if path == "/api/auth/me" or path in PRIVATE_API_PATHS:
        return status == 401 and not location
    if path not in PATHS or status not in (302, 303, 307, 308) or not location:
        return False
    target = urlparse(location)
    if target.scheme not in ("", "http") or target.hostname not in (None, "127.0.0.1", "localhost"):
        return False
    if target.path != "/login" or target.fragment:
        return False
    query = parse_qs(target.query, keep_blank_values=True)
    if path == "/teacher":
        return query == {"next": ["/teacher"]}
    return query == {}


def safe_stage(stage: Path, expected_build: str) -> bool:
    stage = stage.resolve()
    is_original_private = stage.is_relative_to(ALLOWED_ROOT) and stage != ALLOWED_ROOT
    is_exact_compiled_qa = stage == REVIEWED_BUILD_STAGE and expected_build == REVIEWED_BUILD_ID
    if not (is_original_private or is_exact_compiled_qa):
        return False
    if is_exact_compiled_qa:
        # The new workspace exception is one exact reviewed SHA/build/config, not
        # a blanket permission for arbitrary /root/workspace applications.
        try:
            src = subprocess.run(["git", "-C", str(stage), "rev-parse", "HEAD"],
                                 capture_output=True, text=True, check=True, timeout=5)
            if src.stdout.strip() != REVIEWED_SOURCE:
                return False
            digest = hashlib.sha256((stage / "eslint.config.mjs").read_bytes()).hexdigest()
            if digest != REVIEWED_LINT_SHA:
                return False
        except (OSError, subprocess.SubprocessError):
            return False
    build_id = stage / ".next" / "BUILD_ID"
    next_bin = stage / "node_modules" / ".bin" / "next"
    try:
        return (build_id.read_text().strip() == expected_build and
                next_bin.exists() and os.access(next_bin, os.X_OK) and
                (stage / ".next" / "server").is_dir())
    except OSError:
        return False


def request(opener, port: int, path: str) -> tuple[int, str | None]:
    try:
        with opener.open(f"http://127.0.0.1:{port}{path}", timeout=4) as response:
            return response.status, response.headers.get("Location")
    except HTTPError as exc:
        return exc.code, exc.headers.get("Location")


def choose_loopback_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def run(stage: Path, expected_build: str, timeout: int = 25) -> dict:
    result = {"scope": "PRIVATE_LOOPBACK_ANONYMOUS_CONNECT_HTTP",
              "expected_build_id": expected_build,
              "production_changed": False,
              "independent_security_certified": False,
              "checks": {}, "decision": "HOLD"}
    if not safe_stage(stage, expected_build):
        result["error"] = "UNAPPROVED_STAGE_OR_BUILD"
        return result
    opener = build_opener(NoRedirect())
    port = choose_loopback_port()
    process = None
    try:
        with tempfile.TemporaryFile(mode="w+t") as logfile:
            process = subprocess.Popen(
                [str(stage / "node_modules" / ".bin" / "next"), "start",
                 "-p", str(port), "-H", "127.0.0.1"],
                cwd=str(stage), stdout=logfile, stderr=subprocess.STDOUT,
                start_new_session=True,
                env={**os.environ, "NODE_ENV": "production"},
            )
            deadline = time.monotonic() + timeout
            ready = False
            while time.monotonic() < deadline:
                if process.poll() is not None:
                    break
                try:
                    ready = request(opener, port, "/login")[0] == 200
                    if ready:
                        break
                except (URLError, TimeoutError, ConnectionError, OSError):
                    pass
                time.sleep(0.35)
            if not ready:
                result["error"] = "PRIVATE_NEXT_START_FAILED"
                return result
            for path in PATHS:
                try:
                    status, location = request(opener, port, path)
                    result["checks"][path] = {"status": status,
                        "route_ok": assess(path, status, location)}
                except (URLError, TimeoutError, ConnectionError, OSError):
                    result["checks"][path] = {"route_ok": False, "error": "HTTP_REQUEST_FAILED"}
            result["decision"] = "PRIVATE_HTTP_PASS" if (
                len(result["checks"]) == len(PATHS) and
                all(value["route_ok"] for value in result["checks"].values())
            ) else "PRIVATE_HTTP_FAIL"
    except (OSError, ValueError, subprocess.SubprocessError) as exc:
        result["error"] = type(exc).__name__
    finally:
        if process is not None:
            try:
                os.killpg(process.pid, signal.SIGTERM)
            except ProcessLookupError:
                pass
            try:
                process.wait(timeout=6)
            except subprocess.TimeoutExpired:
                os.killpg(process.pid, signal.SIGKILL)
                process.wait(timeout=5)
    result["temporary_listener_terminated"] = process is None or process.poll() is not None
    if not result["temporary_listener_terminated"]:
        result["decision"] = "HOLD"
    return result


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--next-stage", required=True, type=Path)
    p.add_argument("--expected-build-id", required=True)
    p.add_argument("--timeout", type=int, default=25)
    args = p.parse_args()
    result = run(args.next_stage.resolve(), args.expected_build_id, args.timeout)
    print(json.dumps(result, sort_keys=True, indent=2))
    return 0 if result["decision"] == "PRIVATE_HTTP_PASS" and result.get("temporary_listener_terminated") else 2


if __name__ == "__main__":
    sys.exit(main())
