# ASSPS Paper Studio — App Runtime + Vault Role Chain Verification

Recorded 2026-10-08 UTC. Development-only, forward-merge candidate. **Not deployed by this work.**

## Production lineage

The canonical SaaS advanced independently from `e5189103` to production
`8055d39e797fcf878566ce978831a3b59fcd46ec`, which introduced
`DB_RUNTIME_ROLE=apex_app_runtime` for authenticated requests.
This branch retains the previously verified Paper Vault restricted-role and
immutable revision journal work, then merges the new production descendant.
Production SHA must be rechecked again before any future rollout.

## Nested role compatibility

`apexos_user` is the privileged DB login for bootstrap/migrations, while
authenticated requests now enter restricted `apex_app_runtime`.
Paper Vault requires a further nested `SET LOCAL ROLE apex_paper_runtime`.
In the initial production role graph,
`pg_has_role('apex_app_runtime','apex_paper_runtime','SET')` was false.
Thus the Vault branch could **not** safely deploy as-is.

An explicit DBA-only migration
`al-siddique-backend/src/migrations/20261008_paper_runtime_role_chain.sql`
checks that both runtime roles are non-login, non-superuser and
NOBYPASSRLS, then grants `apex_paper_runtime` to
`apex_app_runtime` with `INHERIT FALSE, SET TRUE`.
The restricted Vault preflight now fails if the nested role transition
is unavailable while the app runtime is active.

## Genuine isolated stage

Created a separate PostgreSQL 16 instance on private tmpfs, Unix socket
only, port 5544 (no TCP listener), with a production data clone, then
executed the production app-runtime RLS migration, the Paper Vault nested
role-chain prerequisite, and strict Vault migrations. No production
role grants, RLS policies or records were changed.

Actually verified:
- `PAPER_VAULT_RUNTIME_DB_BOUNDARY ready:true` under
  `DB_RUNTIME_ROLE=apex_app_runtime`.
- `ops/check-app-runtime-rls.cjs`: `safe:true`, 75 tenant tables,
  zero findings, using the isolated PostgreSQL instance.
- Nested-role integration: authenticated `pool.connect` enters
  `apex_app_runtime`, then the same transaction enters
  `apex_paper_runtime`; no-context query sees zero Vault rows, both
  tenant contexts see zero cross-tenant rows, and reconnect/reset passes.
- Genuine HTTP Vault test on isolated database and alternate port:
  15/15 PASS.
- Genuine revision-bound G21 DOCX HTTP: 9/9 PASS,
  plus restricted immutable V6-D historical authorization 5/5 PASS.
- Lesson Plans HTTP 12/12 and Question Bank governance HTTP 9/9 PASS.
- Print Jobs HTTP 8/8 and print projection boundary tests PASS.
- Alternate-port backend release smoke PASS.
- Forward frontend build PASS; static safety/template gates PASS;
  app/Vault role-policy/release tests 18/18 PASS.
- Canonical browser acceptance and 43-paper teacher-facing routing:
  rerun against this merged branch is required/recorded separately.

## Unresolved release blockers

**Do not deploy this branch based solely on passing targeted gates.**
VPS disk was 98–99% occupied during verification; backups, build staging
and rollback headroom are insufficient. Authenticated application-runtime
RLS covers known paths but a complete source-level audit of legacy
bootstrap/unscoped calls and full-SaaS workflow acceptance remains
necessary. The production login `apexos_user` retains BYPASSRLS for
bootstrap/migrations, and the nested role grant has **not** been applied
in production. Production role/backup changes require a fresh complete
forward-only release process, not an in-place patch.
