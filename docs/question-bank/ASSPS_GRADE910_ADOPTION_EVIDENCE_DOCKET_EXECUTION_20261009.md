# ASSPS Grade IX–X Academic Master — School adoption evidence docket execution (2026-10-09)

## Verified continuation and branch
Resumed the single authoritative Academic worktree on branch `feat/grade910-academic-master-evidence-20261008` at existing pushed, clean remote-matching SHA `42a2b372d2e30f3f75ad3c2cd8a13f2f78ad0112`, after refreshing GitHub coordination issue #4 (SaaS Core Phase27, Paper Studio Phase23 and separate APEX Connect). This checkpoint **does not repeat** previous independent reviewer/revision hash, MCQ answer key, original source attributes, printed-page rejection or board/topic parity gates.

## New independently reproducible practical unblocker
Existing academic provenance gates correctly hold all questions while school-adopted textbook/edition/board-examination-year certification and independent actual textbook page/exercise image evidence remain missing. Previous general triage highlighted many metadata blockers, but did not provide a single **adoption-specific, source-record-by-source-record read-only docket** reconciling actual Starter2026 candidate questions with the server-side canonical PDF source record/hash and school-adoption/physical-page certification state.

Added `ops/qbank/build-grade910-adoption-evidence-docket.cjs` (pure, read-only source reconciliation; writes only two versioned evidence reports) and `ops/tests/grade910-school-adoption-evidence-docket.test.cjs` (8 tests). Data sources: exact 55 Starter2026 JSON files from isolated Academic worktree, existing `verifiedGrade910SourceRegistry.json` (110 catalog/recovered sources), existing intentionally empty `asspsGrade910SchoolAdoptions.json` and `asspsGrade910PhysicalPageEvidence.json`. It resolves **per-question source IDs** to handle Physics Tech IX dual-medium file (32 English, 32 Urdu), rather than incorrectly assuming every file has one top-level source. Verifies source registry IDs and draft-declared SHA identity, duplicate stable IDs, and all research files continue to disallow live import/publication. It produces no fake human certificates, question answers, textbook excerpts, signed reviews, migrations or live API requests.

## Real measured evidence on exact source
- **55 starter files**, **2,096 distinct provisional draft question IDs**, tied to **55 distinct PDF source records** from the server registry; no missing source ID or mismatching declared PDF SHA on these particular drafts (not a rehash of PDF bytes).
- **877 draft questions** refer to edition registry labels incompatible with current Grade IX/X gate's explicit `YYYY` or `YYYY-YY/YYYY` edition format. A syntactically eligible edition also **does not** establish that ASSPS adopted it.
- **433 draft questions** have an edition string different from their source registry's edition string. These may be legacy or provisional aliases; they require human and source review, **not** automatic rewriting.
- **70 drafts** use a source whose registry grade is unresolved (shared Urdu grammar source catalog grade 0), not proof of wrong actual syllabus.
- **310 drafts** use an unspecified/mismatched source medium catalog label, requiring human course-medium mapping, not automatic classification.
- Blocker counts **overlap** and are explicitly not summable. The 55 Starter2026 files are only a **subset** of the previously established **2,581 total authored candidates**; this work does not inflate completed coverage by 2,096 new questions.
- The trusted school textbook adoption ledger remains **uncertified/empty**; physical printed-page and exercise ledgers remain **uncertified/empty**. **Human source-verified 0; independently academically reviewed 0; approved 0; verified published 0.** No faculty review or physical book page inspection has been claimed.

## Integrity, regression and reproducibility
- New targeted suite: **8/8 PASS** (0 fail, skip, cancel). It validates all 2,096 distinct ID/source/hash pairs, exact number of edition/grade/medium gaps, Physics Tech IX dual-source attribution, intentional unsafe-publication/auto-import refusal, unknown/mutated PDF hash rejection, duplicate stable ID rejection, deterministic cohort order, and automatic approval remaining zero.
- Full existing focused Grade IX/X academic provenance/MCQ/numerical/Urdu/authoring regression: **178/178 PASS**, process **exit 0**, 0 fail/skip/cancel, duration 71.40 sec, `/tmp/assps-grade910-adoption-docket-focused-20261009.tap` + `.exit`.
- Original complete Grade IX/X staging authoring/contract regression: **510/510 PASS**, independent process **exit 0**, 0 fail/skip/cancel, duration 88.67 sec, `/tmp/assps-grade910-adoption-docket-staging-20261009.tap` + `.exit`.
- Run: `node ops/qbank/build-grade910-adoption-evidence-docket.cjs`, `node --test ops/tests/grade910-school-adoption-evidence-docket.test.cjs`.
- Result artifacts: `docs/question-bank/ASSPS_GRADE910_SCHOOL_ADOPTION_EVIDENCE_DOCKET_20261009.json` (source cohorts, source PDF identity, count, file fingerprints, exact issue flags) and sibling `.md` (school-facing intake priorities). Neither copies copyrighted textbook questions or confidential student data.

## Exact follow-up and release dependencies
1. School academic authority provides **signed actual adopted textbook title, edition, subject, medium and board examination year** per required cohort, separately from published PECTAA catalog availability.
2. Independently inspect **actual physical printed page / PDF physical page / exercise reference**, with authentic photo hash, human reviewer identity and distinct school certification; record only after genuine source review.
3. Qualified subject teachers independently verify answer correctness, MCQ distractors, question difficulty, originality and Urdu-English equivalent meaning; bind approval to exact immutable question revision.
4. Stage only actual independent approved snapshots and hand over to Paper Studio via issue #1. **SaaS Core exclusively owns tenant/RLS production certification and deployments.**

**No production deployment, no database write, no staging seeding, no official paper modifications, no privilege or signoff changes.** This is a measurable research/evidence-readiness advance, not curriculum certification.
