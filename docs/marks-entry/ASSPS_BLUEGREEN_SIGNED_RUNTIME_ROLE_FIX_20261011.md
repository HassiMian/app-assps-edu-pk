# ASSPS restricted signed blue/green production migration: backend role-catalog compatibility fix

Date: 11 October 2026. **Review-only backend candidate; production remains unchanged and NO-GO.**

## Real P0 bug independently reproduced
The already-published Core signed backend candidate (`0923ddcd1f5a923123d45396bbeab16f372be7b1`) validates all 77 signed FORCE-RLS tables at startup, but its catalog query was restricted to the hardcoded **`apex_app_runtime`** PostgreSQL role. SaaS Core's next safe blue/green rehearsal intentionally applies its 77 signed restrictive policies to the *distinct* `assps_signed_shadow_runtime` role, leaving the existing role and its permissions unchanged until reviewed cutover. Consequently, even with valid 77/77 signed policies for the configured new role, the old source would reject the new connection with `DB_SIGNED_RLS_CATALOG_INCOMPLETE` before executing authenticated work. Disabling the catalog check would be insecure and is NOT proposed.

## Scoped fix
`al-siddique-backend/src/config/database.js`: replace hardcoded role literal in the signed policy catalog test with a **parameterized** PostgreSQL `name` comparison (`$1::name=ANY(p.roles)`) and bind the already-validated `configuredRuntimeRole()`. Retain intact the entire 77 forced/enabled/restrictive-policy equality check, independent login non-BYPASS test, SET ROLE identity verification, signed context and pool recovery on errors. A missing or malformed `DB_RUNTIME_ROLE` remains fail-closed by the existing role validator; setting the role to an unauthorized or BYPASS role is independently refused by `SET ROLE`/effective-role checks.

Update only the test that had baked in the retired hardcoded role expectation. New test executes **actual original and candidate backend JavaScript modules** through a fully in-memory PostgreSQL connection stub with no DB password, network access or student records. The original source reproduces the exact catalog failure; repaired source binds the configured new role and passes. This is a source-executed contract test, **not** real Node/password-authenticated app startup.

## Executed evidence
- `node --test src/tests/bluegreen-signed-policy-role-binding.test.cjs src/tests/signed-runtime-catalog-contract.test.js src/tests/signed-runtime-catalog-behavior.test.js`: **3/3 PASS EXIT0**, including original RED and repaired GREEN; full actual TAP report `/tmp/assps-bluegreen-runtime-unit-final-20261011.log`.
- **Real read-only PostgreSQL 127.0.0.1:55432** bluegreen clone: parameterized `PREPARE check_core_guard(name)` with signed policy role comparison returns `77` for `assps_signed_shadow_runtime`, `0` for `apex_app_runtime`; prepared statement deallocated; no schema/role/credential changes and no real student rows touched.
- `node --check` and `git diff --check`: PASS.
- A separate actual credentialed new-bluegreen-login startup test **could not be executed through the available command interface**. Do not claim that test or any production migration passed.

## Release boundary
This resolves one concrete **source compatibility** obstruction for the new signed runtime role. It does not provision real non-BYPASS production LOGIN credentials, grant policies/keys, certify tenant-signed authenticated principals/teachers, sign Paper Studio ownership, or authorize PostgreSQL DDL. Current deployed `apexos_user` is still BYPASSRLS, actual production signed helpers/policies and environment flags remain missing, and existing service artifacts are older. The safe rollout still requires a reviewed reversible production role/key/schema migration, proof that all bootstrap/auth/tenant/super-admin/service routes work with the selected non-BYPASS LOGIN, real school JWT cross-tenant negative testing, backups/rehearsed rollback and explicit Core owner GO. Never run clone-only phase7 migration against `apexos` or replace a production runtime identity by flipping env flags alone.

Candidate is an isolated descendant of the **current Core backend source** on `release/marks-firstterm-backend-livebase-20261010` SHA `0923ddcd1f5a923123d45396bbeab16f372be7b1`. Neither that branch nor other owners' branches/worktrees nor live infrastructure were modified.
