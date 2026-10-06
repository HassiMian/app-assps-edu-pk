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
