# ASSPS Paper Studio Master — Phase 7 isolated HTTP, publisher and saved-list certification

**UTC observation:** 2026-10-08 16:17–16:29. **Decision:** stage-only implementation completed; production RELEASE HOLD.

## Source / branch control

- Production frontend metadata `24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92` and backend metadata `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9`, rechecked 16:29 UTC; unchanged.
- Dedicated clean-base isolated worktree `/root/workspace/assps-paper-studio-master-phase7-20261008`, branch `feat/paper-studio-master-phase7-20261008`, based on verified prior Paper Studio stage `36ea2427a880aa9c8ba555510139dcf1dcb1fc21`.
- SaaS Core Phase 6 candidate `80523e9f2c41f89a215d9aba987b1d7069e0c823` discovered via coordination issue #4; its cross-owned G43 projection correction was independently reproduced/red-tested and then narrowly ported. Entire resulting `paperStudioProjectionService.js` SHA256 matches Core Phase 6: `ca11164561c8e5695d005face3c427838afc1b59ecc8385b174398458398f4b4`. No other Core migrations/auth/database files copied.
- No production code, tenant school/student/paper data, DB roles, Nginx/PM2, official paper corpus, Early Years references, or frontend assets modified. Grade IX–X draft questions remain ineligible for approved selection.

## Actual defects, initial red evidence and fixes

1. **Saved Papers LIST privacy:** existing G43 test was **1 pass / 2 fail**: the list SELECT fetched full `paper_vault.payload` and serializer had a nonsensical paper_json/payload fallback. Removed full payload from LIST query and serializer; detail/open and create continue retrieving full authoritative native document. G43 static **3/3 PASS**. A second independent real PostgreSQL fixture proves list omits model-answer marker for teacher and principal, same-school peer/foreign-school detail denial, and authorized owner detail retains source answer. No saved paper content rewritten.
2. **Lesson Plan publisher bypass:** real teacher JWT + actual route + PostgreSQL test initially FAILED: a teacher's `sentToPortal:true` request directly marked a newly created plan published. Now create/update forcibly persist `sent_to_portal=false` and both document payload aliases false; only management's revision-bound `/:id/share` can set true, and both aliases are synchronized. Teachers cannot edit/delete a published revision behind the principal's back. A principal edit revokes publication until a fresh review/share. Old admin share flow still PASS.
3. **Daily Diary DATE round-trip:** genuine teacher update returned **HTTP 500** because a PostgreSQL Date object was coerced into a non-ISO string and sent as `$7::date`. Added strict Gregorian ISO date normalization for Date/string values, 422 for malformed dates, and correct browser camelCase patch precedence over persisted snake_case. Partial `footerText`, `slipsPerPage`, `styleSettings` updates persist without losing the previously saved date.

## Safely disposable PostgreSQL evidence

- Separate PostgreSQL 16 cluster created under `/var/tmp/assps-paper-phase7-pg16-20261008` with **loopback-only** temporary test listener `127.0.0.1:55447`, *not* the production PostgreSQL cluster on 5432.
- Read-only `pg_dump --schema-only -Fc` from existing production database; NO production row data dumped. Initial restore encountered missing external role dependencies; created exactly two `NOLOGIN/NOBYPASSRLS` policy-target roles **inside the isolated cluster only**, then rebuilt the clone from the schema dump successfully.
- Restored **87 public base tables, 212 policies, 0 original school rows**. Test fixtures are synthetic school accounts/users/papers/Diary/plans; no real pupils or papers. Test harness refuses DB names outside `assps_paper_phase7_clone_YYYYMMDD`, live PostgreSQL ports and non-loopback DB targets.
- Real backend `protect` JWT middleware, real Express handlers and isolated PostgreSQL persistence were exercised. **Important security limitation:** HTTP test pool uses the isolated cluster's PostgreSQL superuser; these tests certify route-level role/ownership logic, **NOT production-equivalent non-BYPASSRLS connection isolation**. That independent Core/ARCHV1 gate remains open.
- Fresh synthetic `pg_dump -Fc` / `pg_restore --no-owner --no-acl --exit-on-error` into a *second* disposable DB passed: **87 tables, 212 policies and 16/5/7/1 synthetic school/Diary/plan/paper fixture counts** preserved. Snapshot SHA256 `eff09bfd00a878fa12c75f92d364480e9931da1e3cd8b9ea368491ed35a55ca1` (test fixtures only). The temporary restore DB was dropped; isolated PostgreSQL cluster then gracefully stopped. Listener 55447 absent; original PostgreSQL port 5432 remained open.

## Test evidence executed this phase

| Execution | Outcome |
|---|---|
| `node --test al-siddique-backend/src/tests/paper-studio-g43-metadata-list-projection.test.js` | **3/3 PASS**, originally 2 FAIL before fix |
| `node --test al-siddique-backend/src/tests/teacher-document-real-auth-clone.test.js` against isolated clone | **2/2 PASS**: real JWT teacher/principal/peer/cross-school Diary + Lesson, publication guard, data minimization, owner-only details |
| `node --test al-siddique-backend/src/tests/lesson-plans-http.test.js` against clone | **12/12 route assertions PASS** |
| `node --test al-siddique-backend/src/tests/daily-diary-layout-http.test.js` against clone | **9/9 route assertions PASS** |
| Six focused G43/G21/G23/author-scope/cognitive/settings test files | **24/24 PASS** |
| `node --check` changed backend routes/service/test, `git diff --check` | **PASS** |
| Snapshot restore and isolated DB graceful shutdown | **PASS**, separate from production rollback |

The 43-paper print corpus, Early Years geometry, Urdu/DOCX browser and frontend build passed in the **earlier `36ea2427` checkpoint**. They were **not rerun** in Phase 7 because no frontend or official-template sources changed. Phase 7 adds source-level regressions without revising those assets.

## Remaining mandatory gates / ownership

- **SaaS Core (P0):** joint signed tenant/actor policy and least-privilege non-BYPASS LOGIN routing across all relevant Paper, Diary, Lesson and SaaS endpoints; live production login remains privileged. Independent disposable-clone test must use actual restricted client credentials and verify database-enforced per-teacher/school/subject assignment. Audit service/superadmin/bootstrap paths and shared `database.js` without privileged fallback; reconcile Core/ARCHV1 branches. Do not promote Phase 7 alone.
- **Academic Master:** 0 independently verified APPROVED Grade IX–X questions as last posted to issue #4. No provisional question automatic approval or import. Issue #1 remains open.
- **Print/teacher operational:** production human login acceptance, real printer output, and long bilingual/Urdu PDF overflow physical pagination remain separate gates; Phase 7 route HTTP and older 43-document print tests do not establish these.
- **Historical #2/#3:** authoring recovery and serial+instruction bounded cross-field selection are separate unresolved paths.
- **Promotion:** only SaaS Core after source reconciliation, complete RLS/perimeter gates, deterministic builds, authenticated staging, backups/rollback and official paper invariants.

No production deployment or release authority claimed.
