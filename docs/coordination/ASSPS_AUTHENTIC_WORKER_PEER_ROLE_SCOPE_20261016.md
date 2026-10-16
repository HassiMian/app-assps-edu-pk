# ASSPS Core — real restricted AI worker Unix peer-auth and full ACL scope proof (16 Oct 2026)

This is a **read-only** backend release prerequisite, not a live signed transport or production deployment. No Principal password, tenant key, signer certificate, academic approval, student row, real printer job or backend restart is required.

## Canonical source / ownership
- Exact clean upstream SaaS Core source `audit/core-unsigned-rls-matrix-20261016@017d51060349e39150ebd508d0d670c10eb15f5f`.
- Separate isolated audit branch contains only the new standalone `ops/release/worker-probe/verify_worker_peer_scope_20261016.py`, hermetic tests, CI and this evidence file; other agents' active worktrees protected.
- Reviewed source adapter `al-siddique-backend/src/services/ai/aiQueueWorkerDatabase.js` and **previously installed private one-shot** `/usr/local/lib/assps-phase1-worker-probe/aiQueueWorkerDatabase.js` SHA256 both `97090fee75c77283375141e21d572d52a1a9fe58952ff16a4584ca9f308592cc`. Live active backend `/var/www/apex-backend/src/services/ai/aiQueueWorkerDatabase.js` is **ABSENT**. The one-shot private probe is not proof of signed persistent production integration.

## New genuine live evidence, no database modifications
- Actual direct `runuser -u assps_ai_worker_login -- psql -h /var/run/postgresql -p 5432 -d apexos`, not postgres-superuser impersonation and no supplied password; authenticated PostgreSQL `session_user=current_user=assps_ai_worker_login`. Mandatory `default_transaction_read_only=on`, 8-second statement timeouts, role checks.
- Authenticated worker login is a non-superuser, non-BYPASSRLS, LOGIN role and **inherits only** `assps_core_ai_worker`. No `apex_app_runtime` or tenant runtime membership.
- Actual **all non-system PostgreSQL schemas and tables/views/foreign tables/materialized views** access scan returned only:
  - `public.ai_jobs`: SELECT INSERT UPDATE DELETE
  - `public.ai_queue_events`: SELECT INSERT DELETE
  - `public.ai_queue_state`: SELECT INSERT UPDATE
- Actual all non-system sequence scan returned only `public.ai_queue_events_id_seq`: USAGE, **no SELECT or UPDATE**.
- Five sensitive-table **actual SQL SELECT** statements were independently rejected with PostgreSQL SQLSTATE `42501`: `students`, `exam_results`, `organizations`, `campuses`, `admin_block_audit_log`. These are `SELECT 1 ... LIMIT 0` queries and do not read PII.
- New source-based read-only verifier: `PEER_WORKER_SCOPE_PASS_NOT_RELEASE`, denies extra inherited role, extra view/table/sequence rights, privileged actor, missing queue ACL, absent signed SQL denials.
- Fail-closed hermetic unit tests **14/14 PASS**. CI only runs unit logic; never accesses production DB.

## Protected release boundary
- **Independent authenticated worker peer database connection has been demonstrated**, but **production app worker adapter is not installed**, a truly reviewed *signed persistent worker transport* is absent, and independently signed worker/School2/offhost-recovery receipts remain mandatory.
- Latest genuine official Connect 4-phase gate (rerun in this mission) returned **exit2 / HOLD 6/13** with seven unmet release checks; signing cannot be self-forged or backfilled by this security script.
- Read-only verifier always emits `releaseAuthorized=false`, `signedWorkerTransportCertified=false`, `signedIndependentSchool2Certified=false`, and `productionChanged=false` even on PASS.
- No changes to Nginx, PM2, original worker unit, PostgreSQL roles/grants, public Next, students, results or academic content.
