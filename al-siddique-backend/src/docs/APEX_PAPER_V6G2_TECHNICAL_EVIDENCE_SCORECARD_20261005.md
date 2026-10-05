# APEX Paper V6-G2 — Technical evidence scorecard (2026-10-05)

V6-G2 separates objective machine-verifiable curriculum evidence from independent academic/release approval. It does not loosen any canonical-write gate.

## Biology IX technical state
Pinned reviewed evidence source commit: `d6b294db53a9aa5a8f19c6bae5ecbb673996be5c`.

Machine-verified green:
- exact pinned English/Urdu evidence-ledger bytes;
- source PDF SHA identities match reacquisition evidence and chapter-conflict evidence;
- ledger SHA bindings match reacquisition evidence;
- English chapter map: 11/11, monotonic, in source-page bounds;
- Urdu chapter map: 11/11, monotonic, in source-page bounds;
- English exercise source references present (320);
- Urdu exercise source references present for reviewed Chapter 1;
- bilingual chapter cardinality aligned;
- reacquisition binary-integrity and ledger-binding flags verified.

Still blocked and NOT self-approved:
- independent chapter-index approval;
- independent exercise-index approval;
- bilingual edition equivalence approval;
- independent academic question release (approved count remains 0);
- production curriculum publisher approval;
- canonical registry write flag.

`paperCurriculumTechnicalEvidenceV6G2.js` exposes these as separate gates. `paperCanonicalCutoverReadinessV6F.js` now returns architecture `v6-g2-readiness-1` with `curriculumTechnicalEvidence`, while `ready` remains false. Admin UI displays technical verification separately from approval status.

## Acceptance
- V6-G/V6-G2 publisher + technical unit tests: 8/8 PASS.
- Canonical readiness + technical tests: 4/4 PASS.
- Browser Admin scorecard acceptance: 2/2 PASS.
- Four-role Connect shell: PASS.
- Signed Paper Studio projection: 10/10 PASS.
- Paper Vault ownership: 8/8 PASS.
- Question Bank assignment scope: 6/6 PASS.
- Attendance integrity: 16/16 PASS.

No production questions were seeded, no academic approval flag was changed, and canonical writes remain disabled.
