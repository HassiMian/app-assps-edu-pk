# ASSPS SaaS Core — six unscoped global-table privileges: implemented isolation and verified boundaries

**Date:** 14 October 2026. **Owner:** SaaS Core; GitHub issue #4. **Status:** isolated implementation/QA complete; live production permissions, PM2, Nginx and database UNCHANGED. This is NOT a production release or a signed Core acceptance.

## Verified root cause; direct REVOKE on six tables would NOT work

The role `assps_core_green_runtime` had **no direct grants** on the six offending public tables. PostgreSQL 16 role membership instead gave it `apex_app_runtime` with `INHERIT TRUE, SET FALSE`. That parent has broad DML (SELECT, INSERT, UPDATE, DELETE) on:

- `admin_block_audit_log` — privileged security/audit events without tenant key.
- `ai_jobs`, `ai_queue_events`, `ai_queue_state` — system-level AI job processing tables without tenant keys.
- `organizations`, `campuses` — global organizational directory, with owner/org relations but no direct school_id/tenant_id.

RLS is disabled on all six. These are **different kinds** of global data and must not receive a fabricated one-size-fits-all school_id RLS policy. Revoking six table privileges from `assps_core_green_runtime` alone does not remove access inherited from its parent; revoking from the shared `apex_app_runtime` or `apexos_user` would break Blue/legacy SaaS processes. Production Core security auditor correctly fails closed.

## Implemented and actually executed: full-ACL isolated restoration

QA snapshot from already private, SHA-protected, full-ACL consistent backup `/root/assps-release-backups/connect-full-recovery-20261014T164243Z/apexos-full.dump`; no passwords included in separately restored role definitions. Disposable PostgreSQL 16 cluster at **Unix socket port55477**, database `apexos`. The first trial **detected invalid fixture setup** because `pg_restore -x` stripped actual ACLs; that trial was explicitly rejected, the database restored with **full ACLs** and the role baseline recovered before final execution. No false green from omitted grants.

The guarded QA-only SQL `ops/release/signed-bluegreen/qa-six-global-leastpriv-20261014.sql` runs only when current DB=apexos, actual port55477 and operator=postgres, source exactly 77 signed restrictive tenant guards and actual Green inherited parent match. Transactional algorithm:

1. Grant direct SELECT/INSERT/UPDATE/DELETE **only where held by existing parent** to Green for exact **77 signed FORCE-RLS tables**; grant only their owned sequence permissions previously held by parent. In this snapshot, **75** of the 77 had inherited parent SELECT; after removal Green has exactly those 75, not an invented 77. Other two remain as originally denied.
2. `REVOKE apex_app_runtime FROM assps_core_green_runtime` removes dangerous inheritance **only from Green**, preserving the shared Blue/legacy parent and its existing grants.
3. Create three separate **NOLOGIN**, non-super, non-BYPASSRLS worker principals with **no memberships from Green or its login**: AI worker for exactly the three queue tables (with tailored read/write/delete per table); global directory reader SELECT for organizations/campuses; audit writer INSERT only for admin_block_audit_log.
4. Reject unexpected schema/role drift, residual Green access to any of the six tables, and worker role membership from the tenant-facing Green. No universal role inheritance or global RLS bypass issued.

## Real PostgreSQL acceptance and rollback proof

`python3 ops/release/signed-bluegreen/test-six-global-isolation-on-clone-20261014.py` **14/14 PASS** against full-ACL restored cluster:
- 1,762 Exam9 scores and 213 genuine numeric zeros preserved; exact historical 301-row fingerprint `bcdc098a3e6cabb6f4c31736b14e39b9`.
- Green role denied SELECT on each of six global tables, while unchanged old `apex_app_runtime` parent still permitted all six.
- Worker roles permitted only their own distinct queue, directory, audit operations and forbidden global readings.
- **75** previously readable FORCE-RLS signed tables still readable by Green; anonymous signed school SELECT yielded zero rows.
- Green login/runtime cannot SET ROLE/INHERIT any privileged worker identity.
- Actual SQL `BEGIN; GRANT apex_app_runtime ...; SELECT [six accessible]; ROLLBACK;` confirmed role-membership restoration would regain the old six privileges in rollback rehearsal while leaving tested Green isolated.

A distinct restricted **QA AI worker LOGIN** was created only in disposable PG55477 and granted just the QA AI role; `aiQueueWorkerDatabase.js` real SQL check allowed queue SELECT but denied organization SELECT (SQLSTATE42501). Separate worker config adversarial cases **5/5 PASS**. No credential or signed actor was copied from live production.

## Backend source integration completed (not yet a deployable GREEN)

- Added `al-siddique-backend/src/services/ai/aiQueueWorkerDatabase.js`. When `DB_SIGNED_TENANT_RLS_ENABLED=true`, queue SQL is issued through a **dedicated, explicitly configured restricted AI worker PostgreSQL login**, NOT through tenant request `config/database.query`. Every worker checkout reauthenticates actual DB `current_user`, NO SUPER/BYPASSRLS, required worker role membership/queue permission and DENIAL of organizations, campuses and security-audit SELECT. Missing/misrouted worker credentials fail closed; no fallback to privileged legacy pool. Blue/legacy non-signed DB mode retains old code path untouched.
- Updated `services/ai/paperAiQueue.js` (its 13 queue queries) and privileged `routes/opsRoutes.js` (two queue-event diagnostic queries) to use the limited worker helper. Other request SQL stays under signed school context. The current `settingsRoutes.js` only probes `to_regclass` for directory tables, not cross-school directory SELECT.
- Production worker service login provisioning is a separate Core-owned identity action. The dev-only role `assps_core_qa_ai_worker` does not exist in production and must never be copied as an authorized actor; production signed mode pins a different dedicated worker role. The worker may still be in the API process with its own credentials; for strongest isolation Core should move global jobs into an independently supervised worker process and expose only safe job APIs. This source change is an intermediate safety improvement, not a claim of full process isolation or staff HTTP authorization.

## Release gate and safest next execution (no silent promotion)

1. SaaS Core review must forward-port the source onto the latest source with GitHub issue #4 coordination, preserving all other Paper Studio/Academic branches. Rebuild and test the actual backend Green and standalone Connect candidates.
2. Protect ongoing real records with a **new** current full-ACL backup/restore; determine legitimate global queue, audit, org/campus caller contracts. Provision an *actual separate restricted worker login* (no global request/user session), private credential transfer and worker supervision. Recreate rollback script for exact current production role membership, built artifacts and Nginx.
3. Before touching port5432, run equivalent least-privilege SQL on a fresh clone with current production ACLs and negative tests, signed school-A/school-B actor denial, AI queue feature usability, public diagnostics and role boundaries. Do not apply the hard-bound QA SQL to production or replace its fixed port guard.
4. Independent Core owner must authorize production-scope migration and trusted attestor; pre-cutover **real authenticated teacher** signed acceptance, tenant/role checks and verified rollback readiness. Only then Core can atomically promote corrected Next compiled build AND remove the Nginx's two /dashboard→/admin intercepts. No academic results publication is part of this login-only release.
5. Post-cutover owner checks live six anonymous routes, genuine temporary-password → challenge → relogin, signed marks denial across subjects/tenants, zero-loss score fingerprint and rollback evidence. Any failure = restore old Blue first.

**Still NOT verified:** full active Core worker contract, live role/permission migration, independent signed actual actor/tenant/security acceptance, installed trusted Ed25519 release key, genuine teacher login, deployed Green, actual public rollback, authorized First Term paper publication. Release must remain HOLD until those are real.
