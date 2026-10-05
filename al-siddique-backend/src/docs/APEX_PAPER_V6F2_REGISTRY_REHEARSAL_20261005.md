# V6-F2 — canonical registry discriminator hardening and rollback-only rehearsal
Date: 2026-10-05

## Purpose
Prove the restricted canonical database path without enabling production canonical writes, migrating a real paper, dual-writing, or fabricating source identity.

## DB hardening
Migration `20261005_paper_canonical_registry_v6f2_payload_contract.sql` adds validated CHECK constraints to both `paper_documents` and `paper_revisions`. The relational discriminator is now tied to the JSON document itself:
- `payload.format == document_format`
- numeric `payload.schemaVersion == schema_version`
- historical family requires `payload.documentModel == PaperDocumentV2`
- approved curriculum authoring requires `payload.documentModel == PaperDocumentNewAuthoring`

This closes a defense-in-depth gap where a future buggy caller could otherwise pair valid relational columns with a mismatched JSON discriminator. It is not a substitute for the exact SaaS JS validators; both layers are required.

Pre-change canonical-table custom dump: `/root/secure-archive/apex-paper-v6f2-20261005-144439/pre-v6f2-canonical-registry.custom`; catalog verified with `pg_restore -l`. App DB role was intentionally unable to dump canonical tables, so the backup/migration used the local PostgreSQL DBA OS role rather than granting canonical SELECT to `apexos_user`.

## Rollback-only rehearsal
`tests/paper-v6f2-registry-rehearsal.js` creates a reviewed synthetic Phase3R new-authoring document using the exact pinned SaaS contract. Inside one transaction it creates synthetic tenant/user fixtures, explicitly `SET ROLE apex_paper_runtime`, sets transaction-local tenant/write gate, writes one document and revision, exercises RLS and immutability, then ROLLBACKs the entire transaction.

Acceptance 5/5:
1. restricted runtime can insert reviewed synthetic document/revision only with tenant + transaction-local write gate;
2. switching tenant context hides the row via FORCE RLS;
3. DB rejects JSON/relational discriminator mismatch (`23514`);
4. revision UPDATE and document hard DELETE are blocked (`42501`);
5. disabling transaction-local write gate blocks document UPDATE (`42501`).

Post-rehearsal DBA counts: `paper_documents=0`, `paper_revisions=0`; synthetic V6F2 school count `0`.

## Readiness integration
`paperCanonicalCutoverReadinessV6F` is upgraded to `v6-f-readiness-3`. `canonicalPayloadContractApproved` requires both V6-F2 constraints to physically exist and be validated; their definitions are exposed only on the Admin/Principal readiness surface. Missing/invalid constraint adds blocker `CANONICAL_PAYLOAD_CONTRACT_NOT_APPROVED`.

This does **not** enable `PAPER_CANONICAL_REGISTRY_WRITE_ENABLED` and does not alter active repositories (`paper_vault` + `paper_vault_revision_history`).
