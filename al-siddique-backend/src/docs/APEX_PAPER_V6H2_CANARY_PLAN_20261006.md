# APEX Paper Studio V6-H2 — Deterministic Single-Paper Canary Plan

V6-H2 prepares a reviewable, immutable canary intent after V6-H0 eligibility and V6-H1 source-binding readiness. It never executes the canary.

## Endpoint
`GET /api/portal/paper-studio/canonical-canary/:id/plan`

Admin/Principal only. Teachers receive 403.

## Fail-closed prerequisites
- V6-H0 must return `eligible:true`.
- Source paper id, revision and reviewed snapshot hash must remain identical after preflight.
- Source must still be `approved-curriculum-authoring` / `STRUCTURE_VALID_STAGING` with zero issues.
- Payload discriminators must remain exactly `PaperDocumentNewAuthoring`, `assps-new-authoring-paper`, and a positive schema version.

If any prerequisite changes, H2 refuses to create a plan. In current production, H0 is intentionally blocked by genuine publisher/academic authority gates, so H2 also remains blocked.

## Intent binding
The deterministic SHA-256 intent binds:
- school + actor;
- exact Paper Vault source id/revision/snapshot hash;
- canonical payload SHA-256;
- relational document family/format/schema version;
- initial canonical revision;
- exact H1 source-binding coordinates;
- rollback source-binding coordinates.

## No-write policy
H2 is plan-only. It performs no canonical insert, no revision insert, no Paper Vault mutation, no environment/approval flag change, no dual-write, and no bulk migration. The next action is explicit human review of the single-paper canary plan after all independent authority gates are genuinely complete.
