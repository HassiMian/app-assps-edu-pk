# ASSPS SaaS Core + APEX Connect — joint current-live precutover mission

Date: 15 October 2026 (PKT). Coordination: GitHub issue #4. **RELEASE: HOLD.**

This review integrates the actual latest Core owner source, Connect current-live-derived production build, real PostgreSQL permission checks, recent owner-laptop recovery facts and official fail-closed release gate. This branch is source-only. It is not a production deployment or human-signed institutional approval.

## Exact verified source and production identities

- SaaS Core owner base: fix/core-worker-laptop-consolidated-20261015 @ 2782179f6ed0d3658ed8d7025cd5a7908b7ebdd0; verified local and remote.
- Connect owner source: ops/connect-current-live-role-neutral-ingress-20261015 @ 859ee13f367db8e755a8b4e88c4ca65b6dd5feac (latest first-login auth patch; earlier role-only source 17097ce5 remains ancestor); verified local and remote.
- Actual public Next runtime: ONDwxEIZlx5onDIKY7wYf. Public /dashboard and nested /dashboard/history remain admin-biased. No public Next release was performed.
- Newest fully built, private browser acceptance NOT YET CERTIFIED for auth-updated Next: 1C7EPZhqltxUUzTMiDTwQ. Earlier route-only candidate bHxqXQ_9RXKfTeWRZ0lCs separately passed private Chromium 9/9 twice. Exact compiled candidate proxy SHA256 7978b360f2ccc235a086283463851f0c5a8c98390efd57b17476cc32b21fd015.
- Running backend restricted AI worker adapter: ABSENT. Latest live weekly Lesson Plans route SHA256 435cf755904dcd7fdf74189d5a99d267b8ace98a6627c9180a2375e9dfaaf74f remains protected.

## Actual new engineering completed in this mission

Identified stale Core worker staging from an earlier commit (worker adapter hash 9b76d097...). Re-ran the latest SaaS Core-approved stage-current-live-backend-ai-worker-20261015.sh from EXACT owner commit 2782179f into a NEW root-only destination, preserving live server and new Lesson Plans modules. Current staged hardened adapter SHA256 is 97090fee75c77283375141e21d572d52a1a9fe58952ff16a4584ca9f308592cc. All three staged worker files match the current Core source byte-for-byte, and no .env private credentials were copied.

Actual standalone Node execution loaded THIS current hardened staged adapter in signed Green mode with the production separate SCRAM worker identity, not a mock: authorized SELECT from ai_jobs PASS; forbidden SELECT from organizations, campuses, admin_block_audit_log all denied PostgreSQL 42501. No table writes were executed. The running public backend has not installed this adapter.

Added a canonical two-workstream source and rollback attestation script, ops/release/signed-bluegreen/verify-joint-current-candidates-20261015.py. It pins Core source ancestor, Connect exact Git SHA, current hardened adapter hash, three reviewed worker modules, current live backend/lesson route parity, compiled Next BUILD_ID and proxy hash, environment-secret exclusion, protected current full-ACL database dump and current Blue Next+Nginx rollback archive. It also invokes the existing official Core release verifier when requested; it explicitly never deploys, signs, impersonates, issues tokens, changes passwords, or writes SQL.

Actual joint combined attestation: 19/19 current static technical/source/backup/auth-hash checks PASS, explicit separate status technical_candidate_status=PASS, overall_production_release=HOLD. Added 14/14 pure fail-closed regression tests (stale adapter/caller, drifted live lesson/server, wrong Next build/proxy, missing compiled output and accidental secret copying). These tests do not certify authenticated staff behavior.

Previously independently proven private strict-TLS Nginx -> Next -> Chromium behavior: 9/9 twice for the EARLIER ROUTING-ONLY build bHxqXQ_9RXKfTeWRZ0lCs (NOT auth-updated 1C7EPZhqltxUUzTMiDTwQ), 71 and 64 private requests, four off-host requests blocked each run; no real user session was involved. New Core scoped worker actual Node checks were independently re-run above for HEAD 278.

## Additional current-live teacher temporary-password challenge fix

