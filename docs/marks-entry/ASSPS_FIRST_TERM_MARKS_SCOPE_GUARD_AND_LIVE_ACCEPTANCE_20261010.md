# ASSPS First Term Marks Entry — scoped validation and live acceptance checkpoint

Date: 10 October 2026. This is an isolated SaaS Core candidate; it is **not deployed**.

## Current reconciled source
- Parent reviewed Core Marks Entry recovery commit: `571b7e547371d62931289be4c52d4c355ef33393` on `fix/core-firstterm-marks-entry-recovery-20261010`; source local and GitHub remote agreed at start and base worktree was clean.
- Isolated improvement worktree: `/root/workspace/assps-core-marks-entry-scope-guard-20261010`, branch `fix/core-marks-entry-scope-guard-20261010`. Only the Marks Entry UI, pure model and unit contract test are changed.
- Production source metadata independently observed before tests: frontend `24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92`; backend `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9`. Neither production artifact changed.

## New explicit user-data integrity protection
The previous UI recovery already restored canonical class aliases, persistent First Term Exam selector, explicit zero, previous marks, edited-only submission and no implicit duplicate exam creation. This increment independently validates numerical positive integer saved exam ID, positive student IDs and matching student/exam class versus the chosen class **inside the pure save-batch contract itself**, so an inconsistent or stale UI/API object cannot silently attempt a cross-class marks write. Canonical equivalents such as `Class One` and `One` remain accepted. Existing teacher/admin tenant restrictions are **not** bypassed by the frontend fallback.

## Executed tests on the new candidate
- Exact-source `node scripts/test-marks-entry-first-term-recovery.mjs` PASS, including NEW invalid exam ID, invalid student ID, wrong-class exam/student and positive class-alias proof.
- Actual local real Chromium UI `node scripts/test-marks-entry-firstterm-browser.mjs` PASS: First Term Exam fixture ID 9 displayed; two synthetic `One`/`Class One` student rows loaded despite legacy filtered-query mismatch, unrelated class excluded; synthetic saved 76 displayed; invalid 101 rejected; edited zero saved alone with existing exam ID, previously saved 76 untouched; second Save with no fresh edits denied; saved-results API failure keeps roster but disables Save. Synthetic fixture ID 9 and marks do NOT represent authenticated production data.
- Focused ESLint on Marks Sheet, pure marksEntryModel, both test scripts: EXIT0, zero findings.
- Optimized Vite frontend build PASS EXIT0 `/tmp/assps-marks-scope-build.log` (4.22s).
- Original 6 protected Results template fingerprints unchanged PASS.
- Existing official First Term 75-paper schedule static source test 4/4 PASS and Core permission contracts static 8/8 PASS on parent source (no backend source changed in this increment). The combined assessment authorization test was timeout-blocked, not counted as PASS.

## Actual live acceptance attempt and blockers
- Authorized Windows workstation became ONLINE; connected browser navigation to `https://app.assps.edu.pk/examination/marks` returned `https://app.assps.edu.pk/login`, headed `APEX Education Gateway`. No already signed-in school role session is available in that browser; no password, cookie, token or privileged database access was extracted/guessed. Therefore actual First Term exam row, authorized students and saved marks **not observed**. The frontend and backend live metadata are older, so **site remains unfixed** until a controlled deployment.
- Pre-existing live five private-upload Nginx aliases have a verified staging/rollback candidate but remain unsafe live; restricted signed non-BYPASS PostgreSQL/JWT/tenant E2E has approved credential unavailable. Full SaaS Core certification remains HOLD; original scripts and student data untouched.
- A real acceptance must verify with an already authorized Principal/teacher session: exact `/api/exams` saved record and selected exam ID, teacher assignment/student GET response, class-specific subject mapping, saved marks GET, single approved mark save and reopen only under school-authorized release QA, negative cross-tenant and role tests, and rollback. Never make test writes on a live student's grades without school-specific QA approval.

**Decision: candidate source tested/preserved, `PRODUCTION_MARKS_OPERATIONAL=UNVERIFIED`, `SaaS_CORE_RELEASE_CERTIFIED=FALSE`, no live deployment.**
