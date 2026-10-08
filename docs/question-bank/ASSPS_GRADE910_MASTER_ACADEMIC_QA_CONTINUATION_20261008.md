# Grade IX–X Academic Master — Continued academic QA and revision gate (8 Oct 2026)

**Base:** `efaaf0eb464a7b3dcecbdacd8f017a697d6399f5`, branch `feat/grade910-academic-master-evidence-20261008` — academic-only isolated development, no production import/release.

## New implementation and evidence (not a repeat of baseline)

1. **Biology IX Chapter 1 original revision 2:** Preserved the original 27 questions and their original review docket. Built a separate 27-question *revision* with an exact parent-draft SHA-256 and per-question old/new content hashes. The 12 MCQs were deliberately re-positioned to a nonperiodic key sequence `BDACBADBCADC`. Correct answer option **text**, all four distractor texts, answer explanations, original IDs, short/long content and marks were preserved and individually tested. It remains original English practice **UNREVIEWED**, not 27 new approved questions or a new count. Per-question revision 2 pending review docket has no reviewer signature or approval.
2. **Cross-file unique authored inventory:** Offline independent scan of **73 authoring JSON files / 2,581 questions** returned **2,581 unique stable IDs**, **0 duplicate ID groups** and **0 exact normalized-stem collision groups** within same grade/subject/medium/type. These facts are **not** semantic-dedup proof. No generated import rows or editorial second revisions were double-counted. **557** recorded draft grade/subject/medium/chapter groups are *not* certified official chapter coverage.
3. **Provenance gap triage across the entire authoring corpus:** **1,393** drafts carry a positive source-page claim and **1,188** do not; all 1,393 page claims remain **unverified by this report**. **921** edition fields do not meet an explicit year/edition identifier pattern. **44** rows have no numerical chapter and/or topic identity (can legitimately be cross-cutting language/grammar items; route manually). No unresolved catalog identifiers and no catalog-PDF-hash disagreement was detected in this local authoring set, but hash agreement only asserts metadata equality and does **not** verify physical pages or school adoption. These figures have different scope from the previous starter-only 1,144 missing-page count; never add them.
4. **Whole authoring MCQ structural QA:** All **875** authored MCQs were read and grouped (not generated package). **785 key A, 50 key B, 33 key C, 7 key D** after *structural* resolution of **24 legacy answer-as-text rows** to a single exact option. Source-file-level runs flagged in **53 files** for editorial review (not actual-paper pattern certification). **18** bilingual MCQ rows exist, but translation/answer parity has **no independent signoff**. Six initially flagged Chemistry IX Chapter 5 answer-option text differences were only terminal punctuation and were correctly removed as false positives after inspection; zero structural mismatches remain in this limited check. **Do not interpret zero structural mismatches as answer correctness.**
5. **Missing source recovery attempted:** Rechecked `pectaa-catalog-037` official catalogue reference `Computer Tech 9 UM` at https://pectaa.edu.pk/curriculum-compliance/ . The linked official historical `pctb.punjab.gov.pk` PDF endpoint timed out again on 2026-10-08 (5-second connect timeout). Do not substitute the distinct `Computer and entrepreneur Tech 9 UM` listing as if it were the same edition; `037` remains quarantined, hash/document pages unknown.
6. **Session/ALP:** School-wide 2026–27 timetable remains supporting evidence for school teaching session, not for each adopted textbook edition. PECTAA official listing https://pectaa.edu.pk/books-and-publications/ contains multiple old/new editions. PECTAA revised Smart Syllabus ALP notification specifically identifies Grade IX Computer Science & Entrepreneurship session 2025–26 (https://pectaa.edu.pk/uploads/Revised%20ALP%20Notification%2007.11.2025.pdf); do not silently bind that exclusion map to Grade IX/X 2026–27 teaching or future board years. Prior 110/111 PDF cache hash-attestations and 0 verified exercise indices remain unchanged.

## Measured academic workflow states

- Research authoring: **2,581 unique provisional source records** (original authoring set); revision-2 is a derivative of 27 of those, not extra count.
- Question-level source-verified by independent book-page evidence: **0** established in this cycle.
- Independently reviewed human evidence: **0**.
- Academically approved/published: **0 / 0**.
- Paper Studio approved-snapshot content: **empty/pending**, no new consumption or production seeding.
- No database, live API, service, host firewall, original Grade IX–X branch or SaaS Core-owned file was changed.

## Follow-on QA priorities

1. Human expert review of 53 MCQ file-level positional-key pattern flags, prioritizing ASSPS Science/Math/English/Urdu subjects; do not mechanically rebalance thousands of questions. Any edited option order creates a *new revision* requiring independent answer and language review. Existing local Biology IX 27 original revision 2 is a safe editorial candidate for that workflow.
2. School-specific dated textbook adoption + examination board/year authorization: verify printed grade/medium/edition and syllabus mode before marking a curriculum identity approved.
3. Physical page render/photo comparison and exact exercise/section proof for high-priority chapter batches. Source hashes/page claims are only candidate links.
4. Independent, identity-bound scientific/key review for source-verified questions, then second-stage approval. Paper Studio receives only approved immutable full records under issue #1 and SaaS Core signs off tenant/RLS and release gates.

## Reproducibility

- `node ops/qbank/build-bio9-editorial-revision2.cjs --write` regenerates reviewed-only revision and SHA-locked docket; the original input stays unchanged.
- `node ops/qbank/audit-authoring-crossfile-qa.cjs --strict --write` writes metadata-only authoring coverage/QA (no copyrighted stem reproduction).
- `node ops/qbank/audit-mcq-authoring-structure.cjs --write` writes metadata-only MCQ/option-key triage.
- Scoped Node tests assert stable IDs, preserved answer identity, revision hashes, no approval, and difficult option-layout cases; grade9-10 staging unit suite is separately rerun.
