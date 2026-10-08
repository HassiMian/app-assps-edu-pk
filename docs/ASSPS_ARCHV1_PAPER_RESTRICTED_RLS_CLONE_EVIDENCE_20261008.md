# ASSPS Architecture V1 — Paper restricted-role RLS clone implementation and evidence

UTC date: 2026-10-08. **Scope: disposable database clones only. No production migration or login role change.**

## Baseline / forward-only source

- Isolated Git worktree based on backend production release metadata SHA `05443786b580d8d200dcb16b5d9c034fcf5475ab` observed at the start of this run.
- Frontend release metadata independently observed as `aad1dd6fcfe01e256db343830181e842cdef7184` (distinct from backend, as expected).
- Application database name `apexos`, 28 MB at baseline. Production application login `apexos_user` is **BYPASSRLS** and remains unchanged.
- Existing restricted role `apex_paper_runtime` is `NOLOGIN`, `NOBYPASSRLS`; no role creation, password changes or membership alterations were made.

## Isolated database builds

- `assps_archv1_rls_pilot_20261008` — first restored pilot clone, 85 public tables, initial Question Bank 2,704 records, Paper Vault 5 records, size 23 MB when created.
- `assps_archv1_rls_repro_20261008` — independently created from a **fresh** production `pg_dump -Fc apexos` and `pg_restore --exit-on-error`, then populated with RLS pilot SQL from the versioned worktree and verified from scratch.
- Existing `assps_g21_gate_20261008` is **not** a pilot target. Guard rejection was confirmed here: `Refusing to modify non-pilot database assps_g21_gate_20261008`. A policy count afterward was `0` for pilot policies.

## Implemented (clone-only)

Files:

- `al-siddique-backend/ops/rls/archv1-paper-runtime-clone.sql`
- `al-siddique-backend/ops/rls/verify-archv1-paper-runtime-clone.sql`

Implementation: transaction-wrapped DB-name guard (`^assps_archv1_rls_`), non-BYPASS/NOLOGIN role check, role-specific `GRANT USAGE`, 14 Paper/Assessment/Curriculum tables with verified `school_id`, `ENABLE/FORCE RLS`, **28** role-specific policies (one PERMISSIVE allow plus one RESTRICTIVE guard per table), and least-scope test grants (SELECT on those 14 tables, UPDATE(question_text) on Question Bank). Enforces `app.rls_enabled=true` AND `school_id=app.tenant_id`, overriding permissive legacy PUBLIC policies and ignoring any `app.is_super_admin=true` setting. This is not a complete authorization policy for every role or CRUD path.

## Tests actually run (PostgreSQL SQL assertions)

| Gate | Result |
| --- | --- |
| Fresh clone dump/restore | PASS |
| Non-pilot database writes refused | PASS |
| Full policy coverage | PASS: 28 policies / 14 tables with FORCE RLS |
| `row_security_active` as restricted role | PASS |
| No tenant context: zero rows across all 14 tables | PASS |
| Tenant 1: own rows visible, foreign rows zero across all 14 | PASS |
| Tenant 5: own rows visible, foreign rows zero across all 14 | PASS |
| Question Bank seeded tenant sample | Tenant 1 = 59, tenant 5 = 2,645 in first clone |
| `app.is_super_admin=true` attempted policy override | PASS: no foreign records |
| `app.rls_enabled=false` | PASS: zero rows |
| Cross-school Question Bank UPDATE | PASS: zero rows changed |
| Same-school Question Bank UPDATE | PASS: one affected row in rolled-back transaction |
| Transaction isolation / context reset | PASS: no residual tenant visibility |
| Repro test on freshly restored second clone | PASS (`REPRO_CLONE_RLS_FULL_PASS`, exit 0) |

All verification UPDATEs were rolled back. No synthetic school/user/student data was inserted into production. The pilot migration was rerun successfully on the first clone, demonstrating idempotent policy replacement.

## Remaining release blockers (not claimed passed)

1. **Production identity still bypasses RLS:** `apexos_user` has `rolbypassrls=true`. No production migration of the actual backend DB access path was performed. A privileged login can escape restricted-policy behavior outside an explicitly SET ROLE transaction.
2. **Custom tenant GUC is not an authentication primitive:** any connection capable of arbitrary SQL under the restricted role could alter `app.tenant_id` itself. Tenant identity must come exclusively from verified server authentication, with tightly controlled transaction-scoped access; evaluate stronger DB-enforced contextual identity against SQL injection before calling this an independent tenant security boundary.
3. Pilot grants are intentionally narrow; full Paper Workspace, Question Bank, print/release and reviewer/teacher write-role matrices need per-endpoint transactional integration, exact-column privileges, migrations and staged HTTP tests.
4. Non-Paper Studio paths, general SaaS (attendance, fee, login), real Chromium print proof and candidate staging/release gates have **not** been certified in this pilot. Do not merge this clone-only migration into production runtime or alter `apexos_user` flags without full rehearsal and verified rollback.
5. Requested historical file `/opt/assps-editor-worker/early-years/docs/ASSPS_PAPER_ASSESSMENT_ARCHITECTURE_RED_TEAM_20261004.md` was missing at the specified VPS path. The existing `ARCHITECTURE_V1_RELEASE_DEFINITION_MATRIX_20261007.md` and `PAPER_ARCHV1_POSTDEPLOY_VERIFICATION_20261008.md` were inspected for scope and known production gap.

**Release decision:** clone-level RLS implementation and isolation proof PASS. **Full Architecture V1 DB-RLS production security gate remains HOLD** pending restricted connection-path integration and end-to-end SaaS verification.
