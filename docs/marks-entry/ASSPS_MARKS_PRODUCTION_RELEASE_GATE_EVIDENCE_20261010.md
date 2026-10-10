# ASSPS SaaS Core — Comprehensive First Term Marks Entry production release gate evidence

Date: 10 October 2026. Release authority: SaaS Core Master. GitHub coordination: issue #4. Status: ALL AVAILABLE AUTOMATED SAFETY GATES VERIFIED, BUT FINAL LIVE APPLICATION DEPLOYMENT **HOLD**.

## Authority and exact production-component ancestry

Verified live frontend production artifact: 24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92.
Candidate frontend from exactly live source (2 scoped commits, isolated branch release/marks-firstterm-frontend-livebase-20261010): 39ee8270442f6728f5a2c09c3a75bd8d4eea804e.
Verified live backend production artifact: 16ab8f346ba27aa6b2e29a8f03c68db32a326cb9.
Candidate backend from exactly live source (3 scoped commits, isolated branch release/marks-firstterm-backend-livebase-20261010): d54183a815b30b6d7ad09cb2cedaee556774294d.

Both GitHub candidate branches verified HEAD=remote and clean, independently checked exact live commit ancestry; no older Paper Studio, Academic or APEX development branches imported. Read SaaS Core coordination handoff and multi-agent governance from coord/assps-four-stream-consolidation-20261008. No other agent worktree changed.

## Real live Nginx private-media ingress SECURED

Previous four-site/five unrestricted private media alias issue was corrected by controlled earlier operation, preserving separate exact rollback configs. Verified seven enabled Nginx sites pass privacy checker, Nginx syntax PASS and running active. Added reproducible live HTTPS probe using real verified TLS certificate and localhost SNI routing. 32/32 private or dangerous extension paths across api.assps.edu.pk, app.assps.edu.pk, apex.assps.edu.pk, www.assps.edu.pk return HTTP404; each public root gives HTTP2xx/3xx. No credentials, private school file contents or student names accessed.

Relevant source: ops/security/verify-live-private-uploads-tls-matrix-20261010.py, 32/32 PASS exit0. This is live ingress proof, not teacher authorization proof.
Additional live anonymous authorization smoke: ops/release/verify-live-anonymous-authorization-20261010.py uses certificate-verified local SNI TLS requests without credentials; the actual seven mounted API endpoints for exams/results, student roster, attendance, fees and /api/portal/paper-studio/papers all deny anonymous access HTTP401, 7/7 PASS. Correct Paper Studio mount is /api/portal/paper-studio (not /api/paper-studio). Still not proof of authorized teacher role isolation.

## Real signed non-BYPASS PostgreSQL clone and Marks Entry tenant test

Disposable PostgreSQL only: 127.0.0.1:55432/assps_core_signed_p7_20261008. NEVER the production school DB.
Previously committed tightly guarded credential runner uses ephemeral login password and resets original NULL, and temporary negative-test role removed. Fresh exact run of saas-core-signed-context-real-db.test.js: 13/13 PASS with actual SCRAM non-BYPASS PG actor, 77 FORCE RLS tables, HMAC signed tenant, forged superadmin, replay, school B denied, secret read denied.

New read-only-reproducible transaction fixture verification: ops/security/verify-signed-marks-transaction-clone-20261010.sql. It explicitly guards exact clone database, port and postgres test operator; BEGIN; temporarily GRANT SELECT/UPDATE to already-isolated runtime role and insert synthetic exams/results for two already-synthetic schools. Then signs the transaction with the EXISTING disposable DB signing key (not committed in scripts), SET LOCAL SESSION AUTHORIZATION to restricted login and SET LOCAL ROLE runtime; verifies school A exam/result accessible but B hidden, own-school marks update 1 row, other-school UPDATE 0 rows, attempt to spoof school-B tenant session setting still returns zero. ROLLBACK ends everything (fixtures and transient GRANT). Test returned EXIT0. Independent post-test snapshot: no synthetic new exam/result rows and runtime grant from test absent.

These prove real restricted-role tenant row policy inside the disposable clone. They do NOT certify actual production app JWT login, production PostgreSQL credential, or live cross-tenant teacher acceptance.

## Protected rollback artifacts — actual backup and restoration rehearsal

Exact live frontend and backend artifacts backed up into root-only directory /root/secure-archive/assps-marks-predeploy-20261010 with mode 0700 and archives mode 0600. Frontend archive ~1.9MB, backend ~37MB. Both archives pass SHA256 manifest verification, tar listing and successfully extracted offline to separate /var/tmp/assps-marks-rollback-rehearsal-20261010. At rehearsal, frontend 147/147 files and backend 7521/7521 files compared byte-identically. Runtime Argus monitoring state JSON naturally changed after backup; strict preflight detects and allows ONLY that single specifically named file, rejecting any other archive-vs-current app artifact drift. This is an offline restore rehearsal, not rollback of a live release. Backups contain private operational information and must never be publicly linked or uploaded.

