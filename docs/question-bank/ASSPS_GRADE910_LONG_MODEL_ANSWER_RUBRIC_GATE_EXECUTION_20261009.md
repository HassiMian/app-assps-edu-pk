# ASSPS Grade IX–X Academic Master — Rubric-only long answer vs reviewed model answer source gate (9 October 2026)

## Recovered checkpoint and truly new finding

Confirmed GitHub coordination issue #4 and exact clean remote-matching Academic branch `feat/grade910-academic-master-evidence-20261008` at prior `32d0de3639d8edbeaeb3457c54854d650eb90bc7`. Existing 2,581-candidate ID/source ledgers, adoption page proof, independent reviewer/current account checks, immutable SHA, source classification, MCQ consistency, Chemistry X editorial review, Paper Studio and Core release ownership preserved.

**NEW verified systematic academic-quality problem:** Across the original **2,581** authored Grade IX/X research candidates in **73** authored source JSON files, **564** are long-answer questions. **165** long-answer `answer` fields start with grading instructions such as *“Award marks for …”*, which describe teacher marking criteria but do not give the student-facing explanatory model answer that an academically verified Question Bank should provide. Examples include **20/20 long answers in Grade X Biology**, **13/13 in Grade X Chemistry**, and other subject cohorts. Their question text is not changed, and this is not proof that every unflagged answer is correct. **58** existing authoring queues/exercise metadata records are excluded from the authored question count.

Earlier `requireGrade910MinimumQuestionIntegrity` validated nonempty answer, positive marks and text/type; signed review and publication could treat a nonempty rubric directive as a full valid model answer despite the lack of an explanatory response. School-adoption/page and source-to-revision parity checks cannot distinguish these roles. The new safeguard is deliberately independent and narrower than already completed answer-presence review.

## Implemented controlled fail-closed policy

- Shared dependency-free `grade910ModelAnswerPolicy.js` provides `rubricOnlyLongAnswer(type,answer)`. It detects **known English rubric-only answer beginnings** for `long` type (e.g. `Award marks for`, `Award 1 mark each for`, `Credit marks for`, `Marks for`). It intentionally does not certify every non-matching answer or claim Urdu marking text has been semantically analyzed.
- `grade910AcademicReviewGate.js` exports `grade910ModelAnswerIssues` and `requireGrade910ModelAnswer`, invoking the latter in final Grade IX/X publication precheck as part of original school source/revision, adopted textbook and independent review integrity checks. Stale already-signed mapping cannot bypass the model-answer requirement.
- `grade910AcademicReviewService.js` independently invokes the same guard **before** a human review mapping can be written or idempotently replayed. A rubic-only long answer fails with `ACADEMIC_MODEL_ANSWER_REQUIRED` (422). Genuine explanatory long-answer candidate passes only this one syntactic gate; original independent source/answer verifier signoff and all other role/page/RLS checks remain mandatory.
- No original Question Bank answer, rubric, question type/marks, published paper or adopted textbook registry was auto-edited. To repair, a qualified teacher must independently author a **real explanatory answer**, retain the marking points in a separately reviewed rubric where appropriate, create a new immutable question revision and obtain separate qualified review/signoff. This is not automatic approval.

## Authentic full-corpus faculty intake

`ops/qbank/audit-grade910-model-answer-readiness.cjs` scans all authored question source files, using the **exact same classifier as the academic backend**, and creates:
- `ASSPS_GRADE910_RUBRIC_ONLY_MODEL_ANSWER_REVIEW_20261009.json`: metadata-only **165** IDs with source-file SHA256 and individual original-question JSON SHA256, question type/chapter/marks/source, exact faculty next action, and `modelAnswerReviewed:false`, `academicApproved:false`, `publishedVerified:false`. Does NOT copy original question or answer passages.
- Sibling Markdown full research queue ordered by original authored source file (subject/priority), provides human specialist next steps, never treats absent pattern match as proof of academic correctness.

**Actual count:** original authored candidates 2,581 / 73 files; long questions 564; 165 rubric-only English long-answer candidates; 399 other long answers not flagged (**not certified**); 2,017 other question-type candidates; excluded 58 non-question metadata entries. No source/answer/academic approvals created.

## Adversarial RED → GREEN evidence

- **Before patch:** three new genuine negative tests failed in the actual independent review service, final publication gate and pure rubric-classifier export, **52/55 targeted PASS, 3 FAIL**. A fourth positive test established that a genuine explanatory long answer is still allowed past this check, without receiving academic approval.
- **After patch:** full pre-existing + new review service/gate targeted tests **55/55 PASS**, including replay blocked before mapping insert, stale signed rubric rejected at publication, exact correct long answer allowed, short/MCQ unaffected, and expanded English rubric formats.
- Full new versioned corpus audit tests **7/7 PASS**, including actual 2,581 ID count, 165 affected originals, exact grade X Biology/Chemistry cohorts, SHA fingerprints, duplicate ID rejection, count change on synthetic revised answer, no original text copied into researcher reports and zero manufactured approvals.
- Inherited full Academic focused and all 510 original Grade9/10 authoring staging suites were launched on the same final source with separate TAP and process `.exit` evidence, and results are appended below after they terminate.
- These tests are synthetic source/service integrity checks. **NOT independent human-reviewed full academic answers, physical book proof or live restricted-role PostgreSQL tenant/RLS certification**.

## Original release hold and ownership

The original 2,581 research/draft questions remain in place, human question source/page verified **0**, independently academically reviewed **0**, approved **0**, published academically verified **0**. Real ASSPS-approved textbooks, editions, medium and board exam year, physical/exercise pages, specialist scientific/model-answer and Urdu equivalence review, and qualified revision-specific signing remain prerequisites to Paper Studio selection.

Only Academic Master owns this scoped gate/audit. No live production database seeding, migrations, Paper Studio/source-paper changes, Core signed JWT/RLS/role changes or deployment occurred. SaaS Core exclusively controls production certification.

## FINAL source exact independently executed test results

- New service/publisher negative tests were **3 RED prepatch** (52/55 targeted PASS). After introducing shared `rubricOnlyLongAnswer` and invoking it at both review and publication: **55/55 PASS** (0 failed, 0 skipped, 0 cancelled) in `/tmp/assps-grade910-rubric-green-20261009.tap`.
- New full-corpus rubric/source content QA: **7/7 PASS**, 0 failed/skipped/cancelled; `/tmp/assps-grade910-rubric-audit-targeted-20261009.tap`. Actual 165 affected long-answer IDs recorded, source/question hashes attached; no evidence promoted.
- Fresh final source focused GradeIX/X Academic service/source/reviewer/MCQ/Urdu/numerical tests: **182/182 PASS**, process **exit 0**, failed 0, skipped 0, cancelled 0, elapsed 24.80 seconds; TAP `/tmp/assps-grade910-model-answer-final-focused-20261009.tap`, separate `.exit`.
- Fresh original full GradeIX/X authoring/staging tests: **510/510 PASS**, process **exit 0**, failed 0, skipped 0, cancelled 0, elapsed 35.47 seconds; TAP `/tmp/assps-grade910-model-answer-final-staging-20261009.tap`, separate `.exit`.
- Source JS syntax and staged Git whitespace checks passed. The full-corpus question/answer bytes and published paper bytes are unchanged.
