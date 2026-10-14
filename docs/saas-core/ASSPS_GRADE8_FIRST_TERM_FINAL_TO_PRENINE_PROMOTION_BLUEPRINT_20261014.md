# ASSPS School-Specific Grade Eight → Pre-Nine Promotion Rule — 14 Oct 2026

## Binding institutional decision

The user has explicitly decided that AL SIDDIQUE SCHOLARS PUBLIC SCHOOL school_id=1, session2026-27 **did not conduct Class IX's First Term examination**. Existing Exam9 `First Term Exam` (exam ID 9) is the 2026-27 First Term exam for enrolled grades **up to Eight**. Do not label Exam9 as a Class IX exam just because its DB identity number is 9.

**Class Eight Blue First Term Exam9 is to serve as its FINAL assessment for the forthcoming Class Eight → Pre-Nine promotion only.** Do NOT rename Exam9 globally, change `exams.name` or `exams.type`, publish results for other classes as final, or reinterpret any current Class IX scores. School1 has **Nine Usman9 students and Nine Fatima7 students**, whose Exam9 marks count is **0**, and these current IX cohorts are separate from the future Pre-Nine batch.

**No promotion before printing:** The existing Class Eight Blue 11 active student cohort remains in Eight. Grade VIII First Term Result Cards must be generated, reviewed and **actually printed**, a signed human staff reviewer must confirm the printed set, and institutionally reviewed graduation decisions must be recorded before any student update. Pressing Print or displaying preview does **not** by itself prove printed pages. Target section is not specified and must be selected later, never silently assigned.

## Live baseline

At policy planning on 14 Oct, the school1 Class Eight Blue cohort comprised 11 active students. Exam9 offered 7 subjects: Computer, English, Islamiyat, Mathematics, Quran / Nazra, Science, Urdu. **55 saved score rows** (11 students × five papers); **Science and Quran/Nazra absent** (never convert missing scores to numeric 0). A small number of actual paper scores are below 40% and require academic review; do not silently promote all/declare a student failed based on an invented general promotion formula. The schoolwide approved passing threshold is 40% per paper. Official exam_subjects paper maxima are still source-approval-pending; historical saved 50/60/75 denominators must not be overwritten to force compatibility.

## Persisted plan (non-executing)

Additive table `school_class_promotion_plans` was applied only for school1, source exam9, Eight/Blue → Pre-Nine, `passing_percentage=40`, `baseline_student_count=11`, `expected_subject_count=7`, `exam_purpose_for_source_class='FINAL_TERM_EQUIVALENT_FOR_PROMOTION'`. Initial status `AWAITING_RESULTS_AND_PRINT`. Print evidence hash/date/verified actor, academic approval actor/date, chosen destination section and executed_at all **NULL**. All student rows, class records and marks untouched. School tenant SELECT restricted by signed RLS, no application write privilege granted. No fake principal JWT or school approval was produced.

Preflight read-only signed admin route `GET /api/academic-promotions/eight-to-pre-nine/preflight` checks current student count, seven scheduled offering mark completeness, per-paper below-40% counts and invalid marks, approved subject maximum, printed result-card evidence, principal review, destination section and roster stability. Blocks when ANY gate missing. It is NOT a promotion endpoint. School-specific signed JWT and admin role required, other school IDs isolated; no student personally identifying data in response.

## End-to-end release architecture AFTER cards are printed

1. **Freeze marks by scoped roster** only after subject-wise reconciliation: seven papers per active student or explicit approved exception. Do not create fake Science/Quran zeros. Source papers and approved maxima must match score totals. Keep 40% per-subject standard, with documented handling of any below-threshold results by school authority.
2. **Result Card print batch**: actual full 11-card preview/print window, operator confirmation printed successfully, immutable batch hash, printed_at and genuine approved actor. Print UI invocation alone cannot certify physical printing. Preserve Urdu/print formatting, Paper Studio ownership.
3. **Immutable pre-movement exam cohort snapshot** for Eight Blue: school1 Exam9 result IDs, student IDs, original class+section, paper maxima, approved grades and print batch evidence. This is critical because current `exam_results` references `student_id`, whereas result-card listing often joins the student's CURRENT class. Moving the student before protecting historical class scope may make old Class Eight Result Cards hard to retrieve or misclassified.
4. **Individual promotion eligibility decisions** after academic review; documented holds for F grades/absent results; choose target Pre-Nine section (no assumed Blue). Sign school decision via existing active authorized Principal/admin session, never forge approval.
5. **Transactionally promote approved selected students** using safeguarded `student_class_movement_audit` on the live `students` table, with row-level current-class/section precondition and idempotency. Do not touch already enrolled Class IX students; do not change old Exam9 result rows. Secure cross-tenant and rollback testing.
6. **Verify** Pre-Nine roster, historical Eight Exam9 result-card accessibility, attendance/fee continuity, staff timetable and room allocations, permitted new teacher subjects and APEX Connect visibility. Preserve Paper Studio independent ownership.
7. **Never backdate** this transition or mark printed/authorized before an actual signed print batch and human review.

## Tests and evidence

- Additive migration protected by exact exam9 identity, active Eight Blue roster, 7 scheduled offerings, school1 approved F grade 0–39 and no pre-existing plan table; applied on disposable QA Pg55432, rolled back with a QA database-name locked script and reapplied. All 11 students untouched.
- School-specific schema creation applied to live PostgreSQL after a protected root-only consistent backup at `/root/assps-release-backups/eight-to-pre-nine-plan-20261014T1020Z`. Production verified 11 Eight Blue and zero Pre-Nine transfers.
- Isolated Express HTTP preflight tests: verified synthetic admin sees missing papers+print HOLD, missing auth401, teacher403, school2 cannot read school1, forged ready status cannot bypass missing papers/maxima, DB outage503. No fake staff sessions.
- Timetable source branch `feat/core-regular-timetable-20261014` continues to own registered schedules, employee subjects only as reference. Actual Class IX timetable is entirely independent of the current Class VIII final promotion assessment.

**Production result publication and cohort movement remain HOLD until genuine printing + approval gates.**
