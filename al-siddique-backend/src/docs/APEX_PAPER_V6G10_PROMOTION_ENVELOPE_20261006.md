# APEX Paper Studio V6-G10 — Deterministic Publisher Promotion Envelope

V6-G10 converts a G9-valid independent-review bundle into a deterministic promotion envelope. It does not create a publisher signature, approve curriculum publication, persist review state, or enable canonical writes.

## Endpoint
`POST /api/portal/paper-studio/publisher-review/promotion-envelope`

Access is restricted to signed `super_admin`, `admin`, or `principal` sessions. Teacher access is denied.

## Preconditions
The request must pass the V6-G9 cryptographic promotion precheck. Therefore:
- publisher evidence bytes must match the governed evidence SHA;
- operational review draft bytes must match the publisher-bound SHA;
- all required independent-review records must pass V6-G4 structure rules;
- every reviewer-claimed artifact SHA must exactly match the sealed review-artifact manifest;
- self-review is prohibited.

If G9 is invalid, no envelope is produced.

## Envelope contents
The deterministic envelope contains:
- publisher evidence SHA-256;
- publisher source commit;
- operational review evidence SHA-256;
- Grade 9 Biology scope;
- all eight independent review records;
- exact claimed/sealed review-artifact hashes;
- explicit non-approval/non-write policy;
- required next action: real external publisher signature and governed approval.

The canonical JSON representation is key-sorted before SHA-256 hashing. Identical valid inputs therefore produce the same envelope hash; any review mutation changes the hash.

## Safety properties
- `envelopeIsApproval: false`
- `signatureCreated: false`
- `publisherApprovalChanged: false`
- `canonicalWriteChanged: false`
- `persistencePerformed: false`
- `selfApprovalAllowed: false`

## Current production behavior
The real production pack is still missing a sealed `signedPublisherKeyCustody` artifact. V6-G10 must therefore return `409 PUBLISHER_PROMOTION_PRECHECK_BLOCKED` and no envelope for the current real bundle.

## Verification
- G10 deterministic unit gate: 3/3 PASS.
- G10 signed-session HTTP gate: teacher blocked; current real pack fails closed before envelope generation.
- Deterministic full regression including G10: 69/69 PASS on a fresh synthetic DB and isolated port.
