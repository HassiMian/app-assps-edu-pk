# ASSPS SaaS Core Phase 10 — explicit signed tenant scope fail-closed gate

**8 October 2026, isolated candidate, production deployment HOLD.**

## Baseline / ownership
- Source: Core Phase 9 clean `feb084499324c68637d5b89ef7dc425e9e21a922` (dual signed app+Paper login).
- Isolated new branch `feat/saas-core-phase10-context-failclosed-20261008`; existing ARCHV1 dirty security worktree and independent Paper Studio, Grade IX–X and APEX Connect sources untouched.
- Production artifact release SHAs unchanged at inspection: frontend `24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92`, backend `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9`. The Phase 9 SQL policies and Phase 10 code **are not deployed**.

## Newly reproduced weakness and isolated code correction
- In prior `src/config/database.js`, `applyTenantContext(client)` returned `false` when there was no authenticated AsyncLocalStorage context, even when the explicit `DB_SIGNED_TENANT_RLS_ENABLED=true` security mode was configured. A caller ignoring this `false` could continue in an unscoped transaction; trust was delegated to downstream permissions rather than a fail-closed API contract.
- Reproduced prepatch with two new tests, **0/2 PASS as expected**: missing context, `rlsEnabled=false`, `isSuperAdmin=true`, missing actor. Test client explicitly throws on any SQL, proving guard should reject before queries.
- New behavior under signed mode: reject missing/disabled context, super-admin bypass assertion or missing/non-positive actor with a stable `DB_SIGNED_TENANT_SCOPE_REQUIRED` exception **before sending SQL**. Existing signed teacher/school HMAC flow unchanged. Legacy mode's old `false` for unscoped callers retained to avoid unrelated bootstrap/production behavior changes. No global privilege expansion, no DB SQL/grant/policy edits.
- This specifically tightens an explicit helper's API contract, but **does not certify all legacy `pool.connect` or `rawPool` callers**. In particular, signed super-admin/service/bootstrap design still requires a separate authorized pathway, not setting client-controlled super-admin GUCs.

## Executed evidence (separate suites)
- **2/2 PASS** new fail-closed tests on exact code after patch (initial red negative-control documented).
- **5/5 PASS** Phase 9 dedicated signed Paper role and Assessment Results real localhost HTTP/PostgreSQL16 clone tests.
- **15/15 PASS** existing signed SaaS app / Assessment / Lesson/Diary and HMAC tamper/nonce/cross-tenant regressions on isolated clone.
- **35/35 PASS** Phase 6-8 legacy signed-mode-OFF RLS/protected-paper/DOCX/planning/role regressions after setting the correct Phase 6 disposable DB. An initial attempted run against the Phase 9 disposable DB failed *three environment precondition tests* because the tests explicitly require the Phase6 DB; correct-DB rerun green. These runs are not production credentials or live acceptance.
- **251/251 backend JS syntax PASS**; isolated frontend `npm ci` 315 packages and Vite build **PASS 3.17 s**; protected official templates **6/6 unchanged**. Git whitespace check PASS.
- Synthetic-only isolated PostgreSQL16 loopback port 55432 used; no production DB mutation. Existing synthetic test fixtures retained; production backup/rollback or external firewall not certified.

## Remaining P0/P1 blockers / release decision
1. All auth/bootstrap/superadmin/service token, direct DB and remaining privileged transactions need unified non-BYPASS, signed HMAC authorization and negative-role tests, with safe connection release, and audit of all explicit `applyTenantContext` callsites.
2. General signed and dedicated restricted Paper pool integration needs migration versioning, owner-pinned secrets/rotation, 77-table write/RLS parity, result/teacher assignment grants and full student/parent/finance/attendance routes. Clone-only SQL must **not** run against production.
3. Paper Studio's newer frontend Phase 8 editor selection fixes and official 43-paper print/PDF/DOCX source ancestry need independent final integration, plus APEX Connect recovery/provenance and Academic Master approved question count currently zero.
4. Hostinger upstream ingress, cloud firewall, external port reachability, SSH recovery, CI/lint, source release ancestry, production-equivalent backup/restore and controlled rollback still block release.

**Certification HOLD.** No production deploy, live services restarted, production database user/record/role/policy changed or firewall rule applied.
