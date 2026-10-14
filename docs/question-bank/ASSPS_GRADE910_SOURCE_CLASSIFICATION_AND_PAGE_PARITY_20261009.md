# ASSPS Grade IX–X Academic Master — Question assessment/source attribution parity gate (2026-10-09)

## Recovered source of truth

GitHub coordination issue #4 was reread; exact clean Academic worktree and origin branch `feat/grade910-academic-master-evidence-20261008` matched at `134ef3372f5f8345044e28d0e19c4ef3be5f708c`. Latest other-master evidence belongs to their owners. The earlier actual immutable revision SHA, school board/topic, reviewed actor authorization, duplicate source, MCQ answer and printed-page fixes were **not** repeated.

## New independently reproducible academic integrity risk

The existing source question `question_bank` stores `difficulty`, `priority`, `source_type`, `source_file_id` and `source_page_no`. Question governance captures matching fields in its immutable revision as `difficulty`, `priority`, `sourceType`, `sourceFileId` and `sourcePageNo`. The Academic review and final publisher gates already compared source/revision question wording, answer/marks and board/chapter/topic, but **did not SELECT or compare these assessment-classification and original-file/page attributes**. Thus a linked school source question with the same text could be misclassified as another difficulty/priority or assigned to a different original file or specific page without rejection at the review evidence boundary.

This demonstrates a synthetic code-level integrity gap, **not proof of any wrong production question, verified source or published paper**.

## Scoped fail-closed implementation

- New `requireGrade910SourceClassification(source,revision)` compares nonempty original-vs-immutable `difficulty`, `priority`, `source_type` case/whitespace/Unicode-normalized and nonempty **exact filename identity** `source_file_id`, preventing false changes from label casing while not silently accepting a different file.
- Both `source_page_no` and immutable `sourcePageNo` must be absent together, or be the **same positive safe integer**. Negative, zero, fractional, or numeric-string page values reject rather than being accepted via coercion. This avoids mistaking a physical textbook printed page for a PDF index or silently inventing a page number.
- An unavailable original provenance field or content/classification drift fails with `ACADEMIC_SOURCE_CLASSIFICATION_DRIFT` (409). There is **no automatic original data repair, textbook page fabrication, deduplication clearing or human approval**.
- Existing tenant-scoped locked source queries now retrieve these fields in `recordIndependentAcademicReview()` (`FOR SHARE`) and `assertIndependentReviewReady()` (`FOR UPDATE`). Each applies the same check **before** permitting either review recording/replay or final publication. All existing content-hash, independent active signer, curriculum school adoption, physical page/exercise, source-revision answer/distractor/marks, Urdu and duplicate checks remain mandatory.
- A matching `json_seed` file identity is only attribution to the provisional import source, **not validation that the original textbook edition/page was verified or authorized for ASSPS**.

## Negative-to-green test results and preserved behavior

Actual Academic service and final publisher executed with isolated tenant-scoped SQL mock and unchanged school draft fixtures:
- Four new targeted cases **RED before implementation**: original source difficulty/priority/file/page mutation; missing or equally blank source-file/source-type attribution; publisher recheck of changed source classification after old signature; locked query not selecting provenance. The source test baseline was **45/49 PASS and 4 FAIL** after correcting one unrelated rearranged-JSON test fixture.
- Postpatch **49/49 PASS**, plus new positive valid matching page and strict negative invalid page tests: **51/51 targeted PASS**, failed/skipped 0. A synthetic positive idempotent review replay remains `questionBankApproved:false`.
- Full focused Academic/source/reviewer/page/answer/numerical/Urdu regression and full 510 original authoring staging are executed sequentially with independent `.tap` and `.exit` evidence; the final GitHub coordination report records exact process results.

## Current genuine readiness blockers and safety

**2,581 original research/draft authored candidates; independently human source/page-verified 0; independently human academically reviewed 0; approved 0; academically verified published 0.** School-approved textbook titles, editions and grade/subject/medium adoption per session/examination year, real physical textbook pages and exercises, qualified subject accuracy/originality and Urdu–English equivalence review remain required. Do not treat a matching `source_file_id`/page number as textbook proof.

Only Grade IX/X Academic-owned review gate, independent review service, synthetic test and evidence document changed; no original authored corpus or academic approval mappings, production school/student/tenant DB, database migrations, Core signed role/RLS, Paper Studio, Connect, official school papers, PM2/firewall/ingress or production deployment touched. SaaS Core is solely responsible for production release certification.

## Final executed regression, exact current source

- Four new synthetic negative controls **RED before patch** (**45/49 PASS, 4 FAIL**): altered original difficulty/priority/source type/file/page; empty provenance on both aligned source/revision; old-review publication after classification changed; and a locked source query that omitted these provenance fields. The unrelated rearranged-key fixture was updated to reflect the expanded valid sample question *before* documenting these four true RED cases.
- After patch and two extra positive/strict-page controls, **51/51 targeted PASS**, no fail/skip/cancel. A valid matching synthetic source file/page remains provisional and does **not** receive academic approval.
- Final focused Grade IX/X academic/source/book/reviewer/MCQ/numerical/Urdu/metadata regression **178/178 PASS**, failed 0, skipped 0, cancelled 0, independent process exit **0**. Exact TAP: `/tmp/assps-grade910-classification-focused-20261009.tap` and separately recorded `.exit`; duration 40.93 seconds.
- Original complete Grade IX–X authoring/staging/contract regression **510/510 PASS**, failed 0, skipped 0, cancelled 0, independent process exit **0**. Exact TAP: `/tmp/assps-grade910-classification-staging-20261009.tap` and separately recorded `.exit`; duration 64.88 seconds.
- JavaScript syntax checks and staged whitespace guard PASS. This is an actual service/gate synthetic tenant SQL test, **NOT an executed restricted-role PostgreSQL/production RLS certification or a human textbook review**.
