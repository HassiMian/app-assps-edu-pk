# Bilingual Editorial workstream — 2026-10-02
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
