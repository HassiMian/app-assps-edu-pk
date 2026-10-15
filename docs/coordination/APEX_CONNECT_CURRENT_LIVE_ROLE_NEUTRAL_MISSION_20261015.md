# APEX Connect — current-live Next role-neutral ingress mission (15 Oct 2026)

**Release: HOLD.** This branch is Connect source-only, not a Core production promotion.

## Production provenance and tested source

- Actual public Next build ID: ONDwxEIZlx5onDIKY7wYf, from /var/www/apex-connect. Public anonymous /dashboard still HTTP307 to /login?next=/admin. Public /teacher correctly preserves next=/teacher, and anonymous /api/auth/me returns 401.
- Reviewed earlier standalone Next role-neutral source 492429340504224a8984a33403d585c747d38fde is NOT the latest actual live application source. Current live source contains newer teacher, password-change, assessments and API components. None of these were replaced.
- Private live-derived source candidate: /root/assps-release-candidates/apex-connect-role-neutral-current-live-20261015. No private .env copied; dependencies are independent bytes, not a symlink into production.
- The actual live directory has no Git metadata. A **private reconstructed QA Git snapshot** was created solely for the existing renderer provenance check. Private baseline SHA 67db5bff39f36e72ab14d4acd2b4a7448bb0d40b and QA patched SHA 1671d463d5b88bfdc7e207454928775a7314f6a3 are NOT original public GitHub release commits. All six renderer files matched this local QA commit.
- Source changes in six-file minimal patch docs/coordination/APEX_CONNECT_CURRENT_LIVE_ROLE_NEUTRAL_20261015.patch, SHA256 23764b1c2fed49af8a3810258cb422499e5f1f14cddc62151b8a1feae11e127a. Git apply --check PASS on exact independent QA baseline. Do not apply to the SaaS Vite or other Next branches without reviewing ancestry.

## Actual repair

1. Remove Next config static unconditional /dashboard and /dashboard/:path* -> /admin redirects, a separate route-precedence root cause left by previous patches. Explicit isolated Turbopack root keeps its compiler within the intended private source tree.
2. Proxy anonymous dashboard redirects only to neutral /login; legacy dashboard next query loses stale admin target.
3. Client dashboard unknown-role fallback sends /login, not admin.
4. Nested dashboard fallback sends /login if middleware is bypassed.
5. Role-route mapper resolves legacy dashboard for explicit authenticated teacher, parent, student or admin role, and fails unknown roles to /login.
6. TypeScript excludes preserved src-backup-* folders (not removed) from active compile, to avoid compiling old unused source.

Existing current-live LoginClient, password-change, teacher assessments, auth-user and api.ts remained byte-identical in stage. No production source files, database, PM2, Nginx or school records changed.

## Verification, exact distinction

- 16/16 custom current-live source/role-negative/unchanged-component tests PASS. Rerunnable with CONNECT_STAGE_ROOT pointing at private candidate, using ops/connect/test-current-live-role-neutral-20261015.cjs.
- Independent TypeScript noEmit check PASS after excluding backed-up unused sources.
- Optimized production build: recorded separately once fully finished. A successful bundler compilation alone is not a full production build and is not traffic acceptance.
- Real private HTTPS Nginx/Chromium: require separate actual executable result. Do not claim browser acceptance from source tests.
- Core consolidated actual worker review branch fix/core-worker-laptop-consolidated-20261015 SHA 42da01ee5333eb90416591b72e0c7095bdacb020, follow-on node read-only acceptance b85dff94f450965140fe3d6aab7b252314407ebc. Running backend adapter was ABSENT when checked here.
- Core independently verified 4/4 real current encrypted offsite technical recovery on authenticated new laptop DESKTOP-MUH720M (issue #4). This is NOT independently signed institutional disaster recovery and does not constitute staff or peer-school acceptance.

## Mandatory fail-closed release gates

Official SaaS Core alone promotes shared backend, DB, Nginx, Next production.
Before any public release: genuine existing Muhammad Imran temporary-password change and authenticated relogin, independent authenticated existing school-2/unauthorized-subject HTTP denials, supervised signed Green worker installed in latest live backend preserving Weekly Notebook routes, independent authenticated human reviewer/owner SHA-bound release receipts, exact current Blue restore and rollout rollback, atomic Next+Nginx traffic cutover and postflight. No fake actors, synthetic signatures, password retrieval, or resetting real teacher credentials. School1 Exam9 baseline 1762 genuine marks with 213 actual zeros and immutable original digest must remain intact. Private isolated success is not public security certification.

Status by this Connect Master: **reviewed source candidate delivered; public cutover explicitly HOLD**.
