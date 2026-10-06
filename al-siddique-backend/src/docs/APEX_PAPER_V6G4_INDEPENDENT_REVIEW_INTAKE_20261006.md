# APEX Paper Studio V6-G4 — Independent Review Intake

V6-G4 hardens how future independent review approvals are accepted. It does not approve any current review and does not enable publisher or canonical-write gates.

## Required operational-review fields
Any review claiming `INDEPENDENTLY_APPROVED` must include:
- stable non-placeholder `evidenceId`;
- positive numeric `reviewerId` compatible with the reviewed Phase3AB contract;
- exact 64-character `reviewedArtifactSha256`;
- non-future `reviewDate`;
- exact grade/subject scope;
- result `APPROVED` or `APPROVED_WITH_RECORDED_LIMITATIONS`;
- substantive rationale;
- substantive limitations when approval is conditional.

The validator can additionally reject reviewer IDs that are known to be non-independent/self-review identities.

## Fail-closed behavior
Placeholder IDs, invalid hashes, future dates, scope mismatches, invalid results, missing rationale, and self-review identities are rejected. Current G3 technical evidence remains `TECHNICAL_EVIDENCE_READY_NOT_INDEPENDENTLY_APPROVED` and cannot pass this intake as an approval.

## Verification
- G4 intake tests: 6/6 PASS.
- Combined publisher + G4 tests: 12/12 PASS.
- Current G3 production evidence remains blocked with the same genuine 27 approval/release issues and no new hash/count/source mismatch.
