# ASSPS Release Candidate RC2 - Security And Source Authority

Date: 2026-09-14

Status: `RC2_LOCAL_SECURITY_GUARDS_ADDED_NO_DEPLOY`

## Scope

RC2 isolates production trust and source-authority guardrails. It is not a broad app release.

No production deploy, no production database write, and no production restart were performed.

## Candidate Files

Backend source authority and auth:

- `al-siddique-backend/src/middleware/auth.js`
- `al-siddique-backend/src/routes/authRoutes.js`
- `al-siddique-backend/src/routes/dashboardRoutes.js`
- `al-siddique-backend/src/routes/aiAnalyticsRoutes.js`

Validation tooling:

- `ops/production-safety-check.js`
- `ops/tests/production-auth.test.js`
- `ops/verify-local.js`

Supporting docs:

- `runtime/ASSPS_RELEASE_CANDIDATE_RC2_SECURITY_SOURCE_AUTHORITY_20260914.md`

## Local Fixes Added

Production demo login:

- `DEMO_LOGIN_ENABLED` is now development-only in `authRoutes.js`.
- Even if `DEMO_LOGIN_ENABLED=true` is accidentally present in production, demo login code remains disabled by `NODE_ENV === 'production'`.

Production service credential:

- `JARVIS_SCHOOL_SERVICE_TOKEN_SHA256` alone is no longer enough in production.
- Production service tokens now also require explicit:
  - `JARVIS_SCHOOL_SERVICE_IDENTITY`
  - `JARVIS_SCHOOL_SERVICE_TENANT_ID`
  - `JARVIS_SCHOOL_SERVICE_SCHOOL_ID`
- Service tenant claim mismatch fails closed.

Dashboard source authority:

- Dashboard critical query failures now return `503` instead of silently converting DB errors into empty rows/zero metrics.
- Class stats query failure returns `503`.
- Activity feed query failure returns `503`.

Production safety lint:

- Added static checks that demo login remains development-only.
- Added static check that dashboard has a fail-closed DB unavailable path.

Behavior tests:

- Added production service-token tests:
  - missing production service claims -> 403
  - tenant mismatch -> 403

## Validation Completed

`node --test ops/tests/*.test.js`

- PASS.
- 13 passed, 0 failed.

`npm run verify:local`

- PASS.
- Production safety check: PASS.
- Backend/ops syntax: PASS, 64 files.
- PowerShell deploy helper parse: PASS.
- Ops regression tests: PASS, 13 passed.
- Frontend production build: PASS.

`npm run live:contract`

- PASS.
- Public app/API/apex surface reachable.
- Protected student/fee/notify routes reject no-token.
- Protected student route rejects `mock-jwt-token`.

## Not Yet Proven

RC2 is still not production accepted because these tests are not complete:

- full role/tenant matrix for principal/admin/accountant/teacher/parent/student;
- parent cannot read another child;
- student cannot read another student;
- teacher cannot read unassigned class/student records;
- accountant cannot change academic records;
- dashboard `503` behavior against a controlled failing DB in an integration harness;
- route-level readiness beyond `/health`.

## Decision

`RC2_READY_FOR_LOCAL_REVIEW_NO_DEPLOY`

RC2 can move toward production review only after targeted role/tenant tests and route-level smoke tests are added.
