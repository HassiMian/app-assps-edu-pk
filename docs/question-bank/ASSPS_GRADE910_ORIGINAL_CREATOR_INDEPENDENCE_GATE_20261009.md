# ASSPS Grade IX–X Academic Master — Linked original-creator independence gate (9 October 2026)

**Source continuation:** Clean academic branch `feat/grade910-academic-master-evidence-20261008`, resumed at `4a97fcef9563820155d161b2c931d88e6cbfeb37` with current coordination in GitHub issues #4 and #1. This change is not a rerun of earlier MCQ-answer, source-page, original numerical, near-stem, Urdu or Physics candidate work.

## Genuine previously untested independence gap

`grade910AcademicReviewService.recordIndependentAcademicReview()` required an authenticated tenant principal/admin reviewer distinct from `question_masters.created_by` and `question_revisions.created_by`. **It did not query the tenant-linked original `question_bank.created_by`** at all. Consequently a person recorded as the creator/importer of the original Question Bank row could be permitted as the supposedly independent reviewer when another person authored its governed master and revision. `assertIndependentReviewReady()` likewise checked the master and revision creators but omitted linked original-row creator.

This is a security-of-evidence / independence weakness reproduced in synthetic tests; **it is not evidence that any real Grade IX/X question has been inappropriately approved or published**. All 2,581 original authoring records remain provisional; no human academic approval is certified.

## New fail-closed implementation

- Review capture now reads **`SELECT created_by FROM question_bank WHERE school_id=$1 AND id=$2 FOR SHARE`** within the existing tenant transaction; the row-level shared lock keeps its source creator identity stable while the review is recorded. A missing linked row fails `REVIEW_SOURCE_QUESTION_NOT_FOUND`. A null, invalid or nonpositive source creator fails `ACADEMIC_REVIEW_SOURCE_CREATOR_UNKNOWN`. A source creator who is also the named academic reviewer fails `ACADEMIC_REVIEW_SOURCE_CREATOR_CONFLICT`.
- Publication readiness additionally selects linked `question_bank.created_by` from the existing tenant-scoped locked source query. It refuses missing creator provenance (`REVIEW_SOURCE_CREATOR_UNKNOWN`) and reviewer == original Question Bank creator (`REVIEW_SOURCE_CREATOR_NOT_INDEPENDENT`). This is an independent recheck even if a saved review mapping already looks approved.
- Existing independent master/revision author checks, immutable content hash/revision, distinct approver/releaser, official school-adopted edition, human physical page/image and selected-answer integrity gates remain unchanged. This is narrow evidence enforcement, **not a new login, JWT, SQL migration, RLS/grant/policy or role enlargement**.
- The `question_bank.created_by` database field is an attributable **row creator/importer**, not necessarily the intellectual author of educational text. Distinguishing both must still be handled by authenticated human academic review. Null provenance is explicitly blocked from approval rather than silently presumed independent. Any old imports missing `created_by` need separate trusted attribution; DO NOT invent creator IDs or bulk reseed.

## Reproduced and regression evidence

New `al-siddique-backend/src/tests/grade910-independent-source-creator.test.js` executes the **actual AcademicReviewService code** in a VM with a minimal in-memory tenant-scoped SQL adapter, and the real final-approval gate with synthetic source, reviewer, and revision rows. Before the fix, **1/5 PASS and 4/5 FAIL**: the reviewer could be the original question creator and absent source identity was not rejected at the expected boundary. After the fix, **5/5 PASS**, followed by a sixth adversarial missing/cross-tenant source-row test for **6/6 PASS**. Positive separate-originator control still requires all other source/evidence proofs and grants no approval.

The broader focused academic, source, numericals, answer/Urdu and integrity suites and all **510** original Grade IX–X staging tests are executed with explicit process-exit markers; report final counts only after exit verification.

**Publication and production HOLD:** source-verified 0, human-reviewed 0, approved 0, verified published 0; Paper Studio verified selection must remain empty. Independent school textbooks/board year, physical source pages/exercises, scientific answer keys, bilingual review, and SaaS Core signed non-BYPASS RLS/production certification remain mandatory. SaaS Core exclusively owns production deployment and rollback. No original authored questions, official papers, original source PDFs, live tenant data or production processes changed.

## Final actually executed regression (same isolated source)

- New linked-source creator negative/positive suite: **6/6 PASS**, exit 0. Prepatch deliberately failed **4/5** new checks; fifth control passed.
- Combined academic grade/subject/MCQ, original numericals, source identity/hash, bilingual structure, review triage, Physics IX reference, Chemistry IX revision and source-page proof: **130/130 PASS**, skipped 0, failed 0, process **exit code 0**. TAP: `/tmp/assps-grade910-independence-focused-20261009.tap`.
- Full original Grade IX–X staging authoring/contract and scope regression: **510/510 PASS**, skipped 0, failed 0, separate process **exit code 0**, duration 70.99s. TAP: `/tmp/assps-grade910-independence-staging-20261009.tap`.
- JavaScript syntax and git whitespace checks pass; final origin SHA and clean worktree are separately verified post-push. No full frontend build, physical textbook review, live signed PostgreSQL integration or human-reviewed publication is claimed in this Academic-only change.
