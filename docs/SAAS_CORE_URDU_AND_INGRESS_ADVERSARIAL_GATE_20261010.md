# ASSPS SaaS Core — Urdu editor integration and private upload adversarial security gate
**Date:** 2026-10-10. **Release decision: NO-GO.** This documents isolated development and reproducible preflight, not live app/DB deployment or authenticated school acceptance.

## Source reconciliation
- Reviewed GitHub issue #4 through 259 comments before integration.
- Verified prior clean, origin-matched Core source `c154d3a19e43db0816c37022d56f54e857b9b851` at `release/core-security-owner-reconcile-20261010`. Existing distinct live release metadata remained frontend `24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92`, backend `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9`. No production modification.
- GitHub comparison confirmed independent Paper Studio owner `73909cdf524c738db2635b980f852e406e760b3b` is exactly one commit ahead of already Core-reconciled Paper parent `2fe7d6af3408f95181b7e4f30bbfac60b44e7046`, on precisely 14 Paper-owned paths. Paper owner rehearsal `b7742633654ec3aedefba6df89c9c36f052d9ad3` independently supports the selective import.
- Created isolated worktree `/root/workspace/assps-core-paper-urdu-security-rc-20261010`, branch `release/core-paper-urdu-security-rc-20261010`. Cherry-picked only that newer owner revision with `-x` as commit `83b33a05`, no conflict. Original owner/production worktrees untouched.
- Owner additions fix real double-counted Urdu inline-option MCQs and the legacy Elite RTL/English preview runtime error, preserving Paper Workspace structural hierarchy/marks/options/Jameel preference and old documents. Academic source records not imported.

## Source-exact tests on newly integrated Core
- Frontend `npm ci` exit0, optimized Vite `npm run build` exit0, 3.46 s (`/tmp/assps-core-new-urdu-elite-build-20261010.log`).
- New targeted Urdu MCQ + Classic/Modern/Elite renderer **3/3 PASS**.
- Paper Workspace / rules / Early Years source model + new Urdu/Elite targeted tests **25/25 PASS** (`/tmp/assps-core-urdu-integrated-model-checks.tap`).
- Real Chromium V12 editor selection **8/8 PASS** (`/tmp/assps-core-paper-browser-selection-standalone.tap`).
- Real Chromium Urdu Paper Workspace hierarchy/print/RTL **9/9 PASS** (`/tmp/assps-core-paper-browser-urdu-standalone.tap`).
- Real Chromium Early Years printable A4 geometry/hidden editor controls **8/8 PASS** (`/tmp/assps-core-paper-browser-earlyyears-standalone.tap`).
- First parallel aggregate browser run hit the ~50-second remote command timeout after 21 observed green cases; independent serial reruns above produced **25/25 captured exit0**. Do not count that timed-out aggregate as an additional pass.
- Focused ESLint on modified Urdu parsers + new fixtures **PASS exit0** (not full Paper tree lint, which still has inherited debt).
- Six original legacy result-card template hashes unchanged; Result Card Phase11 printer chooser, fail-closed overflow, premium template/data contracts PASS on exact source.
- Current live *anonymous* Results API probes `/api/exams`, `/api/exams/grade-settings`, `/api/exams/results`, `/api/exams/results/all` return four HTTP401. This is **not** authenticated school-actor evidence.

## New adversarial private-upload release protection
- Implemented disposable `ops/security/tests/test_verify_upload_cutover_source_parity.py`, **eight independent unit tests PASS**, including correct seven-site five-alias reconstruction, unauthorized staged config difference, baseline source drift, symlink target change, policy tamper, global Nginx drift, rollback manifest tamper, missing enabled site denial.
- Combined Nginx candidate builder (7) + new parity tests (8): **15/15 PASS exit0** (`/tmp/assps-core-new-private-security-python-tests.log`). Every test uses disposable synthetic fixtures; **no live Nginx writes**.
- Current read-only seven-site production Nginx snapshot validation and candidate delta provenance: `UPLOAD_CUTOVER_SOURCE_PARITY_PASS`, manifest SHA256 `a0bd6bcebb57f0b4831f49c15d38617f61b47bc7e8d95345a195da6445ea945a`. Staged candidate syntax and policy alias checker PASS. Previously isolated 35/35 host ingress checks remain scoped to staging, not production.
- Current production checker still **FAIL exit2: five unsafe upload aliases across four server configs**. Staged checker PASS. Security cutover was previously blocked by execution safety controls; no attempt to bypass, no live Nginx reload/restart.
- Current non-DB signed backend Node HMAC/catalog/runtime contract and private HTTP unit suite **18/18 PASS exit0** (`/tmp/assps-core-new-security-unit-matrix.tap`). This does **not** certify TCP authenticated non-BYPASS PostgreSQL RLS/JWT role matrix.
- `sh ops/security/check-signed-rls-harness.sh` remains **BLOCKED exit2** because approved isolated SCRAM restricted test-role password and signed test key were not provisioned. No secrets copied from real school production, credential permission gate not bypassed.
- No production database RLS/migrations/read ACL proof, real logged-in student/teacher/guardian fee/attendance acceptance, physical school printer proof, or final rollback-protected cutover.

## Release ownership and blockers
- Core owns PostgreSQL/JWT actor+tenant authorization and live private-media protection. Need an **authorized isolated test credential** provisioned through approved DBA/security process and controlled live ingress rollout permission with fresh backup+rollback evidence, then run actual signed Node+PG role matrix and HTTPS denial tests. Treat those as hard gates, never substitute synthetic tests.
- APEX Connect v48 source remains unpublished upstream due actual GitHub 403 permissions; independent owner work remains isolated.
- Grade IX–X academically approved question revisions still zero; provisional academic content deliberately omitted from this Core merge.
- No live Nginx, PostgreSQL, PM2, frontend/backend artifacts, school fees/attendance, student records, or completed historic exam papers changed. Original Paper Studio/Academic/Connect worktrees untouched.

**`NEW_CORE_SOURCE_INTEGRATION=PASS; FOCUSED_UNIT_BROWSER_BUILD=PASS; STAGED_INGRESS_VERIFICATION=PASS; LIVE_PRIVATE_UPLOAD_SECURITY=FAIL; REAL_SIGNED_POSTGRES_E2E=BLOCKED; RELEASE_CERTIFIED=FALSE; DEPLOYMENT=HOLD`.**
