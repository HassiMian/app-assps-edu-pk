# ASSPS SaaS Core | Blue/green signed RLS production-parity rehearsal | 2026-10-11

Release authority SaaS Core, coordination issue #4. **ISOLATED REHEARSAL PASSED; ACTUAL PRODUCTION DEPLOYMENT HOLD.**

## Source of truth and exact commits
Live frontend 24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92; staged frontend 2ec5ae597e9f50772cf443b0392b442b7fa037db.
Live backend 16ab8f346ba27aa6b2e29a8f03c68db32a326cb9; staged Core signed backend 0923ddcd1f5a923123d45396bbeab16f372be7b1.
Current live PM2 backend and Connect online; original Nginx protected-media gate PASS. Frontend and backend deployment artifacts unchanged. Paper Studio, Grade IX-X, APEX branches/worktrees preserved.

## Critical discrepancy newly closed in SECOND synthetic signed rehearsal
Read-only production catalog compared to disposable port55432 shadow: all 77 protected FORCE-RLS table names, columns, types and nullability matched. Real production has 212 original policies; synthetic shadow initially had 156 baseline policies plus signed guards. Precisely 56 public tenant_isolation_policy rules were missing from the original synthetic clone. These were generated from read-only production PostgreSQL policy metadata (no student data), transactionally re-created ONLY on assps_core_signed_migration_rehearsal_20261010 with strict database/port guards. New shadow now matches exact 212 original policy definitions, plus 77 additional restricted signed guards (289 total). Comparison script ops/security/verify-production-shadow-policy-parity-20261011.py PASS.

Runtime privilege parity: protected tables 77/77 match actual production (75 full CRUD, two intentionally denied paper_documents and paper_revisions); sequences 77/77 match (73 full USAGE/SELECT/UPDATE and four intentionally restricted). The missing synthetic permissions were restored only on shadow. Script ops/security/verify-production-shadow-runtime-grants-20261011.py PASS. Repeated signed actor school A/B Marks transaction: own read/UPDATE PASS, foreign school invisible, UPDATE 0, setting spoof denied, ROLLBACK PASS.

## THIRD isolated synthetic blue/green role rehearsal
Database assps_core_bluegreen_rbac_rehearsal_20261011, isolated PostgreSQL port55432, contains NO real school data. Role assps_signed_shadow_runtime created NOLOGIN, NOBYPASSRLS with membership in existing apex_app_runtime and test-login allowed SET ROLE. On bluegreen shadow only, all 77 signed restrictive policies target new signed role; original old apex_app_runtime role is unchanged by signed restrictions. This models safer parallel old/new runtime operation.

Executed THREE real PostgreSQL actor scenarios via guarded clone-only SQL:
1. Old unsigned app runtime continues to see school A only (school B denied), with no HMAC: PASS.
2. New signed role without signature or with forged tenant/superadmin settings sees neither school: PASS.
3. New signed role with valid HMAC signed actor/transaction sees and updates own school A marks but not B; foreign update=0 and tenant spoof denied; transaction ROLLBACK: PASS.
Scripts: ops/security/fixtures/bluegreen-*-20261011.sql plus ops/security/verify-bluegreen-signed-role-coexistence-20261011.py. No secret value embedded, no production SQL, roles or actual marks modified.

## Reproducible gate
ops/release/verify-assps-marks-release-gates-20261010.py signed EXIT0 verified original 77 signed catalog, exact production 212 legacy policy parity, 77 table and sequence grant parity, bluegreen role coexistence, official Phase6 synthetic fixtures, and real signed restricted PostgreSQL actor and actual Express/JWT Marks, Assessment Results, Lesson Plans/Daily Diary HTTP suites against backend commit 0923ddcd.

Production release preflight remains FAIL-CLOSED: production apexos DB_USER apexos_user LOGIN/BYPASSRLS role, core_security schema/functions absent, strict signed config not enabled. The existing Phase7 SQL is CLONE-ONLY and must never be run on actual production. New rollout requires separately reviewed production-safe signed schema migration, protected HMAC/SCRAM provision, distinct NOLOGIN/NOBYPASS signed role with own 77 restrictive guards, real authorized school JWT tests in shadow service, frontend/backend backup and recovery, independent Paper Studio signoff and live smoke. Do not add signed guards to CURRENT apex_app_runtime on running production because it may break existing traffic. Old BYPASS role also supports other consumers, so revoke only after their cutover verification.

Private root-only DB and app rollback backups preserved and SHA verified previously. Disk usage near 92% at checkpoint, another operational risk before deployment. **RELEASE_CERTIFIED=FALSE; LIVE_APPLICATION_DEPLOYMENT=HOLD.**
