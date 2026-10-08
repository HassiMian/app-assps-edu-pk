# ASSPS Paper & Assessment Studio Architecture V1 — post-release verification

UTC date: 2026-10-08. This document records **tests actually run**, not
inferences from prior deployment metadata. No production records were created,
changed, or deleted during this independent verification.

## Exact release and isolation

- Live frontend and backend release commit:
  `5d83f33640a75223343025bc49f0bfac79ecf4bf`.
- Ancestry: verified descendant of live predecessor
  `a877fb2e95eb359649af3086c039ae756de5a454`.
- Source was inspected using an independent clean worktree based on the
  **deployed** SHA; acceptance-harness fixes are on a forward-only test branch.
- Live backend port 5000, public API and frontend each returned HTTP 200.
- Backend `ops/release-smoke.sh`: `ASSPS_BACKEND_RELEASE_SMOKE_PASS`.
- Production-safety static checks passed; protected templates 6/6 unchanged.
- The deployed release was installed by another parallel stream. This
  verification did not redeploy or overwrite production.

## Disposable database / genuine security acceptance

- Disposable production-clone DB:
  `assps_archv1_candidate_20261008`; full candidate migrations exit 0.
- G21 revision-bound POST DOCX HTTP test (disposable DB / alternate port):
  9/9, including authentication, tenant boundary, legacy fail-closed,
  revision+SHA, actual DOCX bytes and body hash.
- Lesson Plans HTTP 12/12; Question Bank governance HTTP 9/9;
  Assessment Print Job HTTP 8/8; related domain/static tests 20/20.
- Mock-auth fixture used only with `NODE_ENV=test` and
  `DEMO_LOGIN_ENABLED=true` in the disposable print test process.
  Production mock login remains disabled.

## Browser / document fidelity

- Real Chromium official-paper corpus: 43/43 documents pass render,
  structure, Urdu direction and screen/print text checks.
- Teacher-facing Saved Papers opens all 43 official documents in the
  unified Paper Workspace. The legacy editor remains unavailable.
- Urdu Paper Workspace browser 9/9; durable duplex print browser 1/1.
- Early Years: 8/8 rendering, privacy, geometry and A4 PDF tests pass when
  run in fresh Chromium processes. A monolithic browser process previously
  suffered `ERR_INSUFFICIENT_RESOURCES`; per-case process isolation prevents
  treating resource exhaustion as document failure.
- Manual authoring, ScoringPlan, Question Bank, lesson plans, DOCX and
  math/image browser tests passed individually on deployed source.
- G20 DOCX model and binary test 4/4; corpus 43/43, 1,027 nodes.

## Build / rollback / preserved data

- Clean frontend production build completes; 80 asset filenames align with
  live; rebuilt `index.html` SHA matches live.
- **Exact-byte artifact parity remains imperfect:** two JS chunks have
  different SHA due solely to reordered Vite/Rolldown preload dependency
  maps. After resolving referenced assets, actual JS content compares equal.
  Do not label this an exact-byte reproducibility PASS.
- Pre-release frontend, backend and PostgreSQL snapshots have verified SHA256.
- The PostgreSQL archive was successfully restored into a separate disposable
  DB `assps_archv1_rollback_drill_20261008` (84 tables).
- Full-row digest comparisons between live and pre-release snapshot matched
  for users, students, attendance, fees, payments, paper_vault and releases.
  Question Bank counts changed under concurrent writes; do not infer
  corruption or attempt automatic rollback.

## Critical unresolved security release gate: DB application role

**DB_ROLE_RLS: FAIL.** PostgreSQL production application login
`apexos_user` is `rolbypassrls=true`. Consequently PostgreSQL
`ENABLE/FORCE ROW LEVEL SECURITY` policies do **not** protect database
access carried by this role. The app's route-level tenant checks still
exist and dedicated HTTP tests passed; those are not a replacement for
independent DB defense in depth. Some legacy `paper_vault` tables also
lack database RLS, relying on explicit `school_id` predicates.

Demonstrated safely on **disposable clone**:

- Active application role + forced Question Bank policies:
  1,114 visible, including 1,055 belonging to a different school.
- Existing **non-BYPASSRLS** role `asspsworker`, granted SELECT on the
  clone only: tenant 1 sees 59 with 0 foreign; tenant 5 sees 1,055 with
  0 foreign; no tenant context sees zero.
- Read-only `ops/check-paper-tenant-rls-role.cjs` detects the bypass and
  deliberately exits 2. Its policy unit tests pass 3/3.

**Do not revoke BYPASSRLS in production abruptly.** The current backend
contains legacy queries that require a staged migration to a restricted
DB role and transaction-bound tenant context. Direct role changes could
break unrelated attendance, fees, dashboard, or login functionality.

Safe forward remedy: independently provision/rehearse minimum-permission
Paper Studio DB access on a production clone; refactor paper routes that
use the general `pool.query` to transaction-scoped restricted connections;
apply tenant context before each DB operation; test privileged/reviewer/
teacher/cross-tenant/no-tenant cases; rerun broad SaaS suites; prepare
reversible grants and credentials; promote only after these gates pass.

## Release decision

Production is running and functional; document and browser gates above are
verified. **Architecture V1 DB-RLS security closure is NOT complete.**
Do not claim zero open critical security gaps or mark the full release
security gate green until the actual production application identity is
non-bypassing or an equivalent independently enforced restricted database
access boundary is verified. No rollback of healthy production data was
performed. Future updates must be traced to the latest actual live SHA.
