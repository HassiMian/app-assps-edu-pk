# ASSPS SaaS Core — isolated runtime RLS candidate and release security gates
**8 October 2026 UTC. Ownership: SaaS Core & Production. STATUS: CANDIDATE ONLY; PRODUCTION HOLD.**

## Source and boundaries
- Original production frontend SHA: `24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92`.
- Original production backend SHA: `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9`.
- Clean isolated development branch: `fix/saas-core-rls-isolated-20261008`, based on the newer frontend SHA. Existing overlapping ARCHV1/Paper Studio dirty worktrees are preserved untouched. This branch must not be promoted without reconciliation against newer live heads, especially `src/config/database.js`.
- Production database `apexos` was **not** migrated or modified. Production services were not restarted. Production school data was neither exported nor read by tests (only schema and catalogs inspected).

## Verified effective privilege issue
Production config: database login `apexos_user` has `BYPASSRLS`, whereas `DB_RUNTIME_ROLE=apex_app_runtime` is set and the latter role has no BYPASSRLS. Authenticated scoped calls attempt `SET ROLE`. Initial authentication/bootstrap/unscoped paths still use the login role. Therefore `SET ROLE` does not constitute a fully independent least-privilege security boundary; production **not** certified.
- Existing `src/server.js` seeds AsyncLocalStorage with `rlsEnabled:false`.
- `src/middleware/auth.js` fetches the active account/school during authentication before the final tenant context is activated.
- `src/config/database.js` keeps the privileged login available to unscoped calls; these and privileged operational scripts need explicit ownership/purpose controls.
- ARCHV1 Paper/Assessment parallel worktree independently prototypes a password-authenticated restricted paper connection, route integration and signed tenant policies; no overlap was overwritten here.
- APEX Connect direct-DB and superadmin/service/virtual-branch paths require separate signoff. These gates are **not** satisfied by testing ordinary teachers alone.

## Implemented in THIS isolated candidate
1. Opt-in `DB_ENFORCE_LEAST_PRIVILEGE_LOGIN=true`: reject superuser or BYPASSRLS login (no automatic privileged fallback), require configured runtime role. Kept OFF in production.
2. Opt-in `DB_AUTH_USE_SIGNED_TENANT_CONTEXT=true`: after JWT signature validation, restrict the FIRST active-user lookup to the signed school claim; verify active account matches that claim. Reject missing school claim in this candidate, so platform-wide superadmin/virtual branch/service flows need explicitly separate authorization design before rollout. **Do not enable globally in production.**
3. Real isolated-login Node tests for school A/B visibility, cross-tenant denial, pool reset, and server-side teacher JWT/role authorization on ephemeral localhost HTTP.
4. Clone-only SQL fixture and negative RLS test; SQL refuses non-disposable DB names; all fixture subjects are synthetic.
5. Repeatable read-only ingress preflight, deliberately non-mutating. No proposed firewall rules were applied.

## Isolated environment, not production
- Production-schema-only export 362 KiB; 87 public tables, 77 RLS enabled + FORCE. No school data exported.
- Test database `assps_core_rls_clone_20261008` and an **entirely independent** PostgreSQL 16 test cluster at `127.0.0.1:55432` with `assps_core_test_login` (LOGIN, NOINHERIT, NOSUPERUSER, NOBYPASSRLS) and `apex_app_runtime` (NOLOGIN, NOBYPASSRLS).
- Roles created in the independent test cluster, not the production PostgreSQL cluster. All data used in behavioral tests is synthetic: two schools, two students, two teachers.
- SQL acceptance: control privileged session sees both synthetic tenants, restricted unscoped session sees zero; restricted A sees A-only, B sees B-only; cross-tenant UPDATE 0 rows, cross-tenant INSERT rejected.
- Node scoped integration: 4/4 PASS; signed-JWT/teacher middleware localhost acceptance: 1/1 PASS, covering teacher A/B, invalid school claims, missing authentication, admin role denial, database-authoritative role vs token role.
- Previous legacy static tests initially 3/5 due to stale string-literal assertions; test expectations updated to actual parameterized `set_config`, **5/5 PASS**.
- Explicit negative probe: independent test PostgreSQL superuser rejected with `DB_PRIVILEGED_LOGIN_REJECTED`.
- Disposable rollback proof: schema/data dump restored into `assps_core_rls_restore_20261008` on the independent cluster, **87 tables, 77 FORCE-RLS, 2/2/2 synthetic school/student/user counts**. Isolated dump SHA256: `a7290e7931600540e26fb9120f29a650574bbfffef2446fadd8851faddf25c2d`. This is **NOT** production backup restoration certification.

## Host exposure and containment HOLD
Read-only ingress check observed 8 app/test listeners on wildcard interfaces; UFW inactive, iptables INPUT ACCEPT, nftables empty. Local host-based firewall security gate **FAIL (exit 3)**; Nginx syntax check PASS. Hostinger/cloud ingress ACLs and independent external reachability were **not** confirmed. Do not enable UFW or alter SSH without Hostinger rescue and rollback proof.
Required controlled perimeter remediation: identify actual SSH management path and cloud firewall, restrict external ingress to 80/443 and approved admin access, enforce loopback backend/Connect/agent/preview listeners where architecture permits, test both internal Nginx proxy and external blocked-port acceptance, provide undo procedure.

## Release gates still HOLD
- Effective tenant claims require authenticated, tamper-resistant database trust proof, not merely user-settable session flags. Verify signed claim/source and privilege resilience against injection and unintended role reset. Independent restricted login reduces exposure but does not prove every DB path safe.
- Inventory and convert ALL unscoped login/bootstrap, service, super-admin, virtual branch, scripts, and Connect DB paths to purpose-bounded access. Fail closed; no general-purpose privileged fallback.
- Independently certify teacher assignment (not just role), school admin/accountant/parent/student, attendance, fee ledger, legacy/official Paper Workspace, results, Question Bank approval, and authenticated HTTP using non-BYPASS login.
- ARCHV1/Paper Studio and Paper Results owner signoff, protected official print/PDF/DOCX and 43-paper regression, migrations/GRANTs and live credential rollout plan.
- Hostinger perimeter external test, least-privilege ingress, credential provisioning/rotation, secrets, rate limits, backups.
- Full candidate frontend/backend builds + true production artifact equality, canary, rollback of LIVE source and DB with real non-destructive recovery proof.
- No deployment, database-role changes in live PostgreSQL, SSH/firewall changes, or service restarts authorized by this candidate.

## Safe promotion sequence
1. Serialize competing Core/Paper Studio backend path changes through issue #4, require clean merge onto latest live frontend and backend heads. Compare `database.js` with ongoing ARCHV1 security work before selecting a single implementation.
2. In disposable clone use real password-authenticated restricted login with isolated fixture ownership; migrate all necessary application data paths to non-BYPASS least privilege while preserving bootstrap needs with narrowly scoped, auditable authentication.
3. Expand matrix: teacher-assigned/unassigned, cross-school, student/parent, fees/attendance/results/protected papers, service and superadmin, plus replay/expiry/tamper and parameterized SQL boundary checks.
4. Test controlled cloud+OS perimeter policies and SSH access with independent remote vantage and rescue.
5. Prepare migration backup, snapshot, source/asset provenance, staged credentials, rollback and audit signed release candidate; only then promote with explicit release authority and live smoke evidence.
