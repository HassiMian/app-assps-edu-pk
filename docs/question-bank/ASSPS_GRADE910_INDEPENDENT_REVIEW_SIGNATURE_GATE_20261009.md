# ASSPS Grade IX–X Academic Master — Stored independent review signer provenance gate (9 October 2026 UTC)

**Exact continuation:** Existing isolated branch `feat/grade910-academic-master-evidence-20261008` initially verified clean/local remote at `733b46b7dc51355a8a200f525f7ffd39e9f0df4f`, following GitHub issue #4 and Academic/Paper Studio issue #1. This work does **not** repeat completed source/edition/page checks, 91 numerical recalculations, Physics conceptual answer proposals, Chemistry MCQ option revisions, the original source creator independence gate, or prior MCQ answer consistency checks.

## Previously unprotected review-signature provenance

A saved `question_mappings` record with `mapping_type='grade910_independent_academic_review'` was checked for `mapping_status='reviewed'`, `reviewed_by`, immutable current question revision/hash, linked source author independence, and normalized school/page evidence. But the publication gate **did not validate that `question_mappings.created_by === reviewed_by` nor require `reviewed_at` to be recorded**. A row inserted by actor A but claiming independent reviewer B, or lacking review time, could progress through these identity prerequisites.

The official review service already writes `created_by = reviewed_by = reviewer` and `reviewed_at=NOW()`; hence the gate may safely require that same signing provenance without adding any migration or inventing signatures. This is a **defense-in-depth academic audit gate**, not an assertion that a fake review has appeared or passed production.

## New narrowly scoped engineering

- Added `assertGrade910ReviewSignature(mapping, reviewerId)` in `grade910AcademicReviewGate.js`. The reviewer's valid positive integer identity must exactly match the persisted `created_by`; independently recorded `reviewed_at` must be a nonempty valid timestamp. Handles PostgreSQL JavaScript Date objects safely, including invalid Date, without unhandled exceptions.
- Publication eligibility now selects `created_by, reviewed_by, reviewed_at` and validates signature identity and timestamp **before** source/curriculum evidence evaluation. Missing signoff identity rejects with `REVIEW_SIGNOFF_ORIGINATOR_MISMATCH`; absent or invalid time rejects with `REVIEW_SIGNOFF_TIMESTAMP_MISSING`. Even a fabricated `reviewerUserId` inside JSON metadata cannot bypass the columns' equality.
- Idempotent existing-review replay in `grade910AcademicReviewService.js` now selects and checks the same persisted actor/time fields **before returning success**, avoiding silent replay of tampered/incomplete mapping metadata.
- A legitimately signed mapping with matching actor/time still replays idempotently with `questionBankApproved:false`; there is **no creation of any actual academically approved question**.
- Review source/adopted textbook registry, physical textbook pages, answer keys, human identity, school tenant scope, signed Core runtime/roles/transaction, official paper templates and user/student data are untouched.

## Explicit red/green evidence

- Four synthetic signer/status negatives **failed prepatch (6/10 PASS, 4/10 FAIL)**, including foreign signer, null creator, missing review timestamp and invalid timestamp.
- They passed after the signer/time verification was added. Further synthetic tests cover the actual saved-review replay branch (with test-only normalized-source evidence stub), legitimate replay false-approval, and invalid native PostgreSQL `Date`. The real Academic service and publication gate are executed with synthetic SQL adapter fixtures, **not** a live authenticated DB/production tenancy certification.
- `14/14` signer-focused synthetic tests PASS; comprehensive focused Grade IX/X academic tests and full 510 original staging tests rerun separately with logged process-exit status.
- This is structural/provenance validation, **not proof of independent academic subject-answer correctness or approval**.

## Non-negotiable remaining release blockers

2,581 original Grade IX–X authored candidate questions; 0 question-level human source verified, 0 human academically reviewed, 0 approved, 0 academically verified published. ASSPS textbook/edition/board exam-year adoption, printed/PDF physical page/exercise proof, independent reviewer competency and answer/distractor verification, bilingual semantic parity and Core signed non-BYPASSRLS/production certification remain pending. No production deployment or approved Paper Studio provider snapshot; production only after SaaS Core certification.

## Final executed verification, not inherited from earlier checkpoints

- Targeted actual review-gate/signoff SQL-adapter tests **14/14 PASS**, 0 fail/cancel/skip; four new adversarial cases were **RED before patch (6/10 PASS, four FAILED)**, then GREEN.
- Full backend Academic and qbank provenance, textbook evidence, Physics MCQ conceptual, Chemistry editorial, bilingual, source hash/page, duplicate and numerical focused tests **138/138 PASS**, **process exit 0**, 0 fail/skip/cancel. Full TAP stored at `/tmp/assps-grade910-signoff-focused-20261009.tap` and independent completion marker `/tmp/assps-grade910-signoff-focused-20261009.exit`.
- Full original Grade IX–X authoring/staging regression **510/510 PASS**, **process exit 0**, 0 fail/skip/cancel; duration 70.24 seconds. Full TAP `/tmp/assps-grade910-signoff-staging-20261009.tap` and separate `.exit`.
- Gate/service/test JS syntax PASS; staged Git whitespace verification required before commit. No UI/frontend production build, real signed non-BYPASSRLS DB test, physical book proof, teacher approval or production release claimed.
