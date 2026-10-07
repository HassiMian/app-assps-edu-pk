# V6-F1 Canonical Registry Foundation — 2026-10-05

## Purpose
Create the dormant canonical SaaS paper registry without enabling canonical writes, copying any legacy paper, dual-writing, or fabricating academic source identity.

## Security finding corrected
The normal application role `apexos_user` is not a PostgreSQL superuser but has `BYPASSRLS=true`. Therefore FORCE RLS alone would not make canonical tables tenant-safe if the application role retained direct privileges.

V6-F1 creates:
- `apex_paper_owner`: NOLOGIN, NOBYPASSRLS owner of canonical tables.
- `apex_paper_runtime`: NOLOGIN, NOBYPASSRLS runtime role.
- `apexos_user -> apex_paper_runtime` membership with PostgreSQL 16 `INHERIT FALSE, SET TRUE`.
- no direct canonical table privileges for `apexos_user`.
- explicit SET ROLE requirement for future canonical operations.

## Canonical tables
`paper_documents` and immutable `paper_revisions` are empty on creation. Both use FORCE RLS and policy `canonical_tenant_isolation` bound only to `apex_paper_runtime`. Document family/discriminator checks permit only the reviewed SaaS families:
- historical V13: `assps-canonical-paper`, schema 3
- approved curriculum authoring: `assps-new-authoring-paper`, schema 1

No legacy Connect payload is inserted by this migration.

## Database write defense
Even restricted runtime INSERT/UPDATE is rejected unless transaction-local `app.paper_canonical_write_enabled=true` and `app.tenant_id` exactly matches `school_id`. Current production application never sets this write gate. Revision UPDATE/DELETE and document hard DELETE are denied by privileges plus database triggers.

## Production evidence
- Pre-change custom DB dump and roles snapshot: `/root/secure-archive/apex-paper-v6f1-20261005-093616/`.
- Registry after migration: `paper_documents=0`, `paper_revisions=0`.
- Direct `apexos_user SELECT paper_documents`: permission denied.
- Restricted runtime with no tenant: 0 rows.
- Restricted runtime write with tenant but gate OFF: rejected by database write guard.
- Disposable two-tenant migration/adversarial drill: **8/8 PASS**.
- Post-change custom dump restored into a disposable database: counts 0/0, FORCE RLS retained, owners retained, four defense triggers retained — **PASS**.
- Backup/restore readiness is therefore technically approved; canonical publisher, renderer parity and write gates remain blocked.

## Regression evidence
After production schema creation: V6 projection **10/10**, Paper Vault **8/8**, Question Bank **6/6**, Attendance **16/16**, registry drill **8/8**, public/backend health HTTP 200.

## Readiness semantics
Readiness v2 uses `pg_class` rather than `information_schema.tables` so physically present canonical tables remain detectable even though `apexos_user` deliberately has no direct table privileges. Canonical counts shown to the admin readiness surface use PostgreSQL stats when direct SELECT is intentionally unavailable and are labeled with accuracy metadata.

Current expected blockers after V6-F1:
- `CURRICULUM_PUBLISHER_NOT_PRODUCTION_APPROVED`
- `CANONICAL_RENDERER_PARITY_NOT_APPROVED`
- `CANONICAL_REGISTRY_WRITE_DISABLED`

The active repositories remain `paper_vault` + `paper_vault_revision_history` until all gates pass. No dual write is allowed.
