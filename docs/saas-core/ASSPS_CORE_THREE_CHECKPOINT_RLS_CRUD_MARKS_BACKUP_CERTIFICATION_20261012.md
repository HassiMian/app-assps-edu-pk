# ASSPS SaaS Core — Three-Checkpoint RLS, Marks and Recovery Certification

**Execution:** 12 October 2026 · **Authority:** SaaS Core & Production Master · **Coordination:** GitHub Issue #4

**Decision:** Existing signed Marks Entry = scoped GO, unified legacy-backend replacement = **HOLD**. This is a checked engineering milestone, not an unauthorized production deployment.

## Independently verified release provenance

- Canonical Core release branch `release/firstterm-core-security-unified-20261011`: remote commit **`00da1e296c3116086a1d1e98c272eb0534e4ee8e`** (unchanged).
- Core isolated development base branch `fix/core-rls-clone-candidate-and-ops-20261012`: starting commit **`7b3894a4165ce657486f58f7d6e4ae29eaefc95a`**. The present commit is a descendant, not an overwrite of Core canonical or any other agent's dirty worktree.
- Live frontend under `/var/www/assps-resultcards-class-isolation-8b5d370e`: metadata SHA **`8b5d370e0a91e86f5c7c136bbf49521ab1e15147`**.
- Live legacy backend `/var/www/apex-backend`: metadata SHA **`16ab8f346ba27aa6b2e29a8f03c68db32a326cb9`**. Its deployed LOGIN `apexos_user` **still has PostgreSQL BYPASSRLS**. No role revocation or backend replacement.
- Live signed green Marks service on private loopback5091: prior independent SHA **`1b0541af75526b2840e7403bc8193cd1c540a811`**, healthy HTTP200. Independent frontend and API HTTP200.
- Separate Paper Studio release candidate has a newer remote revision as of this mission; no Paper/Grade IX–X/Connect agent source, academic data or production artifacts were altered.

## Checkpoint 1 — Signed RLS *and* actual SQL privilege coverage

**Findings fixed on a test database, not production:** Previous combined-PG55432 protected-scope clone had correct **77/77 signed restrictive policies** but its `apex_app_runtime` runtime had SELECT on **75** protected non-Paper relations and zero INSERT/UPDATE/DELETE grants. Its `assps_marks_signed_runtime` unnecessarily retained grants on two protected Paper relations, a mismatch with the intended live permission boundary.

Two separately guarded, transaction-safe **clone-only** SQL rehearsals now reconcile the explicit source-verified privilege architecture in isolated database `assps_core_rls_guard_qa_20261012` (private PostgreSQL port55432):

- `apex_app_runtime`: SELECT/INSERT/UPDATE/DELETE on exactly **75/75** permitted Core relations; **0** access to the two protected Paper relations.
- `assps_marks_signed_runtime`: SELECT/INSERT/UPDATE/DELETE on exactly **75/75** permitted Core relations; **0** access to the two protected Paper relations.
- **77/77** protected tables have exact dual-runtime restrictive signed school/tenant guards with matching `USING` and `WITH CHECK` predicates (73 school-based, 4 tenant-key-based); both runtime roles are NOLOGIN/non-SUPERUSER/non-BYPASSRLS.
- Historical `exam_results`, students, attendance, fees, legacy protected papers and other school records were **not** changed. The clone contains restored records but the privilege rehearsals are catalog DDL only; no DML was executed.

New read-only `verify-dual-runtime-crud-boundary-20261012.py` independently validates 14 expected role/grant/policy facts plus negatives, with explicit catalog-only status. **Clone PASS.** The live production role retains the 75/75 legacy CRUD grant boundary but signed full-app guards remain **0/77**, so live production full-RLS certification **HOLD**.

The untouched original restored clone continues to lack `apex_app_runtime` privileges; it remains a baseline parity reference, not silently edited to manufacture a PASS. The isolated signed-role **genuine PostgreSQL LOGIN acceptance** attempted in the earlier mission was blocked by platform safety before execution; no PASS is claimed and that temporary test LOGIN remains disabled (`NOLOGIN`). Real authenticated principal/teacher role/tenant HTTP acceptance is a separate outstanding gate.

## Checkpoint 2 — Real live anonymous API denial, scoped Marks regression

