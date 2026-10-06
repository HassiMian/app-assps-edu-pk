# APEX Paper Studio V6-H0 — Canonical Canary Preflight

V6-H0 is a read-only governance boundary before any canonical registry write canary.

## Endpoint
`GET /api/portal/paper-studio/canonical-canary/:id/preflight`

Access is limited to `super_admin`, `admin`, and `principal` through the signed portal session. Teachers cannot run this governance probe.

## Source gate first
The governed Paper Vault source is reviewed through the pinned V6-C document boundary. Only `approved-curriculum-authoring` with `STRUCTURE_VALID_STAGING` and zero source issues proceeds to deeper canonical readiness evaluation. Legacy, unknown, malformed, or unsupported sources fail locally and do not trigger canonical storage readiness inspection.

## Independent production gates
A structurally valid source is still not eligible unless the existing V6-G/V6-F readiness contract is fully green, including independently verified curriculum publisher evidence, explicit curriculum publisher production approval, renderer evidence, restricted runtime role, tenant RLS, canonical payload contract, backup/restore approval, and the independently enabled `PAPER_CANONICAL_REGISTRY_WRITE_ENABLED` gate.

V6-H0 never sets or changes any of those flags.

## No-write guarantees
V6-H0:
- writes no `paper_documents` rows;
- writes no `paper_revisions` rows;
- performs no dual-write;
- performs no bulk migration;
- mutates no Paper Vault source;
- fabricates no approval/source identity;
- returns `writeAttempted:false` and `writeEnabledByThisProbe:false`.

Even a simulated fully-approved state only returns `eligible:true` with `EXPLICIT_SINGLE_PAPER_CANARY_EXECUTION_REVIEW_REQUIRED`; it does not execute the canary.

## Verification
- V6-H0 unit gate: 5/5 PASS.
- Integrated V6 projection gate: 13/13 PASS, including zero canonical-row delta.
- Full reconciled backend regression: 39/39 PASS on a fresh cloned production database.
