# ASSPS SaaS Core — consolidated predeployment gate (10 October 2026)

**Decision: NO-GO / CERTIFICATION HOLD.** This is an isolated, tested release *candidate*, not a certified production deployment. No live service or database changes are authorized by this document. Successful synthetic/browser testing must never be called live authenticated acceptance.

## Verified live artifacts and source ancestry

- Live frontend release metadata commit: `24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92` (separately verified in `/var/www/apex-os/release-meta.json`).
- Live backend release metadata commit: `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9` (separately verified in `/var/www/apex-backend/release-meta.json`).
- Previous clean Core ancestor: `e8543f57695f5d483250ba976464c8abaf29f267`.
- Integrated Core candidate application SHA: `96d2e83184d84423043e6ef1d665f75b1c8f1bc1` on `release/core-consolidated-rc-20261010`. Both live artifact SHAs and canonical 2026-10-07 anchor `6b98cbaa05cf731999a4fa83a86da64934571d66` are verified ancestors of this candidate.
- Independent approved Paper Studio Core-derived owner rehearsal: `99dd6edf1d6ec2663b04f8b1da4a354ed7084e5f`, clean at `/root/workspace/assps-paper-studio-core-reconcile-20261010`; no owner worktree edited. Core selectively forward-ported exactly its one missing Lesson Planning save/list race source line, six related tests (one updated and five newly introduced), and read-only parity checker. `PARITY_PASS exact_paper_owner_lesson_planning_source` against that owner commit, exit 0.
- Recovered and read `docs/coordination/SAAS_CORE_MASTER_HANDOFF.md` and `docs/coordination/CHAT_CONSOLIDATION_AND_AGENT_GOVERNANCE_20261008.md` from historical Git coordination commit `9f70ed12`. Historical chat transcript completeness and independent owner acceptance beyond the listed verified artifacts cannot be certified from this report.

## New consolidated acceptance on the actual integrated candidate

| Gate | Observed evidence | Result |
| --- | --- | --- |
| Frontend production build | `npm run build`, `/tmp/assps-rc-frontend-build.log` | PASS exit 0 |
| Paper Lesson Planning source parity | `/tmp/assps-rc-parity-committed.log` | PASS exit 0 |
| Lesson Planning real Chromium/Vite | 8 distinct browser files: workspace, late failure, late refresh race, newer row, refresh failure, stale list, stale row, late save | **8/8 PASS**, exit 0 each |
| Protected original First Term papers | `/tmp/assps-rc-paper43.log`, `/tmp/assps-rc-paper43.exit`: **43/43 distinct documents**, render versus print text; TAP 1/1 | PASS exit 0 |
| DOCX model/binary/math | `/tmp/assps-rc-docx-root-tests.log`: six checks | **6/6 PASS** exit 0 |
| DOCX real browser (including Urdu RTL OOXML) | `/tmp/assps-rc-docx-browser.log`: two checks | **2/2 PASS** exit 0 |
| Backend auth/RLS and payment-proof contract tests | `/tmp/assps-rc-backend-suite.log` | **24/24 PASS** exit 0 |
| Backend private-upload actual HTTP test | `/tmp/assps-rc-private-http.log` | **2/2 PASS** exit 0 |
| Staged private Nginx HTTP/HTTPS behavior | `/tmp/assps-rc-ingress-hosts.log` | **35/35 PASS** exit 0 |
| Staged Nginx full syntax | `nginx -t` against isolated candidate | PASS exit 0 |
| Disposable PostgreSQL effective RLS | `/tmp/rc-verify-effective-rls-clone-20261009.log` | 77 protected, 73 school, 4 tenant PASS exit 0 |
| Disposable PostgreSQL sensitive grants | `/tmp/rc-verify-runtime-sensitive-grants-clone-20261009.log` | 9/9 table grants/read denied PASS exit 0 |
| Disposable signed PostgreSQL | `/tmp/rc-verify-signed-clone-rls-enabled-20261009.log` | 77/77 ENABLE/FORCE/signed; unsigned records 0 PASS exit 0 |
| Reconciled owner browser fixture lint | `/tmp/assps-rc-fixture-eslint.log` | PASS exit 0 |
| Read-only live smoke (anonymous only) | `https://app.assps.edu.pk/` HTTP 200, `https://api.assps.edu.pk/` HTTP 302 | REACHABLE ONLY; not authenticated acceptance |

