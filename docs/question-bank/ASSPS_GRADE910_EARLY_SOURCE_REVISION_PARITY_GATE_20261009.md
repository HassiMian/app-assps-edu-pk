# ASSPS Grade IX–X Academic Master — Early linked source/revision parity review gate (9 October 2026)

**Resume checkpoint:** Academic-owned isolated `feat/grade910-academic-master-evidence-20261008` was verified clean at pushed SHA `d55c06742bbb2d2496e12345ee08207ccdd23925`. GitHub issues #4 and #1 coordinate masters. This phase does not repeat completed MCQ-key integrity, book printed-page certification, original-creator independence, timestamp/signoff, numericals, Urdu/Physics editorials, or near-duplicate research.

## New actual trust gap, reproducible before source change

`recordIndependentAcademicReview()` already checked original Question Bank row's **creator identity**, but its tenant query selected only `created_by`. It never checked whether the **linked original school's question text, answer, marks, chapter/medium or options** matched the immutable governed revision being marked independently reviewed. That fuller parity was enforced *later* in `assertIndependentReviewReady()` at publication, so an apparently recorded/replayed independent academic review could exist for text that had already drifted from the linked school source. Such a review should be rejected at recording, not wait until publication.

This is a synthetic audit inconsistency demonstrated by actual service code tests; **not evidence any wrong question was released**. Actual original question content and approved academic records were not modified.

## Narrow fail-closed source change

- Existing tenant-scoped, transaction-held `SELECT ... FROM question_bank WHERE school_id=$1 AND id=$2 FOR SHARE` now retrieves the original's **class level, subject, medium, chapter, question type, English/Urdu text, options, selected key, answer, explanation and marks**, while preserving source author identity.
- Before writing or replaying an independent review attestation, require original Grade IX/X, subject and medium to match the revision; require the chapter to match; and reuse the already hardened `approvedSourceMatchesRevision(original,revision)` canonical source-vs-current-question parity for complete question/answer/marks/options integrity.
- Reject with stable `REVIEW_LINKED_SOURCE_CONTENT_DRIFT` (409). It does not update original questions, silently reconcile differing text, or issue a reviewer attestation. The publication gate **still independently checks again** later.
- Current linked-original creator, independent actor/signer/time, school edition/adoption, source-page image, MCQ validity and revision hash checks are preserved.

## Before/after negative evidence

- Three newly added synthetic tests using **actual service code and isolated in-memory tenant SQL adapter** were RED before the change (**14/17 targeted PASS, 3 FAIL**): linked source's different stored answer; source marks/chapter drift; and medium drift could still be recorded/replayed.
- After enforcing original-vs-immutable parity, those tests PASS; added adversarial stem, subject, grade, question type and explanation mutation checks, verifying **no academic mapping insertion** in each rejected case. A byte-equivalent existing synthetic original row still permits an idempotent replay with `questionBankApproved:false`.
- **19/19 targeted PASS**, and full original Grade IX–X focused and 510 staging regressions are executed with independent process exit markers; final measured counts in the corresponding GitHub issue checkpoint.

## Academic release status

Research/draft authored original questions **2,581**; independently source-verified questions **0**, human academically reviewed **0**, academically approved **0**, published verified **0**. Official school-adopted textbook edition/medium and examination year, physically inspected original PDF/printed book pages/exercises, authoritative syllabus, competent independent answer/Urdu equivalence reviewers and signed tenant-bound approval are still mandatory.

No production data/schema/seed, question authoring source, source PDF, official paper/First Term template, Core signed tenant/RLS/roles, Paper Studio or Connect code, PM2/network/firewall or deployment changed. Only SaaS Core owns production certification and release.

## Final executed regression results (same isolated source)

- Negative controls first: **3/3 newly introduced synthetic source/revision drift tests failed as expected before the fix** (total old targeted **14/17 PASS, 3 FAIL**). After fix and additional negative/positive controls: **19/19 targeted PASS**, 0 fail/skip.
- Full focused Academic, source identity/page, 91 original numerical, bilingual structure, 18 Physics IX conceptual reference, Chemistry IX editorial and revision-gate tests **143/143 PASS**, 0 fail/skip/cancel, **process exit 0**. Evidence: `/tmp/assps-grade910-early-review-focused-20261009.tap` and independent `.exit` on the isolated VPS.
- Full Grade9–10 authoring/staging suite **510/510 PASS**, 0 fail/skip/cancel, **process exit 0**. Evidence: `/tmp/assps-grade910-early-review-staging-20261009.tap` and independent `.exit`.
- JavaScript source/test syntax and staged Git whitespace checks pass. No signed PostgreSQL clone proof, production authorization, human source review, or approval is claimed.
