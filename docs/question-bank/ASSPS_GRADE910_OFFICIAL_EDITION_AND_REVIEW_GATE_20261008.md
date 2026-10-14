# Grade IX-X Academic Master: 2026-27 edition and human-review gates (2026-10-08)

**Status:** academic evidence decision, not approval or a production release. Base 1b29218; isolated Academic Master branch. No Question Bank writes.

## Newly verified official-listing drift
- PECTAA official book listing (retrieved 2026-10-08): https://pectaa.edu.pk/books-and-publications/ explicitly lists Class IX **Computer and Entrepreneur 9 (2026-27)**; the same current listing identifies new **Class X 2026-27** books, including English, Urdu, Mathematics, Pakistan Studies, Biology, Chemistry, Computer Science and Physics. Historic 2020/2023-24/2025-26 entries coexist and cannot be assumed interchangeable.
- The previous 111-record manifest/hash cache is an **acquisition snapshot**, not an authoritative school-adoption certificate. Do not retroactively rename historic editions; construct edition-specific source IDs and separate per-year applicability decisions before authoring/publishing revised-book questions.
- PECTAA 2026 Grade IX ALP material: https://pectaa.edu.pk/curriculum-compliance/ . A scheme explicitly tied to Annual Exam 2026 is *not* evidence for 2027/2028 unless a board-specific notice explicitly extends it.
- Provincial secondary scheme example: https://home.biselahore.com/downloads/notifications/misc/Syllabus_9th%2610th_%282025_27%29.pdf . BISE Lahore evidence alone cannot certify ASSPS Narowal cohort; the school affiliation/registration and applicable BISE Gujranwala notices must be independently established.
- School-wide teaching session **2026-27 is supported by AL_SIDDIQUE_TIMETABLE_2026_2027_READABLE.pdf (ASSPS academic timetable, 23 Aug 2026)**. Grade IX examination year, Grade X cohort, exact adopted printed textbook/ISBN/edition and subject/medium authorizations remain **UNCONFIRMED**. Do not set them by inference from a running portal session field.

## Source recovery and required evidence per question
1. Protect historical 110/111 hash-matched PDF identities and original SHA values; unresolved pectaa-catalog-037 remains quarantined. Hash matches are file identity only.
2. Capture current PECTAA official URL, retrieval date, PDF bytes SHA, physical PDF page, printed book page, photograph/render of heading, chapter/topic identity and exercise paragraph/number.
3. Run two-source cross-check for Urdu/English chapter and terminology mapping; no ordinal-based forced equivalence.
4. Only after edition/cohort and physical source proof are independently checked may a question gain the **source_verified** tier.
5. For original questions, label book pages as **curriculum context** rather than pretending copied exercise/page origin. Distinguish verified original answer from reproduced textbook answer.
6. Academic review is a separate signed, revision-hash-bound human decision; the assistant's editorial checks and 27-question Biology pilot are **not** independent human signoffs. No approved snapshot currently exists.

## Reconciled implementation
- Ported **review-gate service, read-only identity registry, tests and documentation** from isolated `fix/grade910-academic-review-gate-20261008`; these are a candidate library only, no production route wiring or DB migration.
- Ported **live source evidence audit and tests** from `audit/grade910-source-page-evidence-20261008`; it defaults to review-only and its live invocation must respect approved restricted-role read-only access.
- Ported **Biology IX Chapter 1 27-item immutable review docket generator and tests** from `feat/assps-phase5-academic-review-ui-20261008`; source hashes and revision-pin metadata are retained, with all review fields false.
- **Do not cherry-pick** the old QuestionBankRoutes/QuestionBankGovernance/Phase 5 UI blindly: they belong to existing SaaS/Paper Studio release coordination and require a later source-diff + role/RLS gate.

## Immediate academic pilot
Review the 27 original Grade IX Biology, Chapter 1 candidates (12 MCQs, 12 short, 3 long): source book page images and current edition, factual answers, MCQ distractors, language, difficulty, marks and originality. Human reviewer records identity, immutable question SHA, evidence and timestamp, with an independently authorized second-stage approval. Source-verified/independently reviewed/approved/published = **0 pending real evidence**.

## Contract and blockers
GitHub issue #1 governs versioned approved revisions, server-side school/tenant filtering and Paper Studio integration; issue #4 governs concurrent branches. Current work provides *review inputs only*, never selectable approved content.

## Editorial MCQ option-sequence defect found during this checkpoint
The Biology IX Chapter 1 original pilot has 12 MCQ keys following `A B C D` **exactly three times**. The 3/3/3/3 key distribution looks balanced but the periodic answer pattern can be predicted. The read-only `ops/qbank/audit-mcq-key-patterns.cjs` now flags the entire BIO9-C1-MCQ-001–012 sequence without altering stems, option identity, original hashes or human review flags. These 12 require editorial option-order revision (and a NEW revision-hash docket) before independent academic review; the existing 27-question draft and docket are preserved unchanged.
