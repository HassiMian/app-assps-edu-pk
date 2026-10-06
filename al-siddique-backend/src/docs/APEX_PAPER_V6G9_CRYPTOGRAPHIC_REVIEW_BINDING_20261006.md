# APEX Paper Studio V6-G9 — Cryptographic Review Binding Precheck

V6-G9 closes a review-integrity gap: a structurally valid independent-review record is no longer enough. The reviewer-claimed `reviewedArtifactSha256` must exactly match the sealed review-artifact manifest prepared for that review area.

## Read-only endpoint
`POST /api/portal/paper-studio/publisher-review/promotion-precheck`

Access:
- signed portal session required;
- `super_admin`, `admin`, or `principal` only;
- caller user id cannot be accepted as an independent reviewer id.

## Cryptographic chain
1. Load the publisher evidence path from the governed environment.
2. Verify the entire publisher evidence file against `PAPER_CURRICULUM_PUBLISHER_EVIDENCE_SHA256`.
3. Resolve the publisher-bound `operationalReviewEvidenceDraft` inside the same evidence directory.
4. Verify that draft against its publisher-recorded SHA-256.
5. Load `reviewArtifactManifests` from the verified draft.
6. Run the existing V6-G4 structural independent-review validation.
7. Compare every reviewer-claimed artifact SHA-256 with the exact sealed manifest SHA-256.
8. Fail closed if an expected sealed review artifact is absent, incomplete, altered, or mismatched.

## Current expected blocker
`signedPublisherKeyCustody` does not yet have a sealed independent artifact in the prepared review pack. Therefore the current real production review pack must fail G9 with:
`signedPublisherKeyCustody:SEALED_REVIEW_ARTIFACT_NOT_AVAILABLE`.

That is intentional; V6-G9 must not synthesize publisher-key evidence.

## No mutation
V6-G9 returns validation evidence only:
- no review persistence;
- no publisher approval mutation;
- no canonical-write mutation;
- no evidence rewrite;
- no reviewer identity creation.

## Verification
- G9 cryptographic unit gate: 3/3 PASS.
- G9 signed-session HTTP gate: 2/2 PASS.
- G4/G8/G9 focused regression: 14/14 PASS.
- Deterministic full regression including G9: 65/65 PASS on a fresh synthetic database and isolated port.
