# APEX Paper Studio V6-H1 — Canonical Canary Source Binding

V6-H1 adds the idempotent source-binding foundation required before any real single-paper canonical canary import.

## Scope
The migration is additive only. It adds source provenance columns and a unique source binding to the dormant canonical `paper_documents` registry. It does not copy Paper Vault rows, does not enable canonical writes, does not dual-write, and does not mutate Paper Vault.

## Added provenance
A future approved canary document must capture all of:
- `source_repository = 'paper_vault'`
- exact `source_paper_id`
- exact `source_revision`
- exact reviewed `source_snapshot_hash`
- `canary_imported_at`

The fields are all-null or all-complete. Partial bindings are rejected by a database CHECK constraint.

## Idempotency
A partial unique index on `(school_id, source_repository, source_paper_id, source_revision)` prevents a source revision from being imported into the canonical registry more than once for the same school.

## Security model
The existing V6-F1/F2 controls remain authoritative:
- restricted `apex_paper_runtime` role;
- FORCE RLS tenant isolation;
- transaction-local `app.tenant_id`;
- transaction-local `app.paper_canonical_write_enabled`;
- payload discriminator consistency;
- immutable revision journal;
- no canonical hard delete.

V6-H1 does not alter grants, RLS, write flags, publisher approval, or renderer approval.

## Preflight integration
V6-H0 now evaluates the reviewed source first, then the V6-H1 binding schema. Publisher/cutover readiness is not evaluated until the source is structurally valid and the H1 idempotency foundation is present.

## Verification
- H0/H1 unit preflight gate: 6/6 PASS.
- H1 database source-binding gate: 4/4 PASS with transaction rollback.
- Full migration-applied cloned-production backend suite: 41/41 PASS.
- V6-F2 restricted canonical registry rehearsal: 5/5 PASS with transaction rollback.
