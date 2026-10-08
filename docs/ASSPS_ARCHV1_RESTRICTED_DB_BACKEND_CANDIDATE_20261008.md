# ASSPS Architecture V1 — Restricted Paper database backend integration candidate

UTC: 2026-10-08. Evidence is from commands actually executed on the VPS. **This document is NOT a production deployment approval.** The work is on a traceable isolated forward branch descended from backend production commit `05443786b580d8d200dcb16b5d9c034fcf5475ab`.

## Changed code, feature-gated

- `src/config/database.js`: adds an **opt-in** separate restricted PostgreSQL connection pool for authenticated Paper/Assessment contexts (`PAPER_RESTRICTED_DB_ENABLED=true`), rejecting missing/privileged credentials. The normal SaaS connection remains unchanged when off. The restricted login must be non-superuser and non-BYPASSRLS, assumes NOINHERIT privilege, SET ROLE `apex_paper_runtime`, performs one transaction per connection lease, transaction-local signed school and actor context, and rolls back/recycles connections after exceptions. A fake peer-auth test setting is allowed only under NODE_ENV=test against `assps_archv1_rls_` clones. HMAC signing key is required; there is **no** privileged fallback if restricted routing fails.
- `src/middleware/paperRestrictedDatabase.js`: activated only after authenticated authorization on canonical Paper Studio, Assessment Studio, Question Bank and four legacy Paper Vault CRUD routes. Nonplatform actors are bound to authenticated `user.school_id`; platform admins require server-bound `req.school_id`, not query/body school selection. Actor ID, role and tenant are server-authenticated, not accepted from request JSON.
- `src/routes/assessmentStudioRoutes.js`: teachers can author manual drafts but cannot perform academic final release. Principals and approved administrator roles retain reviewer/final-release validation access.
- `ops/rls/archv1-paper-signed-tenant-clone.sql`: **clone-only** PostgreSQL `pgcrypto` HMAC guard and restricted school/actor policies, with 20 tables protected by ENABLE/FORCE RLS, school policies, Question Bank governance lifecycle policy, Paper Vault and Assessment draft ownership, immutable-history-preserving release authorization, teacher assignment read limits. Secret is supplied at execution, not checked in.
- `ops/rls/archv1-paper-grants-clone.sql`, `archv1-http-fixtures-clone.sql`, and `verify-archv1-paper-signed-clone.sql`: disposable provisioning and asserted fail-closed verification. These scripts reject non-`assps_archv1_rls_` databases. Clone-only grants are broad enough for regression and need a production least-privilege review.
- `src/tests/paper-signed-tenant-real-db.test.js` and `ops/tests/archv1-restricted-paper-http-clone.cjs`: genuine PostgreSQL and HTTP safety regressions with disposable synthetic actors.
- Existing G21 model fixture and database context tests updated to run from the correct fixture directory and assert parameterized context values.

## Fresh clone proof

The **final** disposable clone `assps_archv1_rls_final_20261008` was independently recreated with PostgreSQL `pg_dump -Fc apexos | pg_restore --exit-on-error`, **preserving table ownership**. Migration, scoped grants, synthetic actors and full signed-policy SQL verifier were applied from code. All commands exited 0.

SQL policy evidence: 20 FORCE-RLS tables, 40 school allow/guard policies, 27 governance operation policies, 4 earlier owner policies plus 2 assessment author policies, 3 academic release authority policies, and clone-only bootstrap policies. No unsigned context can see Paper/Question Bank rows. User, tenant, expiry and actor role are included in an HMAC signature; arbitrary changes to tenant GUC, role GUC or signature cause fail-closed results. The signing key table is not SELECT-granted to the restricted role.

**Tests actually run on the final fresh clone:**

| Gate | Observed result |
| --- | --- |
| Final fresh dump/restore + SQL migration | PASS (exit 0) |
| Signed policy schema and missing context | PASS |
| Real non-BYPASS LOGIN (`asspsworker` test peer) + forced runtime role | PASS |
| Cross-school reads and attempts to spoof tenant context | PASS |
| Teacher versus principal Question Bank writes | PASS |
| Teacher cannot modify release; immutable history trigger still applies to principal | PASS |
| Teacher/school identity middleware and false platform selection | PASS |
| Signed-role Node tests | **7 tests / 7 pass / 0 fail** |
| Genuine authenticated HTTP tests on loopback :5034 | **ARCHV1_RESTRICTED_HTTP_ACCEPTANCE_PASS** |
| G21 projection, DB context, governance static tests | **10 tests / 10 pass / 0 fail** |
| G21 frontend/backend canonical DOCX model | **43/43 parity PASS** |
| Existing live backend release smoke after PM2 repair | **ASSPS_BACKEND_RELEASE_SMOKE_PASS** |

HTTP request assertions include: 401 unauthenticated; assigned teacher can manually create and edit own draft; unassigned teacher cannot create; same-school peer and foreign-school user cannot read/edit; forged school query/header ignored; 409 stale snapshot; principal can review and teacher cannot perform publisher review, academic release or governed Question Bank capture; principal can capture a governed candidate with either **201 newly created** or **200 duplicate-safe**; independent Assessment Studio teacher draft ownership enforced and principal can review; legacy `/api/paper/vault` follows the restricted tenant context.

## Production and release decision

- At verification time live backend release metadata was `05443786b580d8d200dcb16b5d9c034fcf5475ab`; frontend had independently advanced to `601fea285d07231bc66d30e2e3db2b34b51cd401`. Do **not** assume backend and frontend SHAs match; check again before any release.
- A separate PM2 service incident was fixed by restoring production `apex-backend` PORT **5000**; localhost health, public API health and backend release smoke later returned HTTP 200/PASS. No RLS candidate was deployed to production.
- Production DB `apexos_user` **still has BYPASSRLS**. Existing APIs/other SaaS routes (e.g., generic search, lesson-planning contexts and legacy consumers outside the scoped vault handlers) may query Paper/Question Bank through a different privileged database connection. The isolated feature-gated routing is not a whole-system independent DB barrier until all relevant entrypoints are reviewed and migrated or sealed.
- Production needs a managed, genuinely separate **password-authenticated** non-BYPASS login, protected signing-key provisioning, SQL migrations approved for production, least-privilege SQL GRANT verification, no-privileged-fallback proof, independent reviewer authorization and tenant-policy adversarial tests. Clone peer authentication and fixture HMAC secret are NOT usable production credentials.
- **Outstanding release gates:** full SaaS attendance/fees/login regression under production-equivalent DB connections, print jobs and genuine Chromium/print proof on the *exact* candidate frontend/backend, revision-bound DOCX HTTP parity after final integration, immutable release workflow exercise, deterministic builds, exact SHAs/ancestry/release snapshots, clone rollback restore, staging and postdeployment checks. Do not turn `PAPER_RESTRICTED_DB_ENABLED` on in production before those are green.

**Decision: restricted Paper/Assessment backend candidate passes its isolated SQL, role and HTTP gates. Full Architecture V1 production DB-RLS release gate is still HOLD. No new candidate code has been deployed to production.**