## Automated exact release gates (new script)

ops/release/verify-assps-marks-release-gates-20261010.py runs only verifications and has no deployment implementation or override flag.

Static phase, ACTUAL RUN EXIT0:
- Exact live separate release metadata IDs, source local/remote/clean/ancestry, backup SHA256, isolated restored file comparisons with exact Argus runtime exception
- Native live Nginx syntax, seven-site media policy, certificate-verified 32/32 HTTPS path denial, seven mounted private API paths HTTP401 without JWT
- Real 13/13 signed restricted disposable PostgreSQL session tests with original credential state restored
- Real signed Marks Entry clone SQL exam/result READ, authorized UPDATE and cross-tenant UPDATE/GUC spoof denial, transaction ROLLBACK

Functional phase, ACTUAL RUN EXIT2 INTENTIONALLY:
- Backend exact candidate 14/14 combined: teacher assigned/foreign class and section denial via actual Express HTTP with synthetic DB doubles, legitimate principal path, First Term schedule, and corrected parameter-bound SQL tenant context negative controls (test-only update d54183a8)
- Frontend exact candidate pure 75 official First Term exam-paper subjects/11 classes + class-name aliases, REAL local Chromium/Vite synthetic Marks Entry flow, prior marks restoration, correct edited zero vs blank, invalid marks denial and duplicate save block
- Focused frontend lint, full optimized build and six protected Result Card template hashes
- The release gate then explicitly returns HOLD EXIT2: actual production school principal/teacher authenticated role+RLS acceptance NOT CERTIFIED; Assessment Results signed HTTP clone lacks synthetic fixture and FAILS; Paper-owned signed HTTP clone TIMED OUT; real live Marks Entry acceptance cannot be done before authorized application promotion. Absolutely NO automatic switch to DEPLOY.

Static and functional separate logs in /tmp/assps-marks-gate-static-20261010.log and /tmp/assps-marks-gate-functional-20261010.log. Combined one-shot execution also reached every PASS and HOLD line but its wrapper hit a 50-second remote-execution timeout; both phases were rerun separately with actual exit codes, avoiding false green inference.

## Release blockers and ownership

- P0 Core: Restricted signed production principal/admin/teacher (including legitimate teacher assignments, cross-class and cross-school negative rows) must be exercised with approved actor credentials/tokens in isolated/authorized real application path. Current production read-only catalog introspection used a privileged BYPASSRLS login and cannot establish this. Do NOT fabricate JWT, extract user browser cookie/OTP or grant persistent unrestricted database privileges.
- Paper Studio owns source/fixtures of independent Assessment Results and Lesson Plan/Diary signed HTTP integration. The existing disposable clone is missing expected original phase6 Assessment Result/teacher assignment fixtures; targeted temporary SELECT-grant clone parity was correctly REVOKED and the test still HTTP404. Paper-specific signed HTTP suite timed out. Core needs verified owner acceptance, not a retcon/false test PASS.
- The authenticated Principal/teacher browser can validate already-deployed old Marks Sheet controls, but candidate source is not deployed; live First Term marks workflow is therefore NOT yet fixed. After release authorization only, validate exact saved First Term exam ID, 11 class rosters, teacher/tenant denial, existing records unchanged, one approved marks entry and reload, Paper Studio/Result Card print fidelity, rollback.
- Disk ~88% utilized at checkpoint; preserve archives, avoid duplicate large builds.

## Explicit non-actions

No frontend/backend artifact deployment, no database migration, production app restart, teacher assignment edit, user creation, marks update, student/fees/attendance/papers deletion or APEX/Academic change. Live Nginx was secured in the previous operational checkpoint and remained secure throughout these tests.

FINAL: LIVE_INGRESS=PASS; DISPOSABLE_SIGNED_RLS=13/13_PASS; SIGNED_MARKS_CLONE_RLS=PASS; SOURCE_FRONTEND_QA=PASS; SOURCE_BACKEND_QA=14/14_PASS; BACKUP_RESTORE=PASS; ACTUAL_LIVE_PRODUCTION_ROLE_ACCEPTANCE=NOT_CERTIFIED; PAPER_ASSESSMENT_INTEGRATION=BLOCKED; APPLICATION_RELEASE_CERTIFIED=FALSE; MARKS_ENTRY_PRODUCTION_DEPLOYMENT=HOLD.
