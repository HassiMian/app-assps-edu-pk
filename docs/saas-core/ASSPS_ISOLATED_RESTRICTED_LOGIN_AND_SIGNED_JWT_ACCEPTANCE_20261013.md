# ASSPS Core — independent non-BYPASS runtime + signed JWT HTTP integration evidence (13 Oct 2026)

## Scope and baseline

- Mission: replace the live `apexos_user` BYPASSRLS dependency **only after** a separately authenticated, non-BYPASS login survives genuine role, school and Paper regressions.
- Source base: Core isolated `fix/core-rls-clone-candidate-and-ops-20261012` at `31402207820de1a3a01f8c6fb36b26731d506706`; Paper Studio independent ownership preserved.
- Host: VPS `srv1769723`, root ext4 96 GiB / about 53 GiB free. No disk blocker.
- Live PostgreSQL 5432 and PM2 services were **not mutated**. Live `apexos_user` remains `LOGIN=true, BYPASSRLS=true`; production full-app signed guard remains **0/77** and signed helper/schema access remains incomplete. Core release stays **NO-GO**.

## NEW executed disposable security integration

- QA cluster **port 55432 only**, copied *already verified unified ACL + signed-RLS recovery candidate* into one throwaway `assps_core_cutover_login_qa_20261013` database. Owner- and Paper-side source restore stayed unchanged.
- Provisioned unique synthetic `LOGIN NOINHERIT NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION`, `GRANT apex_app_runtime` and QA-database CONNECT only. Generated one-time random QA password/HMAC signing secret in process memory; no credentials stored in Git, printed, or reused from live 5432. QA-only signed-key row changed in the throwaway clone, not production or the parent recovery clone.
- Confirmed database actual login/session identity, non-BYPASS and non-superuser attributes; role cannot `SET ROLE` to legacy `apexos_user`, privileged `postgres`, or protected `apex_paper_owner`.
- Ran actual Core backend `src/config/database.js` with `DB_ENFORCE_LEAST_PRIVILEGE_LOGIN=true`, `DB_AUTH_USE_SIGNED_TENANT_CONTEXT=true`, `DB_SIGNED_TENANT_RLS_ENABLED=true`. Signed school 1 sees 318 students; signed school 2 sees 3; client-forged super-admin/tenant session GUCs see 0, unknown school sees 0; repeated pooled tenant switching preserves isolation.
- Placed synthetic Principal A, Teacher A, Principal B in throwaway QA database **only** (reserved test-only IDs and `.invalid` email addresses). Actual `src/middleware/auth.js` verified synthetic JWTs over real localhost Express HTTP, plus signed backend DB queries: Principal/Teacher A and Principal B HTTP 200; cross-school forged school claim HTTP 401; anonymous HTTP 401; forged super-admin role claim HTTP 403. **These are synthetic accounts, not real school staff acceptance**.
- Ephemeral database and LOGIN both deleted on success; independently queried PG55432 afterward: **0** test databases and **0** test logins remain. This does not delete any existing QA or production database or credential.

## Reproduction and immutable private logs

Execute only with privileged operator access on VPS and intact QA parent clone:

`python3 ops/release/core-infrastructure/run-isolated-restricted-login-signed-test-20261013.py`

Scripts: `run-isolated-restricted-login-signed-test-20261013.py`, `verify-isolated-restricted-login-signed-path-20261013.cjs`, and `verify-isolated-restricted-login-jwt-http-20261013.cjs`.

Evidence (root-only) `/var/backups/assps-core-restricted-login-qa-20261013T0230Z/`, sealed manifest SHA256 `e42eba47c96bf776f9ba0f8c36949cff626057fd6ba443f7c89074300e585995`. Executed exits: restricted + JWT HTTP **0/PASS**, unified Core+Paper ownership/security gate **0/PASS**, Paper-owner ACL parity gate **0/PASS**, live full-app signed gate **2/HOLD** (intentional fail closed). Production login/catalog checked read-only.

## Mandatory gates before any live role cutover

1. Independently authorize a new **production** non-BYPASS LOGIN with minimum explicit DB grants, a protected secret, connection-pool/test readiness and revocable credentials. Do not repurpose privileged `apexos_user` or expose HMAC key to client browsers.
2. Review an atomic reversible **production** 77/77 signed restrictive `USING` and `WITH CHECK` policy migration with Paper owner; reconcile signing helper ACLs, database global/default ACLs, 75 Core CRUD grants and 78 sequence signatures. Preserve independent Paper-only ownership and green Marks runtime.
3. Verify real, authorized school Principal and Teacher login, legitimate school A vs peer tenant B HTTP positive/negative behavior, fees/marks/results/print, authentic Exam9 Save → Reload → Result Card, Paper Urdu font/physical signoff, and all owner regressions. **Synthetic HTTP success here is not those approvals**.
4. Validate frontend/backend candidate commit SHA ancestry against actual live components, create new pre-migration `pg_dump` **and globals** backup, test actual restore and role/ACL parity, verify rollback/blue-green switch, then perform the SaaS Core controlled deployment and post-switch smoke/tenant/print tests.
5. Revoke `apexos_user` privileges/memberships or disable legacy login **only after** no active production service depends on it, independent login is live certified and rollback is validated. Fail closed on any incomplete guard or auth scope; never bypass RLS to force a green result.

**Verdict:** Proven independent restricted-login and synthetic JWT HTTP tenant isolation in isolated QA. **Live BYPASSRLS not yet replaced; production cutover not certified; no production changes.**
