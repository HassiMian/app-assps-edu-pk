# ASSPS Grade IX–X Academic Master — Unresolved legacy duplicate flag academic-review hold (9 October 2026 UTC)

## Verified continuation and scope

Academic Master resumed from clean remote-matching `9642872ddb587f079d579950e88af0b89ec7b540` on isolated `feat/grade910-academic-master-evidence-20261008` after reading coordination GitHub issue #4. This is **not** a repeat of MCQ selected-answer, review signature/time, source author, physical textbook page, source-vs-revision or originality-similarity batch work.

## Reproduced new evidence-integrity weakness

The actual legacy `question_bank` table already defines a nullable `is_duplicate BOOLEAN DEFAULT false` (see `al-siddique-backend/src/config/migrate.js`), representing the source row's existing duplicate-suspect flag. The Grade IX–X `recordIndependentAcademicReview` path previously queried linked original creator and full immutable question revision, but **not** its duplicate flag. The `assertIndependentReviewReady` publication precheck likewise selected `is_approved`, but not `is_duplicate`. Therefore a synthetic original question already flagged duplicate (or with missing/uncertain flag) was not refused at those academic provenance gates and could proceed toward review mapping/release checks.

**This is a synthetic code-level gap**, not evidence that any real question has been wrongly approved or published. The legacy duplicate flag itself is NOT independent academic deduplication and a false value never proves originality.

## New scoped fail-closed guard

- Added `requireUnflaggedGrade910Source(source)` in the Grade IX–X academic review gate, requiring **strict JavaScript boolean `source.is_duplicate === false`**, rejecting `true`, `null`, absent and even string `'false'` with `REVIEW_DUPLICATE_STATUS_UNRESOLVED` (409). There is no automatic flag clearing, original question modification or human review forgery.
- Both the existing tenant-scoped transaction-held source query in `grade910AcademicReviewService.js` (`FOR SHARE`) and existing release-precheck locked source query in `grade910AcademicReviewGate.js` (`FOR UPDATE`) now explicitly select `is_duplicate` and apply the same guard.
- Review capture must reject before recording or replaying independently signed mapping; publication must reject even if there is already a signoff mapping whose original's duplicate flag is set later.
- Existing tenant identity/source-revision parity, school edition and physical book page, scientific MCQ key consistency, independent human reviewer and review signature/time checks remain intact.
- Existing legacy records where the duplicate column is null require actual deduplication/independent investigation and legitimate operator resolution; **do not coerce missing flags to `false`, mass-update data, or certify human originality automatically**.

## Reproducible negative-to-green evidence

- Three new synthetic tests were RED before source patch: source with flagged/uncertain duplicate still progressed, publication did not reject suspect duplicates, positive query contract did not select duplicate status (**original targeted 19/22 PASS, 3/22 FAIL**). After patch they passed alongside all previous reviewer/source cases (**22/22 PASS**).
- Negative inputs include explicit `true`, `null`, absent and nonboolean `'false'`. For review write-path failures tests assert **no `INSERT INTO question_mappings`**. The positive `is_duplicate:false` fixture remains a provisional replay and returns `questionBankApproved:false`.
- Full academic focused regression + full original Grade IX–X 510-case staging is run in a separate controlled sequential process with explicit exit-code files; see exact GitHub issue #4 final checkpoint for totals.
- This is **mechanical flag integrity only**, not proof of zero semantically duplicated questions or independent verified textbook editions.

## Release blockers unchanged

Original 2,581 authored draft/research questions; independent human source-page-verified 0, human academically reviewed 0, academically approved 0, verified published 0. Official ASSPS edition/session/exam-year and board scheme, physical book printed/PDF page and exercise number, scientific answer checks, duplicate originality human review and Urdu-English equivalence remain pending. No question seeding, textbook copying, source-file edits, Core signed role/RLS, official paper modification, student/tenant data, schema migration, live service change, or production deployment. SaaS Core exclusively owns signed database/tenant security and production release certification; Paper Studio verified question selector stays HOLD.

## Final isolated execution evidence

- Newly expanded Academic source/reviewer synthetic suite **22/22 PASS**, including prepatch newly introduced **3/3 RED (19/22 total PASS before fix)**.
- Focused Grade9/10 academic, original linked source, school/printed-page, MCQ, conceptual science, numerical, Urdu and review queue regression **146/146 PASS**, failed 0, skipped 0, cancelled 0, **process exit code 0**, TAP `/tmp/assps-grade910-dupe-flag-focused-20261009.tap`.
- Original full Grade9–10 staging/authoring contract regression **510/510 PASS**, failed 0, skipped 0, cancelled 0, **process exit code 0**, TAP `/tmp/assps-grade910-dupe-flag-staging-20261009.tap`.
- Each suite was run sequentially with a separate `.exit` marker in the isolated VPS runner; no inherited test PASS from older commits.
- `node --check` and staged whitespace verification PASS. No live PostgreSQL/teacher UI, physical textbook source image or SaaS Core production security certification was executed or claimed.
