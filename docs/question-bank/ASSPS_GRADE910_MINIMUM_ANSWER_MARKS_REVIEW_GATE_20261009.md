# ASSPS Grade IX–X Academic Master — Minimum answer and marks reviewability gate (9 October 2026)

## Verified continuation and scope

Existing isolated Academic branch `feat/grade910-academic-master-evidence-20261008` was verified clean at local+remote `c660b46eb26bee27f1cfd9994ac9ec99b0a22eb9` after retrieving latest GitHub issue #4. This change is separate from completed MCQ selected-option integrity, duplicate status, printed textbook pages, source/revision parity and independent reviewer signature/creator work.

## New negative-tested academic risk

The approved-source-vs-immutable-revision equality check could accept two **equally incomplete** non-MCQ source and revision copies: an empty stored answer in both, an empty prompt in both, or identical invalid marks. Existing MCQ integrity required a selected-answer match for MCQs, but short, long and numerical records had no independent minimum reviewability validation. This meant exact source parity was incorrectly treated as sufficient for such structural completeness at academic publication precheck; identity alone is not academic quality.

Three new synthetic tests were **RED before the fix** (`13/16` existing+new academic gate cases PASS, `3/16` FAIL): (a) matching blank short/long/numerical answers, (b) matching blank stem/invalid nonpositive or fractional marks/blank type, and (c) missing generic minimum integrity helper. This does **not** show any actual real production question was approved incorrectly.

## Implemented fail-closed review gates

- New `grade910MinimumQuestionIntegrityIssues(value,legacy)` checks all question types, including non-MCQ: stable question-type identity; at least one nonempty question stem (English or Urdu); nonempty stored answer; and positive, safe integer marks. It uses existing canonical value normalization for both immutable revision and linked original, rather than trusting exact equality between two malformed copies.
- New `requireGrade910MinimumQuestionIntegrity` throws `ACADEMIC_QUESTION_INCOMPLETE` (422) with bounded structural issue codes. It is enforced when recording independent academic review, before its attestation can be persisted or replayed, and via `approvedSourceMatchesRevision` for BOTH linked original and revision at source parity and publication precheck.
- Existing stricter A–D MCQ selected-answer/options integrity remains unchanged; this is additive, not replacement. The scope does not reject a valid Urdu-only prompt or change any question text, answer, marks, approved state or school source registry.
- An otherwise identical linked school original and revision both carrying blank answers or zero marks cannot advance to signed academic review. Existing source drift error at early recording prevents mapping insertion; final approval also checks the minimum independently.

## Adversarial and preservation tests

- Targeted new gate negatives cover `short`, `long`, `numerical`, empty answers and stems, absent question type, zero/negative/fractional/empty marks; positive valid short question preserved.
- Actual academic review-recording service executed in a VM with synthetic tenant-scoped SQL adapter: matching source+revision with blank answer or zero marks now rejected before mapping insertion; a valid Urdu-only original/revision still permits an **idempotent review replay with `questionBankApproved:false`**. This is NOT a human translation-equivalence finding.
- Individual gate **16/16 PASS**; existing+new synthetic academic review service cases **25/25 PASS**. Complete focused and 510 original staging regressions are run with independent explicit process-exit markers and final GitHub report records their exact counts.

## Academic release requirements unchanged

Original authored Grade IX–X research drafts: **2,581**. Human source/page-verified **0**, independent human-academically reviewed **0**, approved **0**, verified published **0**. School-approved grade/subject/medium textbook edition and examination cohort, printed/PDF physical textbook page/exercise identity, independent scientific answer correctness, originality and bilingual semantic review remain blocked on real school/adopter/reviewer evidence. No production seeding, school/tenant data change, official paper overwrite, source PDFs, original authored question changes, backend SQL migrations, Core signed JWT/RLS, Paper Studio/Connect code, production services or deployment. Paper Studio verified question selection HOLD. SaaS Core solely owns production certification and deployment.


## Fresh final execution evidence (current isolated source)

- Three new negative gate controls **RED prepatch (13/16 targeted PASS, 3 FAIL)**; corrected targeted academic-gate **16/16 PASS** with explicit short/long/numerical, blank answer, missing stem, marks and positive Urdu-only fixtures.
- Review-recording actual service tests with independent tenant-scoped synthetic SQL adapter **25/25 PASS**, including no mapping insert for identical blank answer/zero marks and positive idempotent Urdu-only review, never approving it.
- Complete academic focused review/provenance, numerical, bilingual, source/cache, textbook page and MCQ regression **152/152 PASS**, 0 failures/skipped/cancelled, distinct `/tmp/assps-grade910-answer-minimum-focused-20261009.exit` **0** and TAP `/tmp/assps-grade910-answer-minimum-focused-20261009.tap`.
- Complete original Grade IX–X staging authoring/contract suite **510/510 PASS**, 0 failures/skipped/cancelled, distinct `/tmp/assps-grade910-answer-minimum-staging-20261009.exit` **0** and TAP `/tmp/assps-grade910-answer-minimum-staging-20261009.tap`.
- All checks isolated; no live PostgreSQL/RLS credential tests, authentic textbook page checks, subject reviewer signoff or production authorization is asserted.
