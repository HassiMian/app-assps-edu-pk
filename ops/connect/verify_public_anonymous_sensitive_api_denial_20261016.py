#!/usr/bin/env python3
"""Read-only production anonymous denial smoke for Connect private data APIs.

No cookies, credentials, POST, redirects, response body access or school records.
HTTP status alone cannot certify authenticated RLS or tenant isolation.
"""
from __future__ import annotations

import argparse
import json
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, Request, build_opener

ORIGIN = "https://apex.assps.edu.pk"
PROTECTED_GET_PATHS = (
    "/api/saas-admin/subscription-requests/export",
    "/api/saas-admin/apex-leads/export",
    "/api/saas-admin/subscription-requests",
    "/api/saas-admin/apex-leads",
    "/api/school/settings/current",
    "/api/settings/branding",
)


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def assess(path: str, status: int, location: str | None) -> bool:
    """This endpoint contract expects an unauthenticated 401, never a redirect."""
    return (path in PROTECTED_GET_PATHS and type(status) is int and status == 401
            and location is None)


def fetch(opener, path: str, timeout: int) -> tuple[int, str | None]:
    if path not in PROTECTED_GET_PATHS:
        raise ValueError("unlisted path")
    req = Request(ORIGIN + path, method="GET", headers={
        "User-Agent": "ASSPS-Connect-Anon-Denial-ReadOnly-Check",
        "Cache-Control": "no-store",
    })
    try:
        with opener.open(req, timeout=timeout) as resp:
            return resp.status, resp.headers.get("Location")
    except HTTPError as exc:
        return exc.code, exc.headers.get("Location")


def run(timeout: int = 8) -> dict:
    report = {
        "scope": "CONNECT_ANONYMOUS_PRIVATE_API_STATUS_ONLY",
        "origin": ORIGIN,
        "authenticated_tenant_isolation_certified": False,
        "production_modified": False,
        "checks": {},
    }
    opener = build_opener(NoRedirect())
    for path in PROTECTED_GET_PATHS:
        try:
            status, location = fetch(opener, path, timeout)
            report["checks"][path] = {
                "status": status,
                "denied": assess(path, status, location),
            }
        except (URLError, OSError, TimeoutError, ValueError):
            report["checks"][path] = {"denied": False, "error": "REQUEST_FAILED"}
    report["passed"] = sum(c["denied"] for c in report["checks"].values())
    report["total"] = len(PROTECTED_GET_PATHS)
    report["decision"] = ("ANONYMOUS_PRIVATE_API_DENIAL_PASS" if
                          report["passed"] == report["total"] else
                          "HOLD_ANONYMOUS_PRIVATE_API_DENIAL")
    return report


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--timeout", type=int, default=8)
    args = p.parse_args()
    if not 1 <= args.timeout <= 20:
        p.error("timeout must be 1..20")
    result = run(args.timeout)
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0 if result["decision"] == "ANONYMOUS_PRIVATE_API_DENIAL_PASS" else 2


if __name__ == "__main__":
    raise SystemExit(main())

