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
