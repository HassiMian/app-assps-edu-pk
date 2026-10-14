# ASSPS Academic Master — Science-aware near-stem originality review (2026-10-08)

**Scoped isolated continuation:** `feat/grade910-academic-master-evidence-20261008` from clean remote-matched previous `f4de79e34139c74193f416f9ebfa89df7960fed9`. GitHub issue #4 is the active coordinator; no restart/reimport of 91 mathematically checked numericals, 110 byte-rehashed PDFs, 20 Chemistry MCQ editorials or four Urdu Biology translations.

## New independently demonstrated academic QA finding

The previous exact-duplicate check found **0 exact repeated normalized stems**, but a naive word/Jaccard detector stripped scientific symbols. Real Grade IX Chemistry Chapter 8 short questions **`IX-CHEM-2025-C08-T03-S01` (Group 1 forming 1+ ions)** and **`IX-CHEM-2025-C08-T03-S02` (Group 17 forming 1− ions)** looked near-duplicate after removing `+` and `-`. This conflation is scientifically unsafe, particularly with ionic charges, stoichiometry or mathematical signs. Neither original question was changed, and no scientific answer-key approval is claimed.

Added isolated `ops/qbank/audit-scientific-stem-similarity.cjs`: Unicode-aware question tokenization preserves `+`, `−`, `=`, `×`, `÷`, `/`, `^` and numeric/formula tokens rather than discarding meaning. It groups by **grade, subject, medium and type**, requires verified nonblank chapter identifiers to classify chapter relationship, and conservatively surfaces token-set near-stems at **≥0.88 same chapter** or **≥0.90 across distinct chapters**. Similarity indicates *potential formulaic phrasing*, NOT proven duplicate content, plagiarism or incorrect answers.

## Actual full original authoring corpus scan

- **2,581/2,581 original authored question IDs, 73 source authoring files**: no new original IDs added.
- **207 grade/subject/medium/type comparison buckets**.
- **0** same-chapter possible rephrased pairs at threshold.
- **12 cross-chapter potential template-reuse pairs** comprising **15 unique questions** in Grade IX/X Urdu literature and Grade IX textile/clothing.
- Within these 12 pairs, **9 have matching stored answer fingerprints**, **3 differ**. Matching and differing answers are not correctness or semantic-equivalence verdicts.
- Every flagged pair has stable IDs, original content SHA256 for both questions, source filename, grade/subject/medium/type, chapter identities, score, `duplicateConfirmed:false`, `independentReviewerId:null`, `approved:false`. No copyrighted textbook paragraphs, answer text, stems, paper keys or reviewer identities published.
- `ASSPS_GRADE910_SCIENTIFIC_STEM_SIMILARITY_REVIEW_20261008.json` is **metadata-only**.
- The existing `ASSPS_GRADE910_REVIEW_TRIAGE_QUEUE_20261008.json` now SHA-binds exactly those **15** originals with `NEAR_STEM_TEMPLATE_ORIGINALITY_HUMAN_REVIEW_REQUIRED`, `humanDuplicateVerdict:PENDING`; no automatic deletion, no new revisions, no academic approval. Previous four pending Urdu editorial proposals and 20 pending Chemistry MCQ proposals retained unchanged as distinct revision references.

## Evidence/negative controls

- Chemical ionic sign `1+` versus `1-`, mathematics `+` versus `-`, equal and superscript tokens remain distinguishable.
- Full authored question scan yields a deterministic JSON audit with exact 12 pair/15 ID counts; report contains hashes and IDs, not stems/answers.
- Synthetic true same-chapter rephrase surfaces as review *candidate*, never a confirmed duplicate; missing chapter mapping cannot claim a cross-chapter comparison.
- Tampered question hash, forged duplicateConfirmation, nonexistent original ID, and duplicate stable IDs fail closed.
- Original Chemistry charged-ion questions are preserved, no answer/distractor mutation.

### Commands

```sh
node ops/qbank/audit-scientific-stem-similarity.cjs --write
node ops/qbank/build-grade910-review-triage.cjs --write --strict
node --test ops/tests/grade910-scientific-stem-similarity.test.cjs
```

**Unresolved**: Independently assigned subject teachers must evaluate originality, whether similar prompts are deliberately chapter-specific, scientific precision and actual answer correctness, Urdu/English equivalence and school 2026–27 adopted textbook/exam cohort. A similarity score cannot replace curriculum or source-page/physical exercise proof.

**Publication remains HOLD.** All 2,581 original authored questions remain provisional; question-level physical-page verified 0, independent human-reviewed 0, approved 0, published academically verified 0. SaaS Core alone owns signed non-BYPASSRLS, tenancy, effective roles, release, migration and rollback certification. Paper Studio academically verified selector remains empty.
