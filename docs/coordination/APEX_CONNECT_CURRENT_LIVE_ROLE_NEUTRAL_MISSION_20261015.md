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
- ACTUAL private optimized Next.js 16.2.6 build PASS, with full TypeScript and postbuild. Isolated compiled BUILD_ID bHxqXQ_9RXKfTeWRZ0lCs (public remains ONDwxEIZlx5onDIKY7wYf). Root-private complete build log SHA256 f86736e4aab857f143a3a52cd2ee81bec6fa54450b9091387cf193cc793d9f06.
- ACTUAL strict-TLS private Nginx -> compiled current-live Next -> Chromium 9/9 PASS, twice. First run: 71 private browser requests, 4 off-host blocked; second run: 64 private requests, 4 blocked. Role-neutral dashboard/nested redirects, teacher next=/teacher, anonymous auth/me401, no JS errors, verified TLS certificate. Temporary ports3016/3017 CLEAN on both runs. Second run log SHA256 76d9d2bca1d7bb18283d08ceef05562c4ac817b28dd4007bff464e9e0cd40f58. No staff credentials or off-host requests used.
- New candidate-build-pinned read-only PUBLIC anonymous guard plus 10/10 adversarial negative source tests. Actual public guard exit2/HOLD with 3/6 failing: current compiled build mismatch and both dashboard paths still seed admin. Private guard JSON SHA256 9b4dd36bfa2ed972d58ff62f6d25d73571c449586221559b98bdf8e32722238e. Anonymous guard PASS would never certify genuine staff, tenant or rollback.
- Official Core login-only verifier rerun against private candidate BUILD_ID and proxy SHA256 7978b360f2ccc235a086283463851f0c5a8c98390efd57b17476cc32b21fd015: EXIT2/HOLD on signed live worker, authentic peer school/subject denial and independently signed recovery, despite technical backup, marks and signed catalog checks passing. No live service changes.
- Core consolidated actual worker review branch fix/core-worker-laptop-consolidated-20261015 SHA 42da01ee5333eb90416591b72e0c7095bdacb020, follow-on node read-only acceptance b85dff94f450965140fe3d6aab7b252314407ebc. Running backend adapter was ABSENT when checked here.
- Core independently verified 4/4 real current encrypted offsite technical recovery on authenticated new laptop DESKTOP-MUH720M (issue #4). This is NOT independently signed institutional disaster recovery and does not constitute staff or peer-school acceptance.

## Mandatory fail-closed release gates

Official SaaS Core alone promotes shared backend, DB, Nginx, Next production.
Before any public release: genuine existing Muhammad Imran temporary-password change and authenticated relogin, independent authenticated existing school-2/unauthorized-subject HTTP denials, supervised signed Green worker installed in latest live backend preserving Weekly Notebook routes, independent authenticated human reviewer/owner SHA-bound release receipts, exact current Blue restore and rollout rollback, atomic Next+Nginx traffic cutover and postflight. No fake actors, synthetic signatures, password retrieval, or resetting real teacher credentials. School1 Exam9 baseline 1762 genuine marks with 213 actual zeros and immutable original digest must remain intact. Private isolated success is not public security certification.

Status by this Connect Master: **reviewed source candidate delivered; public cutover explicitly HOLD**.


## Integrated first-login temporary-password recovery (15 October)

**New latest-live-derived private QA candidate, not public:** /root/assps-release-candidates/apex-connect-login-challenge-current-live-20261015, built atop the earlier tested role-neutral current-live source. The earlier current-live snapshot and its private HTTPS browser proof are preserved unchanged.

A fresh current-live inspection identified an additional actual source defect explaining the reported teacher first-login blink/redirect loop: LoginClient previously called contextLogin immediately on a temporary-password response, before finishing the password-change challenge. This races canonical signed-session verification, which can redirect back to role choice/login. Selectively ported three previously reviewed modules only (not an old complete Next tree):

- src/components/LoginClient.tsx: do not hydrate an authenticated session on mustChangePassword; constrain challenge navigation to an exact local numeric userId URL; after a normal login, reverify actual server-issued HttpOnly session via /api/auth/me, match canonical user id and role/portal before opening the portal; add reset-password visibility.
- src/app/auth/change-password/page.tsx: accessible visibility controls for current, new, confirm password, preserving existing change-temporary-password API calls and clearing old local credentials after change.
- src/lib/server/auth-user.ts: reject reset-marked user's older portal JWT/cookie while role and tenant remain checked, no request-time database DDL or password reset.

The untouched actual latest Connect API login handler, teacher assessments/report-cards, unrelated api utility and role-neutral proxy were compared byte-for-byte with the previous current-live candidate.

**New exact next QA version:** private local source-snapshot Git SHA ff947da97858e76b628d66da5de857553b2cb342 (this is NOT a remote public production commit); actual optimized Next.js 16.2.6 build including TypeScript and postbuild exit0, BUILD_ID 1C7EPZhqltxUUzTMiDTwQ, build log SHA256 913b8c5a0edfae0c3420ecbea0e9405fcfe052788d864ea80e3995cad549c377. Auth file SHA256 (LoginClient) 3d45699280a63c0089b5b35a629b307306fc74f69eee684b5b3ac66c34f965b8, (password-change UI) 4f1087fae2f6d2c6d9457e8ea255ea1085b6b87002bb5a521b1e5eaea21860f6, (auth-user) 06c47ef8ff003f7425f9204ad08b4e5a6e25a13c3d6cde45cd07bfb46166cc90.

Actual tests against new candidate: 6/6 temporary-login/session role/tenant security checks, 10/10 legacy dashboard role-neutral checks, 2/2 auth logout-relogin race checks and isolated tsc noEmit PASS. Full optimized build PASS. Browser acceptance specific to this new **auth** candidate is **NOT VERIFIED** (the platform did not permit the attempted private replay); 9/9 strictly authenticated-TLS Chromium prior result is for the earlier routing-only candidate, not the newly built auth version. Do not substitute synthetic fixtures or static tests for Muhammad Imran's actual self-authenticated temporary password change and relogin.

A portable incremental review patch against the exact prior live-derived role-neutral QA source is published as docs/coordination/APEX_CONNECT_CURRENT_LIVE_AUTH_CHALLENGE_20261015.patch, SHA256 ee2be1cb43f332d743241eb0544189a29a912e9fa56670ce037e07609367dc40, with independent git apply --check PASS. Official Core release is still HOLD: running Next remains OND, worker adapter remains absent, real teacher/peer actor evidence and independent signed rollback receipts absent.


## Anonymous first-login 401 recovery (supersedes prior private auth build)

Actual isolated Chromium proved a second temporary-password bounce cause: expected anonymous /auth/me 401 during first-login on /auth/change-password was handled by the generic Axios refresh interceptor in src/utils/api.ts, which redirected the challenge to /login?cleared=1. That behavior is incorrect on the public login/challenge pages, which must NOT issue a portal session before password change.

Latest LIVE-derived private QA source 9fcca4320bdbeb834f6494d1af82d82f1d9b818f (LOCAL QA Git snapshot, not production Git ancestry) fixes exactly that anonymous probe. Real protected teacher/parent request 401 continues refresh, denial and sign-out. One-file source patch docs/coordination/APEX_CONNECT_CURRENT_LIVE_SESSION_PROBE_401_20261015.patch SHA256 6f89a4337e52d420c4613cd8f1b8fd7d7f316df447ae155b454071700424a232 passed git apply --check against exact prior live-derived QA source. API module SHA256 9e2a2d314374da65f92d4d8b873197c937005204c5aeb83de0d5edf1b5431332.

ACTUALLY executed latest complete optimized Next.js 16.2.6 build/TypeScript/postbuild exit0, isolated BUILD_ID rc1vIlE6prAQ8pHrw7ohX, build log SHA256 02952c80927047be72648cef013472a993143c319e627014c258f705ad12ec04. 7/7 new Axios interceptor positive/negative checks PASS, 9/9 actual private trusted-TLS Nginx->Next->Chromium route checks PASS (65 private browser requests, four outside blocked), and **10/10 controlled real Chromium UI checks PASS** for browser-intercepted synthetic temporary-password challenge, successful landing and remaining on change-password page, no administrator entry, 3 masked fields, accessible show/hide toggles and no JS errors. Tests contain no genuine school staff credentials. Both temporary test ports were cleaned up. Portable source browser test and isolated Axios contract test are under ops/connect/. Earlier private BUILD_ID 1C7EPZhqltxUUzTMiDTwQ has been superseded.

Private browser test is not a genuine Muhammad Imran teacher authenticated login or real peer-school/subject denial; no human signed approval or live production service promotion. Public ONDwxEIZlx5onDIKY7wYf, canonical student marks, staff accounts and latest Paper Studio lesson routes preserved. SaaS Core release decision HOLD until genuine signed acceptance.
