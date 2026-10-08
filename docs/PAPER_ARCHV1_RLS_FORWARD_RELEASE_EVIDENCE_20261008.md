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

## October 8 — latest canonical `7887d80` integrated release candidate

Canonical production/frontend/backend release metadata and origin canonical branch were independently verified at `7887d80427f03c0a028f521ba4a10562cd8e7429`. The newer cognitive Lesson Planning + Daily Diary release was forward-merged before testing; no concurrent commits were reversed or overwritten. Read-only full tracked-backend inventory verifies **360 matching runtime files, zero missing, and exactly one expected outstanding file**: `src/services/papers/paperVaultRevisionV6D.js`. Versioned pre/post artifact inventory checks fail closed on any additional difference. The remaining patch replaces request-time schema DDL with a read-only fail-closed journal readiness probe.

Latest *integrated source* acceptance evidence:

- Chromium official PaperDocument corpus 43/43 full render + screen/print text and horizontal overflow parity PASS on isolated port 5337 (`/tmp/assps_latest788_all43_unique.log`). The cold-start limit was adjusted to 45s without relaxing paper assertions and Vite's port was made configurable to avoid another concurrent agent's port 5194.
- Real teacher-facing Saved Papers -> unified Paper Workspace 43/43 PASS; legacy query cannot reopen retired editor. Chromium canary suite 2/2 PASS on isolated port 5341 (`/tmp/assps_latest788_canary_unique.log`).
- Early Years 8/8 browser acceptance PASS using a fresh Chromium process per geometry/PDF case (`/tmp/assps_latest788_early8.log`).
- Genuine Chromium binary A4 PDF proof for official Urdu and English papers PASS: PDF signatures/bytes, media-box dimensions ~595 x 842 points, correct RTL/LTR and requested font stack, no browser errors (`/tmp/assps_urdu_english_a4.log`). Browser PDF generation is tested; this does not claim a physical printer test.
- Cognitive Lesson Planner HTTP 11/11, its model tests, Lesson Plans HTTP 12/12, G21 revision-bound DOCX HTTP 9/9, Question Bank governance HTTP 9/9, Assessment PrintJob HTTP 8/8 (isolated fresh DB / mock auth enabled only under `NODE_ENV=test`), and 14/14 authenticated operational endpoints PASS on disposable DB and alternate-port backend.
- Final ops/static/safety release tests 66/66 PASS; protected templates 6/6 unchanged; deterministic Vite frontend build PASS.
- Request-scoped PostgreSQL `apex_app_runtime` runtime role is NOBYPASSRLS, NOLOGIN, membership SET-only; 75 tenant tables/policies tested with blank and cross-tenant isolation. The bootstrap login's legacy BYPASSRLS is **not** the request runtime identity; the old bootstrap-only checker has been superseded by direct effective-role verification.

Fresh exact live-788 backup (frontend tar, backend critical files/metadata tar, PostgreSQL custom dump, SHA256 evidence): `/var/backups/assps-paper-v1-rls-pre788-20261008T034456Z`. All archives passed checksum verification. PostgreSQL archive restored into disposable `assps_archv1_rollback_788_20261008` with 85 public tables, confirming rollback readability. Live production DB was not mutated by this verification.

Release remains **pending** until the versioned candidate commit is pushed, remote and live ancestry is reverified, guarded preflight succeeds, and the focused one-file backend deployment plus postdeploy smoke, runtime byte inventory, tenant role verification, frontend preservation, and rollback safety checks actually complete. There is no authorization for deploying an old branch or overwriting the latest cognitive-planning frontend.

### Guarded promotion rehearsal and metadata-contract recovery

The first focused live promotion attempt was automatically rolled back by the release guard because the actual canonical frontend release metadata uses `frontendDeployedContracts: "pass"`, while the old generic consistency checker expected backend-only `liveRouteContract: "pass"` on both components. The backend journal file and backend release metadata were restored from the verified live-788 snapshot; subsequent local/public backend health returned HTTP 200 and frontend/backend release metadata remained `7887d80`. Production database and unrelated frontend files were never changed. This is not a paper-rendering failure and was not counted as a PASS deployment.

The consistency checker now validates each component's real, independently sealed field: static frontend `frontendDeployedContracts` (or explicit frontend `liveRouteContract`) versus backend `liveRouteContract`. It still fails closed if either component has no supported contract seal. A new regression test proves valid static metadata, rejects missing frontend seal, and independently rejects missing backend API seal. The focused rollback handler also polls backend readiness after restart rather than reporting a transient immediate connection error as persistent failure.
