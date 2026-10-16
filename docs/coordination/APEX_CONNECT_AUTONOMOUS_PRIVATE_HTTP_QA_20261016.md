# APEX Connect — Zero-routine-human private Next HTTP acceptance (16 Oct 2026)

Connect-owned **source-only** addition: `ops/connect/smoke_private_next_http_20261016.py` with 18 adversarial unit tests.

The smoke command accepts **only** Next builds under `/root/assps-release-candidates`, exact BUILD_ID and existing build/dependencies. It launches the selected immutable candidate on a disposable **127.0.0.1-only** port, refuses automatic redirects, checks `/dashboard`, `/dashboard/history`, `/teacher`, `/login`, and `/api/auth/me`, then terminates the entire private process group even after failures. It rejects stale admin fallback and 200 anonymous protected data. Any mismatched build or route fails closed.

Example (private, no public reload):
```sh
python3 ops/connect/test_smoke_private_next_http_20261016.py
python3 ops/connect/smoke_private_next_http_20261016.py --next-stage /root/assps-release-candidates/apex-connect-login-challenge-current-live-20261015 --expected-build-id rc1vIlE6prAQ8pHrw7ohX
```

**Evidence boundary:** anonymous localhost route QA does NOT certify signed teacher/peer-school identity, worker transport, production release readiness or Ed25519 independent receipts. It does not modify Nginx, PM2, live SaaS, school marks, diary records, passwords or physical printer state. SaaS Core retains full joint release/rollback authority.
