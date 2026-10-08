# ASSPS SaaS Core — Phase 7 signed tenant-context RLS clone certification

**8 October 2026 · isolated engineering only · Production RELEASE HOLD.**

## Provenance and ownership
- Base: `80523e9f2c41f89a215d9aba987b1d7069e0c823` (pushed Phase 6 Core candidate), descended from `cf247cea7fa874509c2c17aa952809cfc56d786f` (Phase 5).
- Worktree: `feat/saas-core-phase7-signed-rls-clone-20261008`, isolated from all dirty ARCHV1/Paper Studio/academic/Connect trees.
- Last inspected deployed frontend `24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92`; backend `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9`. No production artifacts, database roles, credentials, Nginx/SSH/firewall rules, PM2 services, real student records or protected official papers were modified.
- ARCHV1 restricted dedicated Paper database access is separately owned: its signed actor/tenant policies and `apex_paper_runtime` must be reconciled, not overwritten, before joint merge. This phase signs the general `apex_app_runtime` context, not ARCHV1's separate connection.

## P0 root-cause reproduction (synthetic-only)
- Existing FORCE-RLS policies rely on client-mutable `app.tenant_id`/`app.tenant_key` PostgreSQL settings. In a disposable database with a real non-BYPASS `apex_app_runtime` role, modifying the tenant session setting to the second synthetic school made its row visible. This is a **reproducible trust-boundary weakness**, NOT evidence that any production school data was accessed or that arbitrary remote clients can issue raw database queries.
- Production still has `apexos_user` BYPASSRLS, while normal requests feature-gate a role switch. This candidate does **not** remove production privileged logins.

## Implemented on isolated branch
1. Clone-only `ops/rls/phase7-clone-signed-tenant.sql` refuses non-disposable DB name, non-loopback test port and non-superuser policy installation. It creates owner-only signing-key storage and transaction-bound HMAC validation functions under `core_security`. Credentials are generated externally to repository and not logged/committed. Test policy is restrictive for **all 77 current FORCE-RLS public tables**, dynamically classified as **72 school_id tables, 1 schools.id table, 4 tenant_id string-key tables**. Unknown future tables cause an explicit failure rather than an unprotected skip.
2. `src/services/security/coreSignedTenantContext.js` signs verified actor, canonical school and tenant key, independent non-BYPASS login, expiry, fresh nonce and PostgreSQL transaction ID; creates only transaction-local settings.
3. **Opt-in only** `DB_SIGNED_TENANT_RLS_ENABLED=true` in `src/config/database.js` requires existing `DB_ENFORCE_LEAST_PRIVILEGE_LOGIN=true`, `DB_AUTH_USE_SIGNED_TENANT_CONTEXT=true` and protected signing secret. Query and pool.query scoped access signs inside the transaction; unsafe configuration aborts startup rather than bypassing the guard.
4. `src/middleware/auth.js` derives signing actor ID only from verified JWT/user database context (not query parameters, client headers, or self-asserted role). Restricted user/school role matching and signed virtual branch are inherited from Phase 6. Unscoped/legacy `pool.connect` paths without signatures fail closed **on signed-policy tables**, but *all such callers still require inventory and staged conversion* before production.
5. `saas-core-signed-context-real-db.test.js` and `saas-core-phase7-signed-http-clone.test.js` use entirely synthetic data and separate PostgreSQL 16 login to verify signed school, role, teacher assignment, cross-tenant denial, tampering, signature replay, secret ACL, invalid secret, unsafe startup and all 77 policies.

## Executed verification
- Disposable PostgreSQL16 loopback cluster on `127.0.0.1:55432`. Separate DB `assps_core_signed_p7_20261008` restored from the prior synthetic schema/fixture snapshot, **87 public tables and 77 FORCE-RLS**; no real production rows.
- Before change: synthetic second-tenant row visible under client-forged tenant GUC with `apex_app_runtime`. After: **77/77 restrictive signed policies installed**, signature tied to school + tenant key + server login + actor + expiry + nonce + transaction ID.
- **14/14 signed RLS tests PASS** including real authenticated Express Assessment Results/Attendance/Fees/Paper Studio routes; forged cross-tenant, privileged session flag, altered actor/key, replay, unsigned direct pool and old privileged role escalation denied. The signed HTTP case is one test with multiple role/tenant assertions.
- **30/30 previous Phase 6 backend and protected-paper regression PASS** with the signed feature disabled. No runtime regression in tested original paths.
- 244 backend JavaScript files syntax-valid, frontend `npm ci` 315 packages, isolated `npm run build` PASS (3.40 s), official template integrity **6/6 unchanged**. No output published to production.
- Clone-only SQL policy reapplication idempotent: still 77 entries. Synthetic pg_dump/restore into a separate disposable database preserved **87 tables, 77 FORCE-RLS, 77 signed policies**, synthetic schools and Paper Vault entries; not production rollback evidence.
- Host-level ingress remains unresolved: wildcard-bound app/test services, UFW inactive, effective Hostinger cloud firewall unverified. Previous dry-run-only nft draft is not installed. No host firewall alteration in this phase.

## Mandatory HOLDs before any production rollout
- The signed key is a **test-only locally protected secret**. Real release requires independent vault provisioning, app+DB protected secret synchronization, rotation, audited ownership/GRANTs, PostgreSQL migration upgrade/downgrade and deterministic idempotence.
- Convert/fail-close **every** direct pool/legacy/unscoped privileged connection, login bootstrap, service tokens, super-admin/platform-owner, student/parent, finance writes/proofs, attendance marking, Paper Studio publication, Assessment Results writes, Connect direct-DB paths. Signed-clone SELECT/real route tests alone do not certify all 77 operations or all actor roles. Some valid super-admin/service paths intentionally fail closed under this candidate until redesigned.
- Joint SaaS Core + Paper Studio approval of separate ARCHV1 signed `apex_paper_runtime` contract. Do not merge dirty concurrent worktrees or deploy stale branch.
- Hostinger upstream firewall/external vantage and SSH recovery plan, full browser auth & protected official 43-paper print/PDF/DOCX acceptance, frontend lint, deterministic backend release parity, live backup/restore evidence and controlled postdeployment rollback needed.
- No release approval or production deployment. Preserve the test artifacts securely; do not publish HMAC values.
