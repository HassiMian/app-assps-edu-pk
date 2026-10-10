# ASSPS SaaS Core — first-day Marks + nine Results signed release certification checkpoint
10 October 2026 | SaaS Core Master | GitHub issue #4 | APP DEPLOYMENT HOLD

## Verified live baseline and staged source commits
Live frontend: 24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92
Live backend: 16ab8f346ba27aa6b2e29a8f03c68db32a326cb9
Signed-release frontend candidate: 2ec5ae597e9f50772cf443b0392b442b7fa037db
Signed-release backend candidate: 0923ddcd1f5a923123d45396bbeab16f372be7b1
Release backend branch: release/marks-firstterm-backend-livebase-20261010; exact descendant of live backend, clean, fast-forward pushed. Frontend branch release/core-marks-nine-results-livebase-20261010 clean, based on exact live frontend. Paper Studio, Grade IX-X, Connect worktrees untouched and unmerged.

## REAL ISOLATED SIGNED TEST GATES — PASSED
- Default backend/tenant/marks signed-source and classroom authorization 24/24 PASS.
- Real non-BYPASS SCRAM PostgreSQL actor signed school A/B access, HMAC tamper/replay, forged superadmin, tenant GUC spoof, secret protection and BYPASS role denial: 13/13 PASS against disposable 127.0.0.1:55432.
- Actual signed JWT+Express route and PostgreSQL acceptance on exact new backend: Marks HTTP PASS; Assessment Results and attendance/fees/Paper Vault HTTP PASS; Paper-owned Lesson Planning and Daily Diary author/privacy/publication HTTP PASS. Existing manual Lesson transaction signing and teacher draft privacy defects were safely forward-ported from previously tested Core security code into an isolated branch, then original Core backend release was fast-forwarded. Do not treat source integration as separate Paper Studio owner signoff.
- Original official Phase6 clone-only fixtures identified and installed ONLY on disposable signed clone. Read-only fixture proof: 2 Assessment results, 1 teacher class assignment, 3 test users, 2 attendance rows, 2 Paper Vault records, 77 signed policies. Test runner tracks existing vs temporary per-table grants and restores preexisting permissions and original NULL SCRAM test password.
- Independent 14 MB synthetic-only signing-schema migration rehearsal database recreated from a disposable clone, unsigned starting state verified (0 signed schema/functions/guards). With a NEW synthetic-only signing key, staged signed schema/policies applied. Verified 77/77 FORCE-RLS tables, 77 signed policies, 3 signed helper functions, unsigned setting rejection; signed Marks school A update allowed, school B invisible, cross-tenant UPDATE 0, spoof denied and ROLLBACK. No real student/exam/fee records used.
- Repeatable gate command on ops worktree: python3 ops/release/verify-assps-marks-release-gates-20261010.py signed => EXIT0 including shadow signed schema plus four genuine signed source/HTTP suites. Functional component source tests and premium Result Card Chromium, A4, PDF, mark-accuracy PASS in prior verified checks.

## VERIFIED CURRENT PRODUCTION RECOVERY EVIDENCE
- Existing pre-release frontend and backend artifact archives root-only SHA256 verified; offline restored exact files 147 and 7521 respectively (except two strictly identified mutable Argus monitoring JSON state files after backup).
- NEW real apexos production PostgreSQL custom-format backup at /root/secure-archive/assps-marks-predeploy-20261010/production-apexos-pre-signed-rls-20261010.dump. Root-only mode0600, size 2,295,974 bytes, SHA256 verified, 1,454 pg_restore inventory objects. No data uploaded or exposed. A NEW fresh transaction-consistent snapshot is required immediately before any future production promotion.
- Live Nginx seven-site media private-upload checker PASS, Nginx syntax and TLS 32/32 private-path 404 plus seven anonymous protected API 401 PASS. Live PM2 backend and Connect online. NO production DB schema/account change, frontend/backend deployment, school marks, attendance, fee or paper mutation.

## ACTUAL PRODUCTION HARD SECURITY BLOCKER — NO-GO
- Current live PostgreSQL database apexos runs backend DB_USER apexos_user; catalog shows LOGIN true, BYPASSRLS true, SUPERUSER false.
- Production core_security schema/signing key/helper functions ABSENT (count0); public FORCE-RLS tables count77.
- Live backend strict flags DB_ENFORCE_LEAST_PRIVILEGE_LOGIN, DB_AUTH_USE_SIGNED_TENANT_CONTEXT, DB_SIGNED_TENANT_RLS_ENABLED NOT CONFIGURED.
- Original phase7 signed SQL is explicitly CLONE ONLY and MUST NOT be run on production. A signed source build or synthetic clone success cannot waive actual production role/migration prerequisite.
- Real school principal/teacher authenticated cross-tenant testing and independent Paper Studio publication acceptance remain unverified. Do not fabricate or extract login JWT/cookies or widen DB credentials.

## Next controlled critical path
1. Review and separately rehearse a production-safe schema/key/RLS migration and reversal on representative independent synthetic database. Verify all 77 policies and non-BYPASS login against real stored schemas and Core/Paper/Connect integration contracts.
2. Provision protected signed HMAC material and SCRAM restricted application login using independent least-privilege access. Back up database immediately before changes; preserve frontend/backend artifact rollback. DO NOT blindly toggle login or HMAC flags on active PM2 services.
3. Authorized multi-role live tenant/teacher/class/section/subject negative checks plus school principal browser acceptance, Paper Studio/Assessment owner signoff and all protected modules regression.
4. Only then controlled backend+frontend independent source promotion, production smoke/prints, and rollback verification.

FINAL: SOURCE_READY=TRUE; SIGNED_TEST_CLONE=PASS; SHADOW_RLS_DDL_REHEARSAL=PASS; PROD_BACKUP=PASS; PROD_NONBYPASS_SIGNED_RUNTIME=FAIL; RELEASE_CERTIFIED=FALSE; APP_DEPLOYMENT=HOLD.
