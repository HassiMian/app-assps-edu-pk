# Examination r5 controlled release handoff — 2026-10-01

## Current state / release identity
- Source integration: `2e144ab9e6d4096fbd6202b88e291da18367939a` (grade per selected subject threshold, incomplete-result block; prior passing percentage implementation `ce344d0`).
- Source-controlled r5 frontend metadata checkpoint: `43617a9`.
- The production website is **STILL r3** (release commit `594f6951d56d123d5db6ae05035b4e8e1d476482`), confirmed again via public release-meta GET. Public API /health returned ok.
- Backend production files were NOT swapped, PM2 was NOT restarted, frontend directory was NOT switched. DB additive migration was NOT executed.
- An attempted production new-config copy was blocked by the execution safety check. Do not use alternate commands to bypass the safety gate; resume only through an authorized deployment route.

## Test gate before staging
- Backend 6/6 pass, combined Examination/Result Cards/Paper Editor V13 40/40 pass, npm production:safety pass, Vite production build pass.
- Incomplete/missing/blank/duplicate subject, section mismatch, total mismatch and passing percentage mismatch block final card printing.
- Per paper percentage is selectable, 33% default (NOT fixed), pass is ceil(total * selected percentage / 100).
- Numeric zero is a genuine obtained mark, not missing.
- No production fake students/marks/results were created.

## Verified archive identity
- Windows frontend: `%TEMP%\\assps-examination-r5-43617a9-frontend.tar`
  SHA256 `5dcfb1e41e0d86b9da9761dfbfcd79a795c8671e1eb4e328e210e419179b4269` (4,368,896 bytes).
- Windows backend: `%TEMP%\\assps-examination-r5-43617a9-backend.tar`
  SHA256 `fa6cdc4d1bef3c91df5cfc535052ae162f43aa8d07a802f5e6bec5394e44bfeb` (33,280 bytes).
- VPS tarfiles uploaded to `/tmp/` with same filenames and byte-for-byte matching SHA256:
  `/tmp/assps-examination-r5-43617a9-frontend.tar`,
  `/tmp/assps-examination-r5-43617a9-backend.tar`.
- VPS archives extracted to `/tmp/assps-r5-stage/frontend` and `/tmp/assps-r5-stage/backend`. Node syntax checks for all backend packaged files PASS (`R5_STAGE_SYNTAX_OK`).
- Backend tar includes ONLY:
  `routes/examRoutes.js`;
  `config/firstTermMarksPolicy.js`;
  `config/migrate_exam_passing_percentage_v1.js`.
- Staged backend route SHA256 `f929aba81134295af87f62925b80c1d6dec3af805bd3c8ad346c1b9288073e4b`.
- Staged backend policy SHA256 `e064e3bb9cdacd85e5428cc79e38f44dbe508589a988e02a640c40b8f7be0cce`.

## Existing live backup (DO NOT DELETE)
- Complete r3 frontend backup: `/var/www/apex-os.bak-r5-43617a9` (r3 release-meta verified).
- Backend mirror backups:
  `/var/www/apex-backend/routes/examRoutes.js.bak-r5-43617a9`;
  `/var/www/apex-backend/src/routes/examRoutes.js.bak-r5-43617a9`.
- Both backup backend route files SHA256 `5f2e4efdd5af92c457199e182c70f7ef7f5484ff7ca884435acc41dc848be397`, matching live r3 route before work.
- One *new, non-executed* migration-script file was copied from staging to `/var/www/apex-backend/src/config/migrate_exam_passing_percentage_v1.js`. No old files overwritten by this step.
- Production env previously verified `NODE_ENV=production`, `AUTO_MIGRATE_ON_BOOT=false`.

## Read-only baseline BEFORE mutation
Run `node /tmp/assps_r5_readonly_audit.js` from approved authorized terminal. Script uses only SELECT and was hash verified both sides:
`2bc16f8349270059eeaeae059e010890b373f44ace21a55cca58cff9713460f4`.
Baseline output:
EXAM9=1, ENROLLMENTS=12, SUBJECTS=81, TOTAL_SET=0, PASS_SET=0, RESULTS=0, NINE=0, OCT04=0, PASS_PERCENT_COL=0.

## Safe remaining order — DO NOT run partial deployment
1. Re-verify live r3, both backups, stage hashes, health and current DB read-only baseline.
2. Through an approved deployment route, add staged new `firstTermMarksPolicy.js` in BOTH root `/var/www/apex-backend/config/` and `/var/www/apex-backend/src/config/`; ensure migration script in src/config is intact.
3. Execute ONLY additive, idempotent `node /var/www/apex-backend/src/config/migrate_exam_passing_percentage_v1.js`. Expect `EXAM_PASS_PERCENTAGE_V1_MIGRATION_OK`. It adds nullable `exam_subjects.pass_percentage NUMERIC(5,2)` only; do NOT rerun old V1 migration or guess actual paper totals.
4. Validate `PASS_PERCENT_COL=1` and remaining DB counts unchanged; then overlay the single staged `routes/examRoutes.js` into BOTH `/var/www/apex-backend/routes/` and `/var/www/apex-backend/src/routes/`. Verify both SHA256 match stage and `node -c`. Restart only PM2 app `apex-backend` and verify health; `apex-connect` must stay untouched.
5. Frontend: COPY current live directory to a new r5 stage, then overlay ONLY reviewed extracted r5 dist files; preserve existing hashed asset files for open sessions. Never broadly replace application/backend folders via ops/deploy-production.ps1 Apply. Swap frontend safely keeping old directory `/var/www/apex-os.prev-r5-43617a9` for rollback. Check Nginx config and public release-meta=r5.
6. Post-release verify DB invariants above (only `PASS_PERCENT_COL` should change 0 -> 1 until real marks arrive), live canonical First Term Exam 9, 75-paper matrix, One Yellow roster 38, Passing Percentage editable and default 33%, Result Cards zero-results state. NO fake production obtained marks.
7. Real Save -> Reload -> Result Cards acceptance must wait for an actual student mark and verified printed-paper total; do not invent paper total.

## Rollback
Old frontend directory and route copies are preserved with names above. If health or frontend checks fail, restore their original route contents, restart only apex-backend, restore frontend from r3 backup. The additive nullable column can remain harmlessly in DB; do not drop it or alter any results on rollback.

## Security
No credentials, user records, student names, production result data or secrets are included here.
