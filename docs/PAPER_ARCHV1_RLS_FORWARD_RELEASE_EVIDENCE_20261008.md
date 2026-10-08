# ASSPS Paper Studio — restricted runtime forward release audit

Date: 2026-10-08 UTC. Source base: actual production release metadata `571ab332e2d8b2de64122e261c4fbffcc13c85a1`.

## Root cause

Live release metadata named `571ab33`, but two critical deployed backend files still contained the older pre-runtime-RLS bytes: `src/config/database.js` and `src/middleware/auth.js`. The backend HTTP process therefore did not enforce the source-defined authenticated `SET ROLE apex_app_runtime` boundary even though the restricted PostgreSQL role and tenant policies already existed. Read-only artifact inventory verified 354 matching runtime source files and only those two mismatches plus the independently revised V6-D journal service.

After staging source from the verified live commit, genuine revision-bound G21 HTTP initially failed on the disposable clone with `permission denied for schema public`. The cause was `paperVaultRevisionV6D.ensureJournal()` executing schema migration SQL in an authenticated request. The focused fix converts it to a read-only zero-row readiness check and fail-closed 503 when a versioned schema migration is absent or inaccessible. No authorization loosening or request-side DDL is acceptable.

## Executed staging gates

- Disposable database `assps_archv1_rls_stage_20261008` cloned from live via a PostgreSQL dump/restore; no synthetic test ran against `apexos`.
- Application runtime role and tenant-table RLS checker: PASS, 75 scoped tables, restricted role `apex_app_runtime` is NOLOGIN / NOBYPASSRLS with SET-only login membership. The checker exercised blank tenant isolation and tenant-specific student visibility.
- Alternate-port backend `127.0.0.1:5039`: health and readiness returned 200; release smoke PASS (unauthenticated paper/Question Bank endpoints return 401).
- G21 revision-bound POST canonical DOCX HTTP on disposable DB/test server `5040`: 9/9 PASS, including cross-tenant, current revision/hash, fail-closed legacy sources and real DOCX SHA.
- Lesson Plans HTTP 12/12 PASS; Question Bank governance HTTP 9/9 PASS; Assessment Print Jobs HTTP 8/8 PASS. The mock token was enabled only in the disposable print test process (`NODE_ENV=test`), never production.
- Authenticated synthetic school operational smoke through alternate-port server: dashboard, students, attendance, academic setup, employees, fees, families, date sheets, timetable, Vault, paper context, Question Bank and lesson plans 14/14 HTTP 200 PASS. Test created/deleted a synthetic school only in disposable DB.
- Static/contract/release tests: 58/58 PASS.
- Vite production frontend build PASS; protected school paper templates 6/6 unchanged; production-safety check PASS.

## Guardrails and release scope

- No unrelated SaaS source modules should be overwritten. Forward backend files requiring promotion: authenticated DB runtime connector, authentication tenant binding, and V6-D read-only journal readiness service. The frontend user-facing build remains at the previously verified release until separately audited.
- A new read-only artifact guard checks actual deployed bytes of all three critical backend files against source, plus exact backend release SHA. It fails on mismatches instead of trusting release metadata alone.
- Component release consistency accepts a backend-only forward commit **only** after Git proves it descends from the canonical live base **and** that the named remote branch exactly points at the candidate commit. Frontend metadata must remain tied to its actual deployed source.
- Production PM2 must continue `PORT=5000`, `NODE_ENV=production`, `AUTO_MIGRATE_ON_BOOT=false`, `DB_RUNTIME_ROLE=apex_app_runtime`.
- Pre-release backend/frontend/DB snapshots and rollback verification are mandatory; post-deploy health, authenticated-restricted evidence, smoke, security gates, record-integrity audits and exact deployed artifact bytes are mandatory. Any failing critical gate means no success certification.
- The legacy DB login still has BYPASSRLS for bootstrap compatibility. The authenticated application path is instead restricted by SET ROLE. Long-term deprivileging of the bootstrap login remains a separate cross-module hardening project requiring an independent rollout and explicit regression proof.

Status: focused code and isolated staging validated. Production promotion and post-deploy checks must be recorded separately after actual execution.

## Latest parallel production fence and rollback evidence

The canonical production stream subsequently advanced frontend and backend metadata together to `25932458d9d2f9ea323576c4fe64f725b0cb9b0b` (authenticated attendance/settings corrections). The live frontend `index.html` and all 80 assets were independently verified byte-for-byte against this exact source commit. The Paper Studio forward branch merged that descendant, rather than replacing any of its unrelated UI improvements. The three scoped backend runtime files remained the only observed backend-source differences; they require the focused security release, not broad backend synchronization.

A fresh pre-release rollback package was captured at `/var/backups/assps-paper-v1-rls-predeploy-20261008T032459Z`: frontend tar, critical backend files/metadata tar, and a complete PostgreSQL custom dump. All SHA256 checks passed, and the database dump was actually restored into disposable `assps_paper_v1_rollback_259_20261008`, verifying 85 public tables. The prior checkpoint package is preserved separately. Do not use the older checkpoint to revert the newer canonical attendance/settings release.

The split-release consistency guard requires an exact source ancestry, matching Git remote branch, live frontend SHA, and assurance that unpromoted canonical work does not contain backend changes. Backend-only promotion must leave live frontend files and metadata untouched; post-deploy metadata must identify the backend forward SHA truthfully, not claim a frontend rebuild.
