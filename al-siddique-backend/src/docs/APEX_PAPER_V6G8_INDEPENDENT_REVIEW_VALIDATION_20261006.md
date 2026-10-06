# APEX Paper Studio V6-G8 — Independent Review Validation Endpoint

V6-G8 exposes the existing fail-closed G4 review validator through a signed-session admin endpoint without persisting or approving any review.

## Endpoint
`POST /api/portal/paper-studio/publisher-review/validate`

## Access
Only `super_admin`, `admin`, and `principal` sessions may use the endpoint. Teachers receive 403. Unauthenticated requests receive 401.

## Behavior
The request body is evaluated through `validateReviewBundle` for the Grade 9 Biology publisher scope. The response reports structural validity and per-review issues only.

The endpoint explicitly returns policy evidence that it:
- does not persist the submitted bundle;
- does not change publisher approval;
- does not change canonical-write state;
- does not create Question Bank rows.

The authenticated caller's own user id is forbidden as an independent reviewer id, preventing a caller from self-approving the operational review bundle.

## Verification
- teacher access blocked;
- draft bundle validates as incomplete with zero persistence;
- self-reviewer bundle rejected;
- structurally complete external reviewer bundle validates read-only.

HTTP gate: 4/4 PASS on a cloned production database.
G4-G7 supporting regression: 22/22 PASS.
Deployment release-smoke now requires the G8 route to return 401 unauthenticated.