- **Eight actual public HTTPS protected GET routes returned HTTP401 unauthenticated:** `/api/exams`, `/api/exams/grade-settings`, `/api/exams/results`, `/api/exams/results/9`, `/api/exams/student-results/1`, `/api/students`, `/api/fees`, `/api/attendance`. The new one-shot `verify-live-anonymous-school-boundaries-20261012.py` is GET-only, sends no tokens or user data, reports no private body content, and fail-closes on missing/unexpected success/transport failures. **PASS**.
- Live Nginx Marks method-split SHA checked: reviewed GET exam/grade settings/results and POST results route to green5091; POST exam creation, PUT grade settings and DELETE exam remain on the legacy backend, **not certified signed-RLS**. No Nginx routing changes.
- Offline synthetic First Term Marks Chromium **11/11 PASS** and class/section Result Cards Chromium PASS; blank-vs-zero/print **16/16 PASS**; six protected frontend templates **6/6 PASS**; frontend Vite production build **exit0**, **not deployed**.
- Genuine authorized school principal/teacher browser session and live First Term Exam9 marks Save→Reload→official Result Card print **NOT established**: the available browser reached the login gateway, and no real school grade writes were made. Synthetic QA is not live institutional acceptance.

## Checkpoint 3 — Fresh production backup, recovery proof and VPS constraints

- Generated **new live PostgreSQL consistent-format backup** at `2026-10-12T17:12:42Z` in root-only 0700 directory `/root/assps-release-backups/core-certification-20261012T171242Z/`. `apexos.dump` was created by read-only `pg_dump` and protected mode0600, SHA-256 checksum validated **PASS**.
- Independently inspected its `pg_restore -l` catalogue without restoring over an existing database: **1,637 TOC entries**, **368 RLS policy entries**, and protected school data tables present; created from `apexos`. New `verify-fresh-core-certification-backup-20261012.py` requires exact protected paths/modes/hash, parseable catalogue, matching policies and backup age <=24h. **PASS**. This is backup readiness, **not** evidence of a performed production rollback drill.
- VPS has `/dev/sda` provider disk **50 GB** with root `/dev/sda1` ext4 (about 48GiB formatted); root ~**91% used, 4.5GiB free**. Strict full-release storage headroom remains **HOLD** against the 6GiB readiness threshold. The unavailable provider-side 100GB expansion has not been performed. No historic backup, academic Question Bank asset, browser installation, document or other owner's worktree was deleted.
- PM2/Nginx/firewall protection remained operational; no production service restarted. Read-only fee and tenant data integrity checks remain clean. `exam_results` still **2** rows; signed PostgreSQL policies still **368** and deployed legacy `BYPASSRLS=true`.

## Exact final test matrix and remaining gates

- **26 Python unit suites / 176 of 176 tests PASS.** New tests cover dual-runtime SQL grant parity, Paper boundary exclusion, malformed/tampered live route status, strict fresh backup integrity and fail-closed release authority.
- **10 backend Node security suites / 51 of 51 tests PASS**; isolated Marks Chromium 11/11; Result Cards Chromium PASS; 16/16 blank-zero print; 6/6 protected templates; Vite build exit0.
- Integrated mission source QA **PASS**; **17 read-only gates: 12 PASS / 5 HOLD**; final `full_backend_release=HOLD`, `production_change=NONE`, intentionally nonzero exit2.
- The five remaining explicit release holds are (a) original restore's incomplete app-role grants, (b) live application-runtime 77-table signed policy absent, (c) live legacy BYPASSRLS LOGIN, (d) VPS storage headroom, (e) corresponding new live dual-runtime CRUD+signed guard readiness. The fifth is an additional independent fail-closed check of the already-unresolved live RLS migration, **not a fifth distinct infrastructure defect**.
- Separate genuine teacher/principal authenticated cross-tenant HTTP denial, positive school data workflows, live Marks Entry Save/Reload and physical printer approval, Paper Studio/Grade IX–X and Connect contract review, financial exception adjudication, pre-cutover backup and proven rollback remain prerequisites.

**Overall:** `SOURCE_AND_ISOLATED_CLONE_CERTIFIED=TRUE`; `FULL_BACKEND_PRODUCTION_RELEASE_CERTIFIED=FALSE`; `SCOPED_FIRST_TERM_MARKS_GO_UNCHANGED`; `PRODUCTION_DB_WRITES=NONE`; `PRODUCTION_SERVICE_RESTARTS=NONE`; `SCHEDULED_TASKS=NONE`.
