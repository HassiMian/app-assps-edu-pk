# Bilingual Editorial workstream — 2026-10-02

Latest checkpoint: [Chapter 1 full-book authoring](11_CHAPTER1_FULL_BOOK_AUTHORING_20261002.md) and [independent draft review](12_CHAPTER1_INDEPENDENT_REVIEW_20261002.md). The earlier sections below retain the initial foundation snapshot; current status is in the continuation section.
## COMPLETED
- Added isolated releaseAudit.mjs enforcing ONE dual-identity record with both English/Urdu stem and answer.
- Requires separate official textbook record/checksum for English and Urdu, stable MCQ option IDs, reviewed translations and named language reviewers.
- Enforces different English and Urdu reviewer identities plus an academic reviewer independent of the author.
## VERIFIED
- Existing frontend contains Urdu/Jameel Noori and English/Times New Roman printing paths; new release gate does NOT modify either renderer.
- Synthetic fixtures test source-checksum, wrong exercise, missing Urdu reviewer and revised edition mismatch rejection.
## PENDING
- Actual teacher/editorial review and semantic bilingual alignment of each subject-specific item.
- Acceptance tests for English LTR, Urdu RTL and deliberately aligned Dual A4 layouts after an approved bank import exists.
## BLOCKED
- No real question can be approved while source PDFs, answer checks and language signoffs are absent.
- No font resources copied or distributed; no live print implementation changed.

## Continuation — full-book Chapter 1 authoring, 2026-10-02

- **COMPLETED:** Added48 paired English/Urdu draft stems and answers with one identity and stable option keys; fixed semantic/citation issues.
- **VERIFIED:** Independent textual review and visual Urdu5–22/English6–21 comparison completed for the draft batch.
- **PENDING:** Formal edition equivalence, prescribed glossary signoff, separate release reviewers and three-mode A4 acceptance.
- **BLOCKED:** All release-check flags remain pending; no bilingual question is published.
