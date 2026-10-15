# ASSPS Marks Review, Correction & Printable Register — P0 Production Mission

Date: 15 October 2026. School: AL SIDDIQUE SCHOLARS PUBLIC SCHOOL. Production application: https://app.assps.edu.pk

## Delivered live — frontend-only, non-destructive

* URL: `/exams/marks/review` under Examinations → **View & Print Marks** (also compatible `/examination/marks/review`).
* Authenticated existing exam and result endpoints, including exact `exam_ids` filter. No new school-wide unrestricted API, direct database query, or new privileges.
* Exam/class/section/subject/student filters, matrix of saved subjects, school branding, print preview and A4 landscape paper.
* Zero and blank are separate. A saved 0 remains **0**; `ABSENT`, `PENDING`, `EXCUSED` and missing rows must never be fabricated as zero.
* Per-student Edit action links to existing Marks Entry preselected by exam/class/subject; **does not silently modify saved scores**.
* Existing backend intentionally returns `409 OFFICIAL_MARKS_REVISION_REQUIRED` for a changed saved score. An authenticated principal audit/revision API is **NOT implemented in production**. Therefore true revision-specific marks edits are still pending; the displayed Edit affordance is navigation to the protected correction workflow, not an unrestricted update.
* Permission reused: academicStaff + `exams_marks` guarded route and server-side `canReadResults`, tenant clause and teacher read scope. Test mock rejects HTTP 403, no rows and Print disabled.

## Exact production cutover

* Baseline public Diary root: `/var/www/assps-diary-p0-only-49f6a6a1`, index SHA256 `8961fcebb3e022ca320c03d6f6cff834e1f732bf4b2a3d426cbbd9d955462f90`.
* New live root: `/var/www/assps-marks-register-p0-4ce2c5e3`, index SHA256 `aa29d4980a73d085a64c02ad14edd0d189531f5c727cc66ab49237bf1f9090c1`.
* Existing 414/414 static assets preserved byte-identically (apart from index); 67 new content-addressed assets added.
* Required active Diary controller graph **11/11 PASS**; new MarksRegister dynamically reachable from active router.
* Browser tests **2/2 PASS** for zero, absent, matrix, print popup, edit navigation and authorization rejection. Browser mocks/synthetic, **not** a real teacher login or actual paper-sheet acceptance.
* Live frontend and API health HTTP 200; public MarksRegister JS/CSS HTTP 200; anonymous /api/auth/me, /api/exams and /api/exams/results all HTTP 401. Nginx syntax PASS.
* No backend/DB/migration writes, school marks corrections or academic approval changes made by frontend static deployment.
* Deploy script `ops/release/marks-register-static-only-20261015.sh`: exact-hash, owner-locked, backup, atomic Nginx switch, public SHA parity and automatic error rollback.
* Backout script `ops/release/rollback-marks-register-static-only-20261015.sh`: exact SHA and config lock; dry-run verified.
* Existing 1,763 live exam result rows (of which 213 zero values) were observed read-only across school tenants, **not** an approval for mutation.

## Required audited correction architecture (separate backend release)

1. Authenticated school principal/admin correction request identifies one exact immutable `exam_results.id`, exam ID, student ID, subject, old score/grade/denominator and submitted proposed score plus mandatory reason.
2. Server locks one tenant-scoped result and school/student/exam identity, validates role, authenticated tenant, approved denominator and grade setup, and compares the user's exact old value. Reject cross-school, teacher edits, stale revisions, wrong subject, absent/blank-to-zero coercion and duplicate submissions.
3. Append immutable school-specific audit revision with actor ID, reason, timestamp and old/new values **in the same transaction** as the score update. Reject if audit history table/migration or authorized DB role is unavailable. Do not modify any other student's marks.
4. Reopen and recalculate result cards from the authoritative server result. Preserve all historical marks and receipts, independent tenant RLS checks, a tested rollback, and second-user teacher validation before controlled backend promotion.
5. Do not call a subject edit approved or live merely because the frontend Edit button exists; separate this correction gate from academics Question Bank source/reviewer approval.

## Remaining acceptance

Actual authorized school login → open saved marks for each needed class → verify totals and all subject statuses → browser Print → physical A4 sheet on RICOH MP C307 must be confirmed by the school. Full SaaS Core and APEX Connect signed worker/security gates remain independent and held.
