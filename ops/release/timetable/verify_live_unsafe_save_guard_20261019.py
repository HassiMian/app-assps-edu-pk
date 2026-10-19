#!/usr/bin/env python3
"""Safe anonymous HTTP check of P0 Nginx Timetable Save quarantine.

The only POST body is a JSON empty object; it has neither authorization nor
valid entries. An unguarded backend returns 401; this probe cannot mutate data.
No token, PII, or authentication material is included.
"""
import json
import ssl
import urllib.error
import urllib.request
import sys

HOSTS = (
    "api.assps.edu.pk",
    "app.assps.edu.pk",
    "www.assps.edu.pk",
    "apex.assps.edu.pk",
)

def check(host, opener=None):
    url = "https://" + host + "/api/timetable/save"
    request = urllib.request.Request(
        url,
        data=b'{}',
        headers={"Content-Type": "application/json", "Cache-Control": "no-store"},
        method="POST",
    )
    opener = opener or urllib.request.urlopen
    try:
        with opener(request, timeout=12) as response:
            status = response.status
    except urllib.error.HTTPError as err:
        status = err.code
    return {"host": host, "status": status, "guardPass": status == 403}

def verdict(results):
    return {"status": "P0_INGRESS_DENY_PASS" if
            len(results) == len(HOSTS) and
            {r["host"] for r in results} == set(HOSTS) and
            all(r["guardPass"] for r in results) else "HOLD",
            "doesNotProveBackendFixed": True,
            "requiresSecureReplacementBeforeUnblocking": True,
            "checks": results}

def main():
    results = []
    for host in HOSTS:
        try:
            results.append(check(host))
        except Exception as exc:
            results.append({"host": host, "status": None,
                            "guardPass": False,
                            "error": type(exc).__name__})
    result = verdict(results)
    print(json.dumps(result, sort_keys=True))
    return 0 if result["status"] == "P0_INGRESS_DENY_PASS" else 2

if __name__ == "__main__":
    sys.exit(main())
