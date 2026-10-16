#!/usr/bin/env python3
"""Read-only anonymous HTTPS post-cutover contract for APEX Connect.

Checks routing only; does not authenticate, use cookies, access school records,
certify signed RLS, or authorize any release.
"""
from __future__ import annotations

import argparse
import json
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

ORIGIN = "https://apex.assps.edu.pk"
EXPECTED_PUBLIC_BUILD = "SAsg3cC_el5cq2_nN2a46"
PROVENANCE_PATH = "/api/build-provenance"
ROUTES = ("/login", "/api/auth/me", "/dashboard",
          "/dashboard/history", "/teacher")


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def acceptable_login_redirect(path: str, location: str | None) -> bool:
    if not isinstance(location, str) or not location:
        return False
    try:
        target = urlsplit(location)
    except ValueError:
        return False
    # Only a relative URL or the exact pinned HTTPS production origin is valid.
    if target.netloc or target.scheme:
        if target.scheme != "https" or target.netloc != "apex.assps.edu.pk":
            return False
    if (target.path != "/login" or target.fragment or target.username is not None
            or target.password is not None):
        return False
    query = parse_qs(target.query, keep_blank_values=True)
    return query == ({"next": ["/teacher"]} if path == "/teacher" else {})


def assess(path: str, status: int, location: str | None) -> bool:
    if path not in ROUTES or type(status) is not int:
        return False
    if path == "/login":
        return status == 200 and not location
    if path == "/api/auth/me":
        return status == 401 and not location
    return status in (302, 303, 307, 308) and acceptable_login_redirect(path, location)


def fetch(opener, path: str, timeout: int) -> tuple[int, str | None]:
    req = Request(ORIGIN + path, method="GET", headers={
        "User-Agent": "ASSPS-Connect-Anonymous-ReadOnly-Route-Check",
        "Cache-Control": "no-store",
    })
    try:
        with opener.open(req, timeout=timeout) as response:
            return response.status, response.headers.get("Location")
    except HTTPError as exc:
        return exc.code, exc.headers.get("Location")


def reject_duplicate_json_keys(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate key in build provenance")
        result[key] = value
    return result


def check_build_provenance(opener, timeout: int) -> dict:
    # Never return the response body or untrusted source metadata in evidence.
    request = Request(ORIGIN + PROVENANCE_PATH, method="GET", headers={
        "User-Agent": "ASSPS-Connect-ReadOnly-Provenance-Check",
        "Cache-Control": "no-store",
    })
    try:
        with opener.open(request, timeout=timeout) as response:
            if response.status != 200:
                return {"status": response.status, "route_ok": False}
            raw = response.read(16385)
            if len(raw) > 16384:
                return {"status": 200, "route_ok": False}
            data = json.loads(raw, object_pairs_hook=reject_duplicate_json_keys)
            passed = (isinstance(data, dict) and
                      data.get("buildId") == EXPECTED_PUBLIC_BUILD)
            return {"status": 200, "route_ok": passed}
    except (HTTPError, URLError, OSError, TimeoutError, ValueError, TypeError):
        return {"route_ok": False, "error": "PROVENANCE_CHECK_FAILED"}


def run(timeout: int = 8) -> dict:
    out = {"scope": "PUBLIC_ANONYMOUS_CONNECT_POSTCUTOVER_CONTRACT",
           "origin": ORIGIN, "authenticated_security_certified": False,
           "production_modified": False, "checks": {}, "decision": "HOLD"}
    opener = build_opener(NoRedirect())
    for path in ROUTES:
        try:
            status, location = fetch(opener, path, timeout)
            out["checks"][path] = {"status": status,
                                   "route_ok": assess(path, status, location)}
        except (URLError, OSError, TimeoutError, ValueError):
            out["checks"][path] = {"route_ok": False, "error": "REQUEST_FAILED"}
    out["checks"][PROVENANCE_PATH] = check_build_provenance(opener, timeout)
    out["passed"] = sum(check["route_ok"] for check in out["checks"].values())
    out["total"] = len(ROUTES) + 1
    out["decision"] = "ANONYMOUS_ROUTE_CONTRACT_PASS" if out["passed"] == out["total"] else "HOLD_PUBLIC_RELEASE_CONTRACT"
    return out


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--timeout", type=int, default=8)
    args = parser.parse_args()
    if not 1 <= args.timeout <= 20:
        parser.error("timeout must be 1..20 seconds")
    result = run(args.timeout)
    print(json.dumps(result, sort_keys=True, indent=2))
    return 0 if result["decision"] == "ANONYMOUS_ROUTE_CONTRACT_PASS" else 2


if __name__ == "__main__":
    raise SystemExit(main())

