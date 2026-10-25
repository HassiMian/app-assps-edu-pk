# ASSPS Lesson Planning — resumed final client recovery and server-receipt checkpoint
**25 October 2026 | Candidate-only | No production deployment**

## Continuation context
This is a source-only continuation of the unified ASSPS Lesson Planning work.
Base: ff1c6ce1c55d7f8b3f18ceaecc3e645199aa9c45 (the approved-source
assessment provenance lock candidate). Worktree:
`/root/workspace/assps-lesson-client-guard-20261025`; branch:
`fix/assps-lesson-client-tenant-delivery-20261025`.

## Implemented, fail-closed
1. Legacy globally shared `al_siddique_lesson_plans` and previously school-wide
   recovery bytes are preserved **unchanged** but are never silently imported
   into a newly authenticated school/teacher session. New recovery cache keys
   combine the verified AuthContext school/tenant with a unique account ID.
   React remounts the draft module on account/tenant change, so in-memory drafts
   do not carry across a login switch. Missing verified account identity
   disables local recovery instead of falling back to public/local storage.
2. HTTP 200 alone is no longer a Lesson Plans save/share/delete/list
   confirmation. Explicit `success:true` and matching saved `id` and
   incremented `serverRevision` are required for writes; shared plans must
   return `sentToPortal:true` and a typed nonnegative recipient/notification
   receipt. Successful deletes require `deleted:true` and the requested ID.
   Errors cannot falsely mark a plan as server-persisted or delivered.
3. Portal messaging reports the actual server receipt (student records and
   queued notifications), not a presumed delivery to all parents. If a server
   save fails and browser storage cannot persist, the editor remains open and
   explicitly warns that recovery is unavailable rather than falsely claiming
   it is backed up.

## Verified checks (this candidate)
- Source-only safe combined Lesson Planning suite: **128 passed, 0 failed**.
- Chromium real rendered Lesson Plans: **1/1 PASS**, includes draft create,
  returned revision, share receipt, unscoped legacy isolation and account/tenant
  switch away/back (mock authenticated API only).
- Chromium term source and A4 PDF flow: **PASS** (synthetic, no real printer).
- Vite frontend production build: **PASS**.
- Changed-source ESLint and git diff --check: **PASS**.
- THREE older DB-backed HTTP suites (`lesson-planner-cognitive-http`,
  `lesson-planning-cognitive-http`, `lesson-plans-http`) would INSERT/DELETE
  records via the configured pool; **excluded**, not declared PASS, pending
  genuinely isolated disposable PostgreSQL acceptance. A first attempt without
  backend npm dependencies terminated with `MODULE_NOT_FOUND: express`
  before it could execute DB writes. Fully mocked HTTP suites were rerun PASS.

## Production READ ONLY, 25 October
PostgreSQL `apexos`, transaction `BEGIN READ ONLY`:
- School 1 lesson plans: **3**, published: **0**.
- School 1 teacher/class assignments: **54 total, 54 active**.
- School 1 examination results: **1,854**, numeric zeros: **213**,
  SQL NULL marks: **0**, out-of-range marks: **0**; School 2 has **1**
  separate result record. Old historical 224-zero snapshots do **not**
  authorize a correction; attribution/provenance remains unresolved.
Public web returned HTTP 200; anonymous Lesson Plans returned HTTP 401.

## Production release gate: HOLD
Read-only `ops/release/verify-unified-lesson-live-preflight-20261018.cjs`
returned `HOLD_NOT_LIVE_CERTIFIED`, `deployAuthorized:false`.
Protected `examRoutes.js` differs between candidate and live; signed marks
service and migration 034 have not been deployed. Missing independent evidence
includes verified real Principal/Teacher and School 2 negative login/session,
recipient assignments/delivery acceptance, physical Urdu/A4 printer observation,
source and runtime artifact integrity, provider/CDN private-media purge, signed
rollback, and **off-host independent restore**. Core alone owns the eventual
atomic promotion and should not cut over this entire candidate backend.
59 earlier source candidates remain academic-review BLOCKED; genuine author,
edition/term review cannot be invented. Three original-source Class Five
assessment date collisions are preserved as original provenance, not silently
rescheduled. First/Third Term textbook content must not be borrowed from
Second Term without independently verified sources.

No live SQL DDL/DML, mark edit, lesson publication, staff impersonation,
production file overwrite, Nginx reload, PM2 restart, Cloudflare purge, or
deployment was performed in this continuation.
