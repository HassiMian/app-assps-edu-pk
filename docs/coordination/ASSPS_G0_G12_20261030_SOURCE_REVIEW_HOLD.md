# ASSPS G0–G12 Largest Mission — 30 Oct 2026 source-review handoff

## State / ownership
SOURCE REVIEW ONLY. NOT DEPLOYED. NOT PRODUCTION CERTIFIED.
Repository: HassiMian/app-assps-edu-pk. Master issue: #4.
Code-owner review base: 8165e0f298d9240e41fea8dad4cb215ff9ae213c.
Branch: review/assps-assessment-active-roster-20261030.
This branch is stacked on a prior review candidate. It must NOT be merged directly to old main or deployed without Core release-owner lineage, rollback and authenticated acceptance checks.
The interactive GitHub connector has pull access but no collaborator write access; a draft PR attempt was rejected (422). The review branch was independently pushed from an authorized VPS SSH checkout.

## New verified source corrections
- e46f9539 — MarksSheet now requests active=true for new Assessment / AS student rosters. Authorized historical Term Exam rosters are not silently hidden.
- a10ccedb — Marks batch rejects Number() coercion of booleans, arrays, exponent and hexadecimal strings. Genuine numeric zero, fractional decimal values and intentionally unentered marks remain distinct.
- 8309b887 — DELETE /api/exams/:id now fail-closes with 409 EXAM_RESULTS_RETENTION_LOCK for any exam holding saved result rows; uses a tenant-scoped, locked transaction. Empty exams retain a constrained delete path. UI explains the retention lock.
- b1de1483 — Legacy Result Card preview/print no longer turns unentered marks into zero, truncates fractional values, or assigns pass/fail/percentage to incomplete results; pass/fail uses configured subject threshold only when all subject scores exist.

## Verification this turn
- Frontend focused regression suite: 35/35 PASS.
- Frontend targeted ESLint: PASS.
- Frontend full Vite build: PASS.
- Backend isolated HTTP / status / assessment-create suite: 6/6 PASS.
- Backend JavaScript syntax: PASS.
- All four patches replayable as private, root-only format-patch handoff; SHA256 manifest verified 4/4.
- HEAD and remote review-branch SHA match; clean worktree.
- No production deployment, Nginx/PM2 restart, user role changes, PostgreSQL DDL or DML, historical mark edits, attendance entry, or automatic student promotion by this mission.

## Production read-only reconciliation (School 1)
- First Term exam #9: 1,854 exam_results, 213 genuine numeric zeros, 0 NULL obtained marks.
- Stored First Term exam policy: 100 total / 33 passing; stated global school policy: 40%. Twenty subject-result rows score 33% to under 40% and need legitimate policy/grade review. No automatic regrading authorized.
- Active students: 329. Attendance on 30 Oct: 328; 1 active student unmarked, no inactive attendance in reviewed date scope. Unmarked is NOT absent or zero.
- Active Class Eight students: 11; the Pre-Nine promotion preflight remains blocked by missing Quran/Nazra results and approved roster mapping.
- Active Principal/Owner role accounts: 0; no fabricated identity or role elevation.
- Lesson plan source rows: 4; academic signoff and Starter–Seven term completeness are not established.
- Paper Vault active: 10; saved_papers School1 rows: 0. The legacy Saved Papers tab uses browser storage. Cloud listing/edit/tenant-safe migration and genuine cross-device Save→Reopen→Edit→Print are not certified.
- HTTPS portal: 200 and valid certificate; unauthenticated students and exams APIs: 401 expected. Backend and Connect processes online.

## Mandatory remaining release gates
1. Confirm legitimate active School1 Principal/Owner actor, real Principal + Teacher browser UAT and independently administered School2-denial UAT. Mocked HTTP tests are not equivalent.
2. Ratify 11 individual historical zero-to-positive marks differences against immutable historical backups. Do not revise existing First Term records by assumption.
3. Reconcile Grade Eight-to-Pre-Nine Quran/Nazra missing scores and original promotion evidence; do not invent results or rename 11 linked student master records.
4. Approve genuine teacher-provided lesson-plan page ranges, academic curriculum sources and 3-up print physical/Nastaleeq acceptance.
5. Complete tenant-scoped Saved Papers cloud CRUD with audit, revision conflict handling and real cross-device acceptance.
6. Independently restore complete encrypted off-VPS backup, including database, paper media, database roles/ACL and application configuration; on-host checks alone cannot certify disaster recovery.
7. Reconcile current V4 live source lineage and all Core code-owner changes; sign rollback, restricted RLS, security and production cutover. Production stays HOLD.
8. Investigate the one genuinely unmarked active student through the authorized teacher attendance workflow; never mark present/absent without evidence.

The previous completed packages and historic data are preserved; no synthetic signoff, release certificate, or approval has been issued.
