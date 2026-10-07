# APEX Paper Studio V6-H3 — Single-Paper Canary Rollback Plan

V6-H3 creates a deterministic inverse plan for an H2 single-paper canary. It does not execute DELETE, UPDATE, rollback, or any canonical write.

## Endpoint
`GET /api/portal/paper-studio/canonical-canary/:id/rollback-plan`

Admin/Principal only. It inherits all H2/H0 gates; if the canary is not eligible, rollback planning is also blocked.

## Exact binding
The rollback intent binds the H2 intent SHA-256, source repository/id/revision/snapshot hash, canonical payload hash, document family/format/schema version, and school/actor identity.

## Safety conditions
Execution, if ever separately reviewed and implemented, must affect at most one canary document, require exact source and payload hashes, require `canary_imported_at`, require no external publication/delivery dependency, require only the initial canonical revision, preserve Paper Vault source/history, and run transactionally.

## Required postconditions
No canonical document or revision remains for the canary source binding, while the original Paper Vault source and revision history remain byte/logically unchanged.

H3 is evidence/planning only and grants no rollback approval. Independent canary rollback approval remains a separate human authority gate.