Found the actual still-running Connect LoginClient prematurely called contextLogin on success even when mustChangePassword=true, racing signed-session checks and plausibly explaining the observed teacher role-chooser blink. Safely ported ONLY three previously reviewed auth files on top of the already corrected LIVE-derived routing candidate: LoginClient challenge handling + canonical HttpOnly /api/auth/me relogin role/user binding, current/new/confirmation password visibility UI and auth-user rejection of stale reset-required signed cookies. Preserved current live login API and teacher assessment/report cards. No real teacher account or password accessed or reset.

This independently rebuilt private Next.js 16.2.6 optimized source + TS + postbuild EXIT0 with BUILD_ID 1C7EPZhqltxUUzTMiDTwQ, locally source-staged Git QA SHA ff947da97858e76b628d66da5de857553b2cb342 (not genuine public GitHub production ancestry); log SHA256 913b8c5a0edfae0c3420ecbea0e9405fcfe052788d864ea80e3995cad549c377. New Connect published source SHA 859ee13f367db8e755a8b4e88c4ca65b6dd5feac, auth patch SHA256 ee2be1cb43f332d743241eb0544189a29a912e9fa56670ce037e07609367dc40; patch git apply --check PASS on exact previous live-derived candidate. Actual new candidate tests: temporary login 6/6 PASS, role-neutral 10/10 PASS, logout/relogin epoch 2/2 PASS, standalone TypeScript PASS and full optimized build PASS. **New private auth-candidate Chromium acceptance was not executed** (platform prevented replay); prior role-only 9/9 tests are not a substitute, and all genuine Muhammad Imran/peer-school authenticated release gates remain missing.

Joint Core/Connect verifier now SHA-pins all three reviewed authentication files, preventing any promotion after login/challenge source drift. Added three new negative tests (premature login component reintroduction, password visibility loss, and reset-token reacceptance) for total 14/14 PASS.

## Current real records and safe recovery

Fresh production read-only repeatable-read audit for school_id=1, exam_id=9: 1762 score rows, 213 genuine numeric zeros, 0 NULL scores; original 301-row MD5 bcdc098a3e6cabb6f4c31736b14e39b9 exact unchanged. ASSPS school1 has 318 active student rows out of 318 school1 rows; do not confuse global student count with school1. No marks, students, staff or lesson rows modified.

Current full-ACL post-worker database archive SHA256 a989b0ef674014109f1f30108a56e9fe4555027712ede8aaed9f82a397f7169a; checksum verified. Current OND Blue Next+Nginx rollback archive SHA256 844430b88e1b12906ef00945f8a382a69905f5a0a05727e35e0729452466947e; checksum verified. Nginx syntax PASS. The separate new authenticated laptop DESKTOP-MUH720M already technically verified 4/4 genuine encrypted offsite current recovery artifacts in Core issue #4 evidence, but this is NOT an independent reviewer-signed institutional release approval.

Actual existing Muhammad Imran employee id 65, school1 account metadata preflight: all 10 role, tenant, active, mapping and credential-presence checks PASS; must_change_password=true, authenticated_existing_staff_login_verified=false. No credential was read, extracted or reset, and nobody was impersonated.

## Official production decision: fail-closed HOLD

The real official Core verify-connect-login-only-core-20261014.py, pointed at the exact newly built Connect candidate proxy and BUILD_ID, returned EXIT2/HOLD. Its six required live blockers remain: independent human-certified off-host recovery, signed runtime transport, exact adapter in running backend, restricted running global worker integration, actual running worker inherited grants and independent real signed peer-school/unassigned-subject HTTP denial. Genuine existing staff's self-authenticated first password change and relogin are also NOT certified. /etc/assps/connect-login-precutover-core-receipts.json is absent.

DO NOT re-label unsigned device technical recovery, metadata-only user checks, anonymous Chromium tests, mock school fixture tokens or AI-generated statements as real human independent signatures. Do not attempt live worker transport/PM2/Nginx promotion, reset teacher password, fabricate peer-school identities or edit existing results while these gates remain. SaaS Core alone reviews and executes one transactional rollback-ready Next+Nginx cutover after genuine actor evidence and signed owner/reviewer release receipts exist. Core must recheck actual live release and newest concurrent source immediately before switching traffic.

No public Nginx reload, PM2 restart, DB modification, credential exposure, marks/result write, or source overwriting was performed by this verification mission.
