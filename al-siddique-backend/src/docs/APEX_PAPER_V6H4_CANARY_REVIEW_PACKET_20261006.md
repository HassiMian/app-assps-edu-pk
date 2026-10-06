# APEX Paper Studio V6-H4 — Single-Paper Canary Review Packet

V6-H4 creates one deterministic, review-only packet that binds the exact H2 single-paper canary intent to the exact H3 rollback intent. It exists to prevent a human reviewer from accidentally reviewing a stale canary plan with a different rollback plan.

## Endpoint
`GET /api/portal/paper-studio/canonical-canary/:id/review-packet`

Admin/Principal only. H4 inherits all H0/H2/H3 gates. If the canary is not genuinely eligible, H4 remains blocked.

## Exact binding
The packet binds:
- H2 canary intent SHA-256;
- H3 rollback intent SHA-256;
- Paper Vault source repository/id/revision/snapshot hash;
- canonical payload hash and document discriminator;
- H3 rollback safeguards and before/after verification requirements.

H4 rejects any mismatch between the H2 source/payload binding and the H3 rollback match binding.

## Human boundary
The packet is machine evidence only. It does not authenticate a reviewer identity and does not claim that a person approved the canary. The reviewer must independently verify identity/authority outside H4 and explicitly review both bound hashes. Canary execution approval and rollback authority remain separate human decisions.

## Security invariants
- write attempted: false;
- delete attempted: false;
- persisted: false;
- environment changed: false;
- approval changed: false;
- canonical write changed: false;
- human identity authenticated: false;
- human approval claimed: false;
- self approval allowed: false.

No H4 result can itself enable canonical writes or execute a canary.
