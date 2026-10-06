# APEX Paper Studio V6-G13 — Publisher Approval Activation Preflight

V6-G13 validates whether a governed publisher production approval could be activated without changing any environment flag.

## Read-only endpoint
`POST /api/portal/paper-studio/publisher-review/approval-activation-precheck`

Access:
- signed portal session required;
- `super_admin`, `admin`, or `principal` only;
- the caller cannot be reused as an independent reviewer or governed approver.

## Required chain
1. V6-G12 governed approval decision must validate against the detached signature and deterministic promotion envelope.
2. Current publisher evidence must independently verify as complete.
3. `PAPER_CURRICULUM_PUBLISHER_PRODUCTION_APPROVED` must still be false before activation.
4. `PAPER_CANONICAL_REGISTRY_WRITE_ENABLED` must remain false.
5. Canonical readiness must contain exactly the two expected pre-approval blockers:
   - `CURRICULUM_PUBLISHER_NOT_PRODUCTION_APPROVED`
   - `CANONICAL_REGISTRY_WRITE_DISABLED`

Any extra blocker fails closed.

## Output
A valid result only proposes this single governed change:
`PAPER_CURRICULUM_PUBLISHER_PRODUCTION_APPROVED: false -> true`

It explicitly preserves:
`PAPER_CANONICAL_REGISTRY_WRITE_ENABLED=false`.

## No mutation
V6-G13:
- does not write `.env`;
- does not persist the approval record;
- does not flip publisher approval;
- does not enable canonical writes;
- does not create signatures or private keys.

## Verification
- G13 unit gate: 5/5 PASS.
- G13 signed-session HTTP gate: 2/2 PASS.
- Deterministic full regression including G13: 85/85 PASS on a fresh synthetic database and isolated port.
