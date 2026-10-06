# APEX Paper Studio V6-G16 — Academic & Publication Evidence Precheck

V6-G16 builds on the official V6-G15 edition-review preflight. It does not duplicate edition review logic: the G16 bundle must pass V6-G15 first, then G16 validates the remaining academic/publication evidence chain.

## Read-only endpoint
`POST /api/portal/paper-studio/publisher-review/academic-publication-precheck`

Access is limited to signed `super_admin`, `admin`, and `principal` sessions. The caller user id is forbidden as an independent reviewer id.

## G15 dependency
`editionReviewProposal` is validated by `paperPublisherEditionReviewPreflightV6G15`. G16 consumes the returned pinned English/Urdu PDF hashes and preserves G15 invariants: no question release, no live seed mutation, no Question Bank mutation.

## Additional G16 evidence
1. Both pinned Chapter 1 conflict IDs require independent decisions bound to the immutable G2 conflict artifact SHA-256.
2. Approved-question evidence must reference a sourceRef that is already exact-page mapped in the V6-G6 coverage artifact.
3. The approved question's source PDF SHA-256 must match the medium-specific pinned PDF hash returned by G15.
4. The signed publication must bind its `recordsDigest` to deterministic canonical JSON of the supplied `publicationRecords`; record count must match exactly.
5. Synthetic publication fixtures are forbidden.

## Current expected state
Current production evidence remains blocked because real V6-G15 edition review, both academic conflict decisions, genuine signed publication, and independently approved real question evidence do not yet exist. G16 does not synthesize any of them.

## No mutation
G16 is validation-only:
- `persisted: false`
- `manifestMutated: false`
- `questionBankChanged: false`
- `academicApprovalChanged: false`
- `publisherApprovalChanged: false`
- `canonicalWriteChanged: false`

## Verification
- G16 unit gate: 4/4 PASS.
- G16 signed-session HTTP gate: 2/2 PASS.
- Deterministic full regression through official G15 + G16: 100/100 PASS on a fresh synthetic database and isolated port.
