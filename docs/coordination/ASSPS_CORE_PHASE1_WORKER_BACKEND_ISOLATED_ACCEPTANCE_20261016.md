# ASSPS SaaS Core — Phase 1 backend security integration, isolated acceptance

Date: 16 October 2026 (PKT). **Status: SOURCE + ISOLATED QA ACCEPTED; PRODUCTION TRANSPORT NOT CERTIFIED.**

## Exact release lineage and isolation

- Reviewed latest combined owner-accepted postflight source: `qa/core-owner-five-route-postflight-20261016@418d4cc02e465ee27449675d97bb165a2d82ac05` (contains Result Cards V3, Diary protection, Marks auth routing, Lesson Planner V5, Early Years, Employees repair and Urdu QA). Other concurrent Core unattended-monitor branch is not silently overwritten.
- Running frontend remains `/var/www/assps-resultcards-owner-accepted-20261016`, HTML SHA256 `760b232b493c300fe78908704aef4989c24c25028faac1821dd41f6480210f3c`.
- Root-private backend candidate: `/root/assps-release-candidates/assps-phase1-worker-418d4cc0-20261016/src/`, staged by copying actual current production backend source while explicitly excluding `.env`, private keys and node_modules; then overlaying **only five byte-for-byte reviewed** source files:
  1. `src/services/ai/aiQueueWorkerDatabase.js` (new dedicated isolated PG worker adapter)
  2. `src/services/ai/paperAiQueue.js` (scoped queue query caller)
  3. `src/routes/opsRoutes.js` (queue diagnostics caller)
  4. `src/services/lessonPlanningPublicationGuard.js` (unapproved academic source lock)
  5. `src/routes/lessonPlanRoutes.js` (revision/source publication update/delete protection)
- All five staged files **exactly matched reviewed source**; Node syntax check of all five PASS; staged `require()` loading Lesson and Ops Express routes PASS. Evidence manifest SHA256 `9590f532e6bc252acd6e4dbc0ab6bc71d10669eca185e7f686c84d9f8ba20b1f` at private `phase1-evidence.json` (no credentials included).

## Executed tests, with precise scope

- Reviewed Lesson publication guard and isolated mock HTTP: **13/13 PASS**, including source-lock updates, revision mismatch, fake peer school and teacher denial. Mock HTTP is NOT actual production actor proof.
- Reviewed worker config separation + Green lazy-import: **5/5 + 2/2 PASS** from earlier Core mission; synthetic signed envelope and tenant intersection 15/15 PASS separately.
- Built independent local-only PostgreSQL 16 QA cluster at **port 55477**, synthetic tables only; production port 5432 and signed-shadow port 55432 untouched. Created dedicated **QA OS worker identity**, matched PG login and non-login worker group, queue-only ACL; actual Unix-domain PostgreSQL peer-authenticated process showed `current_user=session_user=assps_core_qa_ai_login` and dedicated role membership. Executed reviewed `aiQueueWorkerDatabase.js` under that OS identity with QA-only configuration and actually obtained the same worker identity through its live query/pool validation (real end-to-end module acceptance in **QA only**).
- Synthetic queue INSERT inside PostgreSQL transaction succeeded and was **ROLLED BACK**. Access to QA students table correctly failed with `permission denied`. This is isolated database proof, NOT actual production signed/School2 HTTP acceptance.
- Disposable PostgreSQL QA process was **stopped after testing**; retained synthetic QA files offline for audit, no public port/service or production data mutation. QA-only account and private evidence remain isolated.

## Mandatory production boundary

- Live `/var/www/apex-backend/src/services/ai/aiQueueWorkerDatabase.js` and `/var/www/apex-backend/src/services/lessonPlanningPublicationGuard.js` remain absent; source staging does not pretend installation.
- Core Ed25519 independent receipt intake `/etc/assps/connect-login-precutover-core-receipts.json` remains absent; official Core verifier remains **HOLD / 7 of 13 PASS**. Owner's printer/academic institutional acceptance is unrelated to independent security signatures.
- No frontend/backend public cutover, PM2 restart, Nginx change, database migration, privileged SQL alteration or original marks edit occurred during this Phase 1 isolated staging.
- Production promotion requires verified running backend worker config (real restricted identity, signed transport flags, actual worker SQL role grants), reviewed backend publication guard and route parity, authenticated independent tenant/subject denial, signed off-host recovery and successful official gate; with exact source ancestry, original-source backups, rollback and postflight evidence.

**Do not run `--apply` or change existing service source based only on this QA receipt.** Protect historical exam results/real zero-versus-pending marks and owner-accepted Diary/Result Cards/Employees UI through final cutover.