Initial DOCX invocation ran with incorrect nested frontend working directory and failed 2/6 (ENOENT fixture path); corrected root-directory invocation passed 6/6. The combined long Lesson Planning browser command also reached the remote command timeout; six individual exit-0 logs were recovered and the two remaining tests were separately confirmed exit 0. These initial harness execution issues are not concealed.

## Explicit gates still NOT certified

1. **P0 — Signed Node + PostgreSQL + JWT end-to-end:** The actual `saas-core-signed-context-real-db.test.js` and authenticated school/teacher/guardian/student matrix are not executable under an independent password-authenticated restricted login yet. Disposable `assps_core_test_login` on port 55432 has `LOGIN=true`, `BYPASSRLS=false`, `SUPERUSER=false`, but **no password configured**; TCP `pg_hba.conf` requires SCRAM-SHA-256. Credential provisioning was blocked by execution safety controls and MUST NOT be bypassed. SQL-clone role assertions and Node signing unit tests are evidence for narrower properties only.
2. **P0 — Live Nginx private upload ingress:** `/etc/nginx/sites-enabled` **FAILS exit 2**, five unsafe private-upload aliases remain across four live site configs. Staged 7-site candidate `/var/tmp/assps-core-live-reconciled-candidate-20261009` passes syntax and 35/35 host tests, but has NOT replaced live Nginx. **Production remains exposed until a controlled, independently authorized cutover**. No reload/restart was done.
3. **P0 — Production tenant/RLS and migration certification:** The 77-table policy safety and RLS activation have been proven ONLY on disposable clone(s), not production. No prod migration, schema changes, sensitive grants, tenant access tests or direct DB inspection undertaken here. Release cannot assume staging catalog equals live catalog.
4. **P1 — Full authentication/teacher/finance/attendance browser and HTTP acceptance:** Synthetic Chromium Lesson Planning and private HTTP tests cannot replace authenticated SaaS role/tenant workflows, student/guardian isolation, fee ledger transactions and exact live acceptance evidence. Production write acceptance is prohibited until backup/snapshot and release authorization.
5. **P1 — Complete owner integration review:** Paper Studio's scoped Lesson Planning fix and protected documents are reconciled. Separate Result Card print-ready, Grade IX–X academic provenance/approval and APEX Connect integration contracts must be independently reconciled against latest appropriate source and owner evidence before any integrated production release. No other agents' branches were overwritten.
6. **P1 — Existing module lint debt:** `eslint` of LessonPlanningWorkspace.jsx produced **4 errors / 4 warnings** at lines 33, 36, 139, 163 (the selectively integrated source change is at line 197). Browser fixtures lint PASS. No unrelated owner-owned Lesson Planning code was silently rewritten to achieve artificial green status.
7. **P1 — Physical print/Urdu acceptance:** Browser DOCX Urdu RTL and 43-paper print parity pass; on-prem printer output, real school-specific documents, and final authorized print proof remain unverified.

## Backup and controlled deployment prerequisites

- Verified **current live** Nginx 7-site / global config is byte-for-byte and symlink-for-symlink identical to previously isolated rollback snapshot `/var/tmp/assps-core-nginx-rollback-proof-20261009`; manifest SHA256 `a0bd6bcebb57f0b4831f49c15d38617f61b47bc7e8d95345a195da6445ea945a`. Original configuration untouched.
- Before rollout: close all P0/P1 release gates above, reconcile exact latest source ancestry of every included owner change, independently verify backend and frontend builds, versioned migrations and live RLS protections, create fresh protected PostgreSQL and artifact backups, demonstrate restore, and prepare separate frontend/backend rollback commits/builds.
- A controlled deployment (not performed): apply precisely reviewed Nginx staged changes with production syntax and host guards, ensure valid TLS/redirect/security policies, use atomic release artifact promotion with rollback, independent frontend/backend service smoke, authenticated cross-tenant role test, database/ledger/attendance consistency, and printed artifact comparison. If any gate fails, revert immediately to verified snapshots/artifacts and keep existing records unchanged.
- **No production SQL, deployment, PM2 restart, Nginx reload, live record edit, or student-data exposure was performed in this consolidated pass.**

## Release authority conclusion

`PREDEPLOY_QA_EVIDENCE=STRONG; RELEASE_CERTIFIED=FALSE; PRODUCTION_DEPLOYMENT=HOLD`. There are substantive remaining authorization, live ingress and integration blockers; saying “only deployment remains” would be inaccurate. Resolve these in their rightful owner/test environment; do not weaken any gate for a deadline.
