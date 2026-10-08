# Architecture V1 — restricted Paper Vault revision journal, forward-only candidate

Recorded 2026-10-08 UTC. Development branch:
`fix/paper-archv1-vault-revision-rls-20261008`, based on
`ceb92bb70dc75226209c99883455edc35c178a35` and traceable back
to the then-live production source `e5189103e644b248c4b4f53c404a91ec03a295da`.

## Changes

- Reused one `paperVaultRuntimeRole` helper for legacy Vault routes
  and revision-history service. Runtime transactions switch to the
  NOLOGIN/NOBYPASSRLS `apex_paper_runtime` role and set a mandatory
  school context, fail-closed.
- V6-D guarded edits, renames, deletes, historical listing and historical
  reads now invoke the same scoped DB boundary.
- Removed request-time creation/alteration of the history table.
  `ensureJournal()` is now a read-only readiness guard.
- The release-time migration creates and grants immutable journal access
  (SELECT and INSERT only); teacher assignment lookup receives SELECT
  and is itself included in strict tenant RLS.
- Cross-school history-to-paper references are rejected with a validated
  composite foreign key `(school_id,paper_id)` pointing to
  `paper_vault(school_id,id)`, in addition to existing key constraints.
  Migration intentionally fails on pre-existing mismatches instead of
  modifying audit history.

## Actual isolated evidence

All mutations and synthetic identities here ran only against disposable
database `assps_paper_rls_rehearsal_20261008`, not production.

- Candidate migration 020, strict policy migration 005 and full clone
  migration pipeline completed successfully at their executed checkpoints.
- `PAPER_VAULT_RUNTIME_DB_BOUNDARY` gate returned `ready:true` with
  no findings after stricter journal and assignment grant checks.
- G21 canonical revision-bound HTTP: 9/9 PASS, including true DOCX bytes
  and SHA binding.
- V6-D restricted historical rename/read authorization: 5/5 PASS on
  alternate-port test server, including cross-tenant 404.
- Legacy Vault runtime HTTP: 15/15 PASS at the preceding strict-vault
  candidate checkpoint; rerun after any further source or migration change.
- Composite FK `paper_vault_history_school_paper_fk` is valid;
  a synthetic mismatched-school history INSERT was rejected with PostgreSQL
  foreign key violation, entirely rolled back.
- Rehearsal staged backend health and canonical release smoke PASS;
  protected-template and production-safety static checks passed.
- Role and RLS contract unit/static tests passed.

## Unclosed release gates

This is not yet a production change. The general SaaS database account
`apexos_user` still has `BYPASSRLS`; other Question Bank, assessment
and lesson-plan DB access paths remain to be independently isolated.
The full Architecture V1 DB-role gate stays RED. Do not revoke the
global role attribute without a complete staged SaaS migration.

Before any production deployment: confirm the newest exact frontend and
backend production SHAs, forward ancestry, fresh no-drift builds, actual
production-clone migrations, remaining HTTP/browser/print/regression proof,
frontend/backend/DB rollback snapshot and restore, and sufficient VPS disk
headroom. The previously observed VPS disk was about 98% full.

Never silently overwrite concurrent worktrees or deploy this branch as
if these unresolved global gates had passed.
