# APEX Paper Studio V6-G3 — Independent Review Handoff

This handoff does not approve publication or canonical writes. It packages the technical evidence an independent reviewer must inspect before the publisher gate can be advanced.

## Current production state
- V6-H0 read-only canonical canary preflight is live.
- V6-H1 idempotent source binding is live.
- Canonical registry contains 0 paper_documents and 0 paper_revisions.
- PAPER_CURRICULUM_PUBLISHER_PRODUCTION_APPROVED=false.
- PAPER_CANONICAL_REGISTRY_WRITE_ENABLED=false.
- Canonical renderer, runtime-role, payload contract, backup/restore and tenant RLS technical gates are green.

## Evidence locations
- Publisher evidence snapshot: `/root/secure-archive/apex-paper-v6g3-20261006/`
- Operational review pack: `/root/secure-archive/apex-paper-v6g3-review-pack-20261006/`
- G2 Biology source ledgers: `services/papers/curriculumReviewedEvidenceV6G2/`

## Technical evidence ready for independent review
1. isolatedDbCredentialsAndRls
2. institutionalBackupRestore
3. teacherStudentResponsePrivacy
4. multiInstanceIntentSafety
5. bilingualPrintWordPdfParity
6. canaryRollbackApproved

These are marked `TECHNICAL_EVIDENCE_READY_NOT_INDEPENDENTLY_APPROVED`; they are not self-approved.

## Reviews still genuinely external
1. signedPublisherKeyCustody
2. independentSubjectGrantLiveSource
3. academic signoff for Grade 9 Biology English source
4. Urdu edition equivalence / bilingual semantic review
5. resolution of the two Chapter 1 source conflicts
6. at least one independently approved real academic question for live seed
7. genuine signed curriculum publication
8. explicit publisher production approval

## Required reviewer outputs
For every independently approved review, record a stable `evidenceId`, a real `reviewerId`, the exact reviewed artifact SHA-256 coordinates, review date, scope, and result. Do not replace unresolved academic conflicts with model-generated decisions.

## Canonical-write policy
Even after evidence completion, canonical writes remain blocked until the separate registry write flag is explicitly enabled after a single-paper canary execution review. H0/H1 do not authorize writes.

## 2026-10-06 evidence refresh
The production publisher evidence pointer is now bound to the resealed G3 manifest SHA-256:
`da182ee85839cdb2b123b408093e68cea48cccf3fadbb3f15b428de3cb47d2c8`.

Additional review artifacts are sealed in `/root/secure-archive/apex-paper-v6g3-review-pack-20261006/`:
- `question-bank-baseline.txt` — production Question Bank baseline is empty; approved question count is 0.
- `biology9-ch1-academic-review-queue.json` — 50 source-referenced Chapter 1 review items (25 English, 25 Urdu), with no invented question text and `DO_NOT_INSERT` live-bank policy.
- `biology9-ch1-conflict-review-dossier.json` — the two open Chapter 1 academic/source conflicts with required named reviewer outputs.
- `operational-review-evidence-draft.json` — technical evidence matrix; technical PASS is explicitly not independent approval.
- `SHA256SUMS.final` — cryptographic seal for the review pack.

The publisher verifier now reports only genuine approval/release blockers. There are no publisher artifact hash/count/source-coordinate mismatch errors in the G3 snapshot.

## V6-G5 source-page mapping evidence
Chapter 1 individual question-page mapping is now complete without copying textbook question text. The immutable sidecar is `services/papers/curriculumReviewedEvidenceV6G2/biology9Chapter1QuestionPageMapV6G5.json` and the review pack contains the same file plus `biology9-ch1-academic-review-queue-v2.json`. All 50 source refs have exact visually verified physical-page coordinates; the original G2 section ranges remain unchanged.
