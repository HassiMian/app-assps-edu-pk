# ASSPS Architecture V1 — Paper Vault restricted-role RLS forward gates

Recorded 2026-10-08 UTC. This is **isolated release-candidate evidence**,
not proof of a completed production deployment or closure of all Architecture V1 gates.

## Source lineage
- Live production when inspected: `e5189103e644b248c4b4f53c404a91ec03a295da`
  (frontend/backend), health HTTP 200.
- Candidate source: `fix/paper-archv1-rls-release-gates-20261008`,
  based directly on live `e5189103`, preserving the teacher-facing unified
  Paper Workspace and all concurrent SaaS/WhatsApp hardening.
- Forward-ported verified browser proof `9421fe46` and Paper Vault
  limited-role implementation `2bd908d` using isolated cherry-picks.
- This branch adds strict default-deny RLS policies for `paper_vault` and
  `paper_vault_revision_history`. Earlier generic RLS policy was **unsafe
  when app.rls_enabled was absent**: a restricted role could see records from
  multiple schools despite ENABLE/FORCE RLS.

## Real test DB
Disposable production clone: `assps_paper_rls_rehearsal_20261008`,
**never** live `apexos`.

The backend migrations, including the strict RLS update, completed.
`ops/check-paper-vault-runtime-ready.cjs` returned
`PAPER_VAULT_RUNTIME_DB_BOUNDARY ready:true` with no findings.

The real restricted role `apex_paper_runtime` is NOLOGIN, NOBYPASSRLS,
and non-superuser. During an explicit transaction using `SET LOCAL ROLE`:
- No school context: zero Vault records visible.
- School 1 context: 5 existing papers visible, zero cross-school.
- School 2 context: one temporary synthetic paper visible, zero cross-school.
- No test paper was left behind by the transaction.

Real alternate-port HTTP test on the disposable clone:
`PAPER_VAULT_RUNTIME_HTTP 15/15 PASS`. This covers unauthenticated
rejection, authenticated school/teacher scope, denied cross-school mutation,
user-supplied school ID being ignored, stale update/delete revision rejection,
current revision acceptance, soft delete, and DB-level denial of foreign
INSERT via RLS WITH CHECK.

Other candidate-specific tests actually run:
- G21 canonical DOCX revision-bound HTTP: 9/9 PASS.
- Question Bank governance HTTP: 9/9 PASS.
- Lesson Plans HTTP: 12/12 PASS.
- Print Jobs HTTP: 8/8 PASS; print domain/privacy unit suite 11/11 PASS.
- Alternate-port staged backend release smoke: PASS.
- Frontend deterministic build: PASS.
- Production-safety static contract: PASS; protected templates: 6/6 unchanged.
- Chromium Saved Papers → unified Paper Workspace: 43/43 official papers and
  legacy flag guard PASS (two acceptance subtests).
- Role-policy static tests, Vault runtime grant/policy tests and release
  manifest tests pass at their respective candidate checkpoints.

## Release blockers intentionally NOT waived
1. **Architecture V1 global DB-role/RLS gate remains RED.** Application
   login `apexos_user` has PostgreSQL `BYPASSRLS`; other paper, bank,
   print and lesson workflows still include general-pool SQL paths.
   The restricted Vault role closes this specific Vault route surface but
   does **not** make the entire SaaS independently tenant-safe at the DB layer.
   A production-wide `ALTER ROLE ... NOBYPASSRLS` is not authorized
   without a separate full-SaaS restricted-role migration and regression proof.
2. Live production has not received the candidate strict Vault and revision
   journal RLS migration. The read-only Vault preflight deliberately exits 2
   against live and passes only on the isolated clone. This is **not** a
   production RLS PASS.
3. Pre-release final anti-reverse guard, fresh frontend/backend/DB snapshots,
   post-deploy rollback rehearsal and integrity smoke would need repeating
   immediately before any rollout. Disk was around 97% occupied at the
   candidate checkpoint, so backup space must be accounted for.
4. Migration 020 expects `apex_paper_runtime` to be provisioned by a trusted
   DBA with membership/least-privilege grants before migration. The role
   exists on this VPS, but portability to a fresh VPS is not automatically
   proven.

Release decision: preserve and push the isolated forward candidate.
**Do not deploy or announce Architecture V1 security completion** while
the full authoring database boundary gate still fails. Never deploy stale
branches, overwrite parallel worktrees, or mutate production for testing.
