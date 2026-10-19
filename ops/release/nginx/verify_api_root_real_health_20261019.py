#!/usr/bin/env python3
"""Read-only live acceptance probes. Never sends write requests or credentials."""
import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

BASE = "https://app.assps.edu.pk"
CASES = (
    (BASE + "/", 200, None),
    (BASE + "/login", 200, None),
    (BASE + "/api/", 200, "backend-health"),
    ("https://api.assps.edu.pk/health", 200, "api-domain-health"),
    (BASE + "/api/school/public-branding?school_code=assps", 200, "public-branding"),
    (BASE + "/api/timetable/save", 403, None),
    (BASE + "/api/lesson-plans", 401, None),
)
failures = 0
for url, expected, kind in CASES:
    req = Request(url, headers={"User-Agent": "ASSPS-Core-ReadOnly-Release-Probe/1"})
    try:
        with urlopen(req, timeout=8) as resp:
            status, body = resp.status, resp.read(65536)
    except HTTPError as e:
        status, body = e.code, e.read(65536)
    except URLError as e:
        print("FAIL", url, "unreachable:", e)
        failures += 1
        continue
    ok = status == expected
    if ok and kind:
        try:
            payload = json.loads(body)
            if kind == "backend-health":
                ok = payload.get("success") is True and payload.get("status") == "ok"
            elif kind == "api-domain-health":
                ok = payload.get("status") == "ok" and payload.get("service") == "super-app"
            else:
                ok = payload.get("success") is True and all(
                    key in payload.get("data", {}) for key in ("schoolName", "primaryColor", "secondaryColor")
                )
        except (ValueError, TypeError, AttributeError):
            ok = False
    print(("PASS" if ok else "FAIL"), status, "expected", expected, url)
    failures += int(not ok)
raise SystemExit(1 if failures else 0)
