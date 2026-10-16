# APEX Connect — anonymous route drift acceptance (2026-10-16)

## Ownership and source

Base: integration/connect-phase-gate-lint-20261016 at 602ae2035bc3fb0055b15d4d7dc3044d960b6ad8.
Isolated source: audit/connect-live-anon-route-drift-20261016.
Scope: Connect-only diagnostic and hermetic unit tests. No SaaS Core/DB/Paper Studio/production change.

## Actual read-only evidence

Public https://apex.assps.edu.pk checked without credentials, cookies, redirect following, or response-body storage:
- /login: 200 PASS.
- /api/auth/me: 401 PASS.
- /teacher: 302 with login next=/teacher PASS.
- /dashboard: 307 login next=/admin, TARGET CONTRACT DRIFT.
- /dashboard/history: 307 login next=/admin, TARGET CONTRACT DRIFT.

The reviewed private role-neutral Next candidate Build ID SAsg3cC_el5cq2_nN2a46 passes all five strict private loopback routes and terminates its temporary process. Its dashboard redirects are clean /login. Current public target route probe returns HOLD_ANONYMOUS_ROUTE_DRIFT 3/5 exit 2. This does not establish leakage or authenticated user/tenant approval.

Protected evidence: /root/assps-release-evidence/connect-public-route-drift-20261016/public-route-report.json and public-route-report.rc, both mode 0600; JSON SHA256 1d117066b1b27dc7ffe5b597c53104410dd5c8727178c5855c570e453bc134bc.

Existing Core release gate re-run against audit/core-unsigned-rls-matrix-20261016 at 017d51060349e39150ebd508d0d670c10eb15f5f: phase 1/2 PASS, 13/15 technical, signed Core 6/13, exit2/HOLD. Seven signer/worker/offhost/backup/peer-denial gaps remain real.

## New source and execution

- ops/connect/verify_public_anonymous_routes_20261016.py pins the public HTTPS origin, tests only five fixed unauthenticated routes, never follows redirects, emits aggregate/status-only JSON and fails closed with exit 2 on route drift. No deployment or security certification authority.
- ops/connect/test_verify_public_anonymous_routes_20261016.py adds 11 pure regression tests for exact redirects, foreign hosts, duplicate next, loops, protected-200 and boolean-status rejection.
- .github/workflows/connect-crossowner-release-contract.yml includes the paths in both CI change filters and runs hermetic regression tests only, not public network traffic.
- Full local Connect Python suite: 161/161 PASS. Pinned Node negative-security tests: 8/8 PASS. Actual production-target probe: 3/5 HOLD, expected for legacy public build.

## Release use

Use this as a post-cutover anonymous route-acceptance guard ONLY after SaaS Core officially certifies independent signed worker/authentication/peer-school denial, fresh ACL backup, offhost recovery and backup/rollback proof. A false outcome after approved promotion is a reason for Core to investigate/rollback, not a reason to bypass gates. A 200 public root or anonymous login redirect is never evidence of real tenant RLS. Do not modify school records or existing student marks/results for this test.

