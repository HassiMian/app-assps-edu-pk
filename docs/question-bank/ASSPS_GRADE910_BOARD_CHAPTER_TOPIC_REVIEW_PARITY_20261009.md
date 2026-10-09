# ASSPS Grade IX–X Academic Master — Curriculum board/chapter/topic source-to-revision parity (9 October 2026 UTC)

## Original resumed checkpoint

After reviewing current GitHub issue #4 (SaaS Core Phase24, Paper Studio Phase20, APEX Connect current separate stream) the Academic Master branch `feat/grade910-academic-master-evidence-20261008` and remote origin were verified clean/equal at `ce86d5cbe72f76adb7dce1e526a9770e74123079`. This is a NEW subject/topic provenance integrity change, not another MCQ key, duplicate-flag, reviewer status, printed-page, source/revision question-text or minimum-marks fix.

## Newly reproduced academic approval defect

The governed immutable question revision in `questionBankGovernance.normalizeQuestionForGovernance()` explicitly contains **`board`, `chapterName`, `topicName`**. The linked legacy tenant-local school Question Bank has **`board`, `chapter_name`, `topic_name`**. But at Grade IX/X independent review and publication prechecks, source-vs-revision comparison only checked grade, subject, medium, chapter **number**, question text, options, answer, marks, and signature/source-page evidence. It did **not** read/compare the school's board, chapter **title** or topic. Two otherwise identical question texts assigned to different curricular topics/board/chapter labels could therefore progress toward academic review/signoff even when their source mapping differed.

**Not a production incident:** This gap was reproduced only in synthetic tenant SQL service/gate tests. It does not establish that any actual question has been published, source-page verified or wrongly assigned to a topic.

## New bounded fail-closed implementation

- `requireGrade910CurriculumMapping(source,revision)` checks three separate original-vs-immutable mapping identities: examination `board`, textbook `chapter_name` vs `chapterName`, and curriculum `topic_name` vs `topicName`. Each value must be **nonempty on both sides** and Unicode NFKC, case- and whitespace-equivalent. Both missing fields, one missing field or a changed value fail closed with stable `ACADEMIC_CURRICULUM_TOPIC_DRIFT` (409). This is a mapping **identity check**, not independent proof that the cited board/book/session is approved or topic classification is scientifically correct.
- Existing school-scoped `question_bank` source selects now include original `board,chapter_name,topic_name`; no new DB tables or migrations. The review-recording path `FOR SHARE` compares the immutable revision **before writing or replaying a human-review mapping**; final publisher path `FOR UPDATE` independently compares even if there is an earlier saved signature.
- A valid normalized label difference (capitalization/spacing) may pass this one technical gate but grants no academic approval; all existing independently approved school edition, printed page/exercise, source bytes, question correctness, Urdu, reviewer-role and duplicate/answer gates remain mandatory.

## Actual red/green evidence

Five freshly authored synthetic adversarial tests executing the actual review service and publisher gate were **RED before patch** (**32/37 existing-plus-new PASS; five FAIL**): wrong source topic, unrelated original chapter title, different board, missing original mapping including matching absent original/revision, publication after original mapping drift, and absence of board/topic columns in the locked source query. The new guard made **37/37 PASS**, and a sixth case verified normalized equivalent board/chapter/topic names still result only in an idempotent review replay with `questionBankApproved:false`, **38/38 PASS**.

Full focused Academic source/review/Urdu/numerical/MCQ and all 510 original staging tests are rerun sequentially with explicit process exit markers, reported in the final coordination checkpoint. This is **synthetic SQL coverage, not live signed Postgres authorization certification**.

## Academic release hold and next evidence

Original authored candidate records: 2,581, question-level human independent book/source-page verified 0, independently human academically reviewed 0, academic-approved 0, published verified 0. Main academic blockers: actual ASSPS-adopted grade/subject/medium textbook title/edition, curriculum and board examination cohort, physical printed/PDF pages/exercises, expert answer/distractor correctness and Urdu/English equivalence, independent signoff on a specific revision. There is **no automatic curriculum mapping certification**. No original questions/drafts, source PDFs, official papers, DB students/tenants, backend signed Core security, Paper Studio/Connect code, migrations or production deployment changed. SaaS Core alone owns production certification.

## Final executed regression, exact current Academic source

- Five synthetic new adversarial cases **RED before source patch** (existing-plus-new targeted **32/37 PASS; 5 FAIL**). After both gates checked original school board, chapter title and topic, **37/37 PASS**. Extra normalized-whitespace/case positive control: **38/38 targeted PASS**, with `questionBankApproved:false`, not a new approved question.
- Comprehensive Academic/source/MCQ/bilingual/numerical/reviewer/page/academic editorials focused tests: **165/165 PASS**, 0 fail, 0 skip, 0 cancel, separate runner **exit code 0**, TAP `/tmp/assps-grade910-topic-mapping-focused-20261009.tap`, exit marker `/tmp/assps-grade910-topic-mapping-focused-20261009.exit`.
- Original full Grade IX–X research/draft staging/contract tests: **510/510 PASS**, 0 fail, 0 skip, 0 cancel, separate runner **exit code 0**, 121.32 seconds, TAP `/tmp/assps-grade910-topic-mapping-staging-20261009.tap`, exit marker `/tmp/assps-grade910-topic-mapping-staging-20261009.exit`.
- JavaScript syntax and staged whitespace checks PASS. No real independently adopted school textbook, specialist mapping approval, restricted live PostgreSQL tenant test or production deployment is claimed.
