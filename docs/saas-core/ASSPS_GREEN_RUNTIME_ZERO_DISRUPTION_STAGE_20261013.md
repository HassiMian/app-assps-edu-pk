# ASSPS Core signed-RLS green runtime — isolated acceptance and controlled production stage

## Existing live session dependency and rationale

At 13 Oct 2026, PM2 apex-backend has `DB_RUNTIME_ROLE=apex_app_runtime` but no `DB_SIGNED_TENANT_RLS_ENABLED`, `DB_AUTH_USE_SIGNED_TENANT_CONTEXT` or `DB_ENFORCE_LEAST_PRIVILEGE_LOGIN` process flags. Adding 77 restrictive signed rules **to this active legacy role** would deny legitimate school requests. The original dual-role direct-install script was therefore discarded **without running it on production**.

The independent `assps_core_green_runtime` shadow strategy extends the existing 77 `core_signed_tenant_guard` policies from Marks-only to Marks **plus the new green role**, NOT the legacy `apex_app_runtime`. The new green runtime is `NOLOGIN/INHERIT/NOBYPASS/NOSUPERUSER`, a member of `apex_app_runtime` with `INHERIT TRUE, SET FALSE` for exactly the existing Core table privileges. It gets only core_security schema USAGE and two signed policy helper EXECUTE grants. Protected Paper ownership/ACLs and all existing services stay unchanged. One restricted green LOGIN can later SET ROLE green, but cannot SET ROLE privileged Paper/legacy roles. **No backend process is repointed as part of stage.**

## Exact isolated certification

- QA source: untouched PostgreSQL55432 restored ACL clone, new disposable `assps_core_green77_qa_20261013`.
- `assps-green-signed-77-shadow-stage-20261013.sql` transactional precheck + stage → exact 77/77 signed green, 77/77 Marks preserved, legacy app guards 0/77; green not privileged; no Paper document grants. Staged zero-downtime rollback SQL independently returned 77 Marks / 0 green, deleted global test green role. Test DB then removed.
- Separate full lifecycle `run-isolated-green-runtime-jwt-qa-20261013.py` established temporary green runtime + NOINHERIT NOBYPASS LOGIN on PG55432, created three synthetic QA staff users on clone, injected test-only signed HMAC, exercised **actual** backend DB tenant routing and JWT HTTP middleware: signed school1 counts 318, school2 counts3, unsigned/forged zero, cross-school JWT401, anonymous401, forged super-admin403, privileged `SET ROLE` denied, pooled school-switch PASS. Exit0. Cleanup verified exactly 0 temporary databases and 0 temporary global roles.
- Direct tested rollback applies **only if no live green LOGIN membership exists**, refuses unknown database/port or policy drift. The eventual backend cutover requires independent signed green LOGIN on production and **genuine authorized school staff acceptance**, not the synthetic QA above.

## Rollout requirements

1. Prior to production DDL: new `/var/backups/assps-core-secure-cutover-20261013T0242Z` root-only `pg_dump -Fc`, globals, SHA manifest; fresh archive list validated (but no new restore drill). Backup manifest digest `91a365e21382e3c9a89e9067ba49517609e0fcde2f1d669953b3415ba8004198`.
2. Apply only with `sudo -u postgres psql -p5432 -d apexos` to exact reviewed SQL **after** comparing live policy baseline. SQL has `BEGIN`, `ON_ERROR_STOP`, 1200ms lock timeout, 50s statement timeout, exact db/port/role/table predicate assertions and commit-time invariant checks. Lock/contention aborts atomically.
3. Verify live 77 Marks+green, 0 legacy app guards, HTTP backend and signed Marks service 200, school row counts unchanged, Paper objects/ACL unchanged; any anomalies require assessed rollback, no blind restart.
4. Independently provision restricted green login (no privileged bypass), test login/middleware with authorized *real* staff session and Paper/fees/Marks workflows via isolated green process, certify restart-safe secrets and revocation; only then route production traffic and disable historical BYPASS dependency.

**Production release certification remains withheld until all real staff/browser/RLS/rollback gates pass.** Stage only is neither final migration nor user authorization acceptance.
