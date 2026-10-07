# APEX Paper Studio V6-G8 — Independent Reviewer Procedure

This procedure is for a real independent reviewer. It does not grant approval by itself.

## Evidence package
Primary sealed directory:
`/root/secure-archive/apex-paper-v6g3-review-pack-20261006/`

Start with:
- `SHA256SUMS.final`
- `independent-review-submission-template-v6g8.json`
- the `review-artifact-*.json` manifest for each review area
- `full-regression-fresh-clone-c84fc7d.tap`
- `full-regression-runner-proof3.tap`
- Biology 9 source/page/conflict evidence files referenced by the manifests

## Required independent fields
Every approved operational review must contain:
- a real numeric `reviewerId` that is not the requesting Admin/Principal user id;
- a stable `evidenceId`;
- the exact `reviewedArtifactSha256` from the sealed review-artifact manifest;
- a real review timestamp;
- Grade 9 Biology scope;
- result `APPROVED` or `APPROVED_WITH_RECORDED_LIMITATIONS`;
- substantive rationale;
- limitations when the result includes limitations.

## Mechanical validation
Offline:
`node scripts/validate-independent-review-v6g8.js <review-bundle.json> [forbidden-reviewer-id ...]`

Signed Admin/Principal API:
`POST /api/portal/paper-studio/publisher-review/validate`

The API is validation-only. It returns policy fields proving:
- `persisted: false`
- `approvalChanged: false`
- `canonicalWriteChanged: false`

A successful structural validation is not publication approval.

## Reviews that still require real external judgment
- signed publisher key custody;
- independent subject/live-source grant;
- English official source approval;
- Urdu edition approval and bilingual equivalence;
- the two Chapter 1 academic/source conflicts;
- at least one real question approved from the pinned source;
- tenant-scoped Question Bank review after a real approved question exists;
- genuine signed curriculum publication.

## Separation of gates
Even after all independent review evidence is valid:
1. Publisher evidence verification must become valid.
2. `PAPER_CURRICULUM_PUBLISHER_PRODUCTION_APPROVED` must be explicitly approved through the governed release process.
3. Canonical registry writes remain separately disabled until a reviewed single-paper canary path is approved.

Do not combine publisher approval and canonical-write enablement into one action.
