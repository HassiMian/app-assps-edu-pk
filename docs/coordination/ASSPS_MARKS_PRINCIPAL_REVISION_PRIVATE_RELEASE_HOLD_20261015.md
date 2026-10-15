# Principal-authorized exam marks correction — source-ready, not production-deployed

Date: 2026-10-15. Core source branch integrates live Saved Marks Review + Print and rich Daily Diary with Antigravity draft/paper changes.

## Existing live production

Public school-facing `/exams/marks/review`: View/Print active; exact index and rollback in `ASSPS_MARKS_REVIEW_PRINT_P0_20261015.md`. Existing marks API prevents replacement of previously saved marks with `409 OFFICIAL_MARKS_REVISION_REQUIRED`. Existing 1,763 marks rows, 213 real zeros must remain untouched. New correction endpoint and audit table are **NOT LIVE**, and the production frontend still routes Edit to the existing protected marks-entry screen.

## Isolated future correction workflow

* Authenticated Principal/Admin selecting an existing scored row opens a revision dialog. Original obtained mark, maximum, grade and student/subject are shown. New score and minimum 12-character reason are mandatory. No change to totals, subjects, absences, pending or excused statuses.
* New `POST /api/exams/results/:resultId/revision` is restricted to Principal/Admin; refuses teacher/service/parent/student. School ID must derive from signed actor claims. Exactly one existing school- and exam- and student-matched row is locked `FOR UPDATE`.
* Compare expected old score, denominator, and grade; reject stale/replayed corrections. Recompute new grade against that same school's persisted grade-settings policy, fail closed for missing/ambiguous policies.
* In one transaction: change ONLY matching `exam_results.marks_obtained` and `grade`; insert an immutable revision receipt with before/after, exam/student/subject, principal actor ID and reason; COMMIT. Every error rolls back. No bulk rewrite.
* Additive migration `034_exam_marks_revision_history.js` requires signed-school verifier and non-superuser, non-BYPASSRLS runtime role; enables and forces RLS on append-only audit table; grants SELECT/INSERT only to designated restricted role. Does NOT alter any existing `exam_results` rows. Never run it on live database without SaaS Core isolated-clone / tenant-cross-school evidence and official signed rollout.
* Current isolated source tests 11/11 revision logic and transaction mocking; 5/5 migration negative and RLS policy checks; existing legacy subject/grade/status tests 9/9; browser mock principal revision form flow 2/2. **These tests do not prove production RLS or independently authenticated Principal acceptance.**
* Before promotion: obtain true Core worker/signed tenant transport and independent offhost recovery receipts; test migration under genuine restricted role in isolated database; authenticated School1 Principal correction with expected old score and separately observed School2 denial; compare exact 1,763 original protected records; stage rollback procedure; release only after new backend and frontend are certified together.

## Important production accuracy boundary

Do not label the current Edit button as functioning official marks correction. The public static deployment supports live View/Print and navigates to existing marks entry, whose backend rightly refuses overwrites. The new audited mutation is staged **source-only**. Production Core security receipts and physical printer/user validation are distinct blockers; user-chat blanket approval cannot replace independent tenant-security proof.

## Independent PostgreSQL isolated rehearsal (15 October 2026, after source checkpoint)

A NEW local disposable PostgreSQL database `assps_marks_revision_isolated_20261015` was created, with exactly two synthetic schools and two synthetic result records. The Core signing function in this test is **only a controlled synthetic fixture** indexed by backend PID. It is **not a real signed Core attestation** and cannot certify production authorization.

* Migration executed twice with the existing restricted `assps_marks_signed_runtime` role; it created additive audit schema without touching original marks; `relrowsecurity=true` and `relforcerowsecurity=true` verified.
* School 101's restricted database connection could read one row, but could not read school 202's row.
* Audit INSERT under School 101 with `school_id=202` was denied by PostgreSQL RLS.
* Added database-level unique composite result key and `FOREIGN KEY (school_id,exam_result_id)`. Tampered School 101 audit referencing School 202's original result was rejected by composite FK, independently of application code. Neither change deletes existing rows.
* The **actual** staged `reviseExamScore` service ran in the restricted database role, from an active synthetic Principal, and atomically changed only School 101's recorded **0** score while appending exactly one immutable audit revision. Repeated stale edits, School 202 result ID, teacher actor, auditor UPDATE and auditor DELETE were all denied. School 202's existing score remained unmodified.
* The tightened service rechecks Principal/Admin role, `users.school_id`, and `users.is_active=true` **inside the transaction**; it runs at `REPEATABLE READ` to hold a consistent grading-policy snapshot. A deactivated synthetic Principal was independently denied before changing any record.
* Latest source-only test suites: 12/12 Principal authorization/transaction mocks, 5/5 migration policy mocks, 7/7 actual restricted-Postgres transaction/access checks, one explicit cross-school RLS denial, one composite-FK denial, one disabled-Principal denial, 2/2 browser mocks, and 5/5 active compiled frontend negative guards.
* The real separate production academic database was observed READ ONLY after this exercise: **1,763 original exam-results rows**, **213 recorded numeric zeros**, two school tenants; this is unchanged relative to the earlier snapshot. No password, child name, or school-private result row was copied into the synthetic database.

**Do not conflate this synthetic-restricted PostgreSQL rehearsal with genuine Core signer/worker/offsite recovery certification.** The official signed intake `/etc/assps/connect-login-precutover-core-receipts.json` is absent and independent authenticated Principal/School-2 live acceptance plus physical paper printing are not yet evidenced. Therefore the score-editing backend and additive migration stay source-only and the working public View/Print frontend stays live.


## Current production schema drift found by READ-ONLY probe (15 October 2026)

The active backend configuration points to local PostgreSQL database `apexos`; this is the same live data count previously reported by the Hostinger DB interface. A read-only `information_schema` probe proves **`public.exam_results.result_status` does not yet exist**, while the current `/api/exams/results` POST references `er.result_status` and INSERTs the new column. Therefore do not assert that new ABSENT/PENDING/EXCUSED writes can succeed; the full-stack Core release must reconcile the pre-existing schema migration before certifying future Marks Entry writes.

Current live table also has `marks_obtained DEFAULT 0`; this is unsafe for distinguishing an omitted score from a genuine zero. Read-only aggregate: 1,763 exam-result rows, 213 zeros, 0 NULL numeric scores, 0 negative, 0 above denominator, 0 invalid denominators, two rows with missing grade, two schools.

An **already-existing review-only additive migration** was found at `ops/release/exam9-status-20261013/001_exam_results_status_additive.sql`. It was tested exclusively in the two-school isolated PostgreSQL fixture: before/after count = 2, marks sum = 116.50 in both snapshots, default zero removed, all pre-existing scored records acquire logical `SCORED` state, no score/grade/denominator change. This does not certify its production deployment or the completeness of historical score-state metadata. Before promoting it, restore the real approved release in a secure isolated DB, reconcile actual school-adopted status definitions, test signed restricted roles and independent peer-school denial, and stage a rollback receipt. **Do not directly edit this table or apply migration on production from this Academic/feature worktree.**

The live Marks Register print is able to display existing numeric scored records without requiring the new status column; records without numeric marks are not fabricated as zeros. The print release remains stable and usable.
