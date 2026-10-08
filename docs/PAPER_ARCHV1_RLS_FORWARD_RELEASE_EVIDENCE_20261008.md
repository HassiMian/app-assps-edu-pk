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
- Authenticated synthetic school operational smoke through alternate-port server: dashboard, students, fees summary, vault, paper context, Question Bank and lesson plans 7/7 PASS. Test created/deleted a synthetic school only in disposable DB.
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
