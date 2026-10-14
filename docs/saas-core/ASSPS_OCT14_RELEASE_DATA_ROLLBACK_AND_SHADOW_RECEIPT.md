# ASSPS Core live data/RLS and isolated rollback receipt — 14 October 2026

Status: production academic release HOLD. Full signed app traffic and human authenticated marks workflow NOT certified.

## Live data
- Production PostgreSQL5432 apexos: First Term Exam9 school1=301 saved rows, including 36 genuine numeric zero values; all production exam results=302. **All 301 Exam9 scores currently belong to Starter Blue and Mover Purple**, not 12 active enrolled cohorts.
- Historic saved denominators: English Oral 25/42 rows; English Written 100/87; Mathematics Oral 100/42; Mathematics Written 50/87; Urdu Written 50/42; Computer 100/1. These are historic row values, NOT verified original paper maxima.
- Exam9 current offerings=81, nonnull max=0; active teacher assignment grants=0. Do not import 75 staging candidates: timetable/identity conflicts and incomplete timetable.
- Principal-designated active employee record EMP-0001 with user2373 has SaaS role teacher, not principal. School1 also has 3 active admin accounts and 1 active super_admin. Do not upgrade a role based on designation/chat instead of credential-bound school review.

## Verified recovery
- Fresh read-only live pg_dump + database role globals at /root/assps-release-backups/core-release-backup-20261014T0320Z, root-only 0600; live archive SHA256 1b615e23b1ae0a5768603a16cb23b1503d7ec18d7e1297d8c2fdb94ffdd59298.
- Independently restored production dump to **private PostgreSQL55432** database assps_core_rollback_cert_20261014, using pg_restore --no-owner --no-acl. Raw role globals archived privately but intentionally not replayed onto QA or production.
- Exact first-term result row digest before/after restore and migration reversal: a16e3f87182b2a721082f9624b98fb15; first term records301, true zeros36, students322, attendance12499, fee challans901.
- Approval/audit additive SQL migration applied to fresh restored QA only, successfully reverted with 002_disposable_rollback_rehearsal.sql. Restored original 4 approval columns ABSENT and audit table ABSENT; no retained production changes.
- The disposable rollback script checks exact **QA database name** and zero approval events before destructive DDL. Never run on production; live approval history must be preserved.

## Live signed RLS shadow
- Existing original 2026-10-13 verifier expected apexos_user BYPASSRLS to remain true, but current actual role has rolbypassrls=false. New read-only verifier verifies improved state: PASS_RESTRICTED_SHADOW_NOT_TRAFFIC; 77 green restrictive and 77 marks restrictive signed policies; active app_runtime signed policies=0, real staff HTTP not certified. Paper-owner protected catalog remains intact.
- Frontend release metadata 24cbcae3, backend 16ab8f34. Isolated Core approval candidate on 13ea84b plus safety follow-up remains separate and NOT deployed. Live approval POST still 404.
- Scoped HTTP approval tests pass with mocked identities/database, not real staff sessions.

## Release decision
Genuine actor-backed admin/teacher/peer-school HTTP, real paper maxima evidence, exact teacher role assignment source, signed mainstream runtime and actual official Save -> Reload -> OS print-window acceptance remain unmet. Keep marks publication HOLD until full live evidence exists. Do not invent approvals, impersonate staff, mutate results or force-push another agent's branch.

## Additional Core mark-grading fix

Exact teacher-authorized SCORED marks save may remain valid before official school grade bands are published; however it must NOT stamp a manufactured grade letter. In isolated backend source, POST /api/exams/results now requests only explicitly configured grade bands; when none exist it persists `grade=NULL`, preserving the real numeric score and withholding the official grade. GET grade-settings may still display defaults as unconfigured suggestions through the existing `configured=false` response. Synthetic Express HTTP source regression confirms the first authorized save has a null grade and protects replay/overwrite. This was NOT deployed to live.
