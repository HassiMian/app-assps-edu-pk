# ASSPS SaaS Core — Class Eight First Term as Final Promotion Assessment
Date: 2026-10-14 (Pakistan school session 2026–27)

## Institutional academic semantics
- Exam DB `exams.id=9`, name `First Term Exam`, is the **school's First Term exam number**, NOT a Grade IX exam. The user confirms Grade IX did not sit a First Term examination. The existing current Grade IX student sections **Usman (boys; 9 students)** and **Fatima (girls; 7 students)** have **zero** Exam9 results.
- Class Eight Blue cohort (11 students) will use its existing First Term results as the **final promotion assessment for Class Eight only**, subsequently progress to **Pre-Nine** (NOT directly into Nine). Never rename global exam9 and never assign Exam9 marks to Grade IX.
- **Promotion is AFTER Class Eight result cards are actually printed** and checked. Print-window invocation, preview or chat authorization does not count as authenticated print completion. No student moved today. Grade VIII scheduled Science and Quran/Nazra scores remain missing; none is converted to a true numeric zero.
- Per-paper pass mark is 40%; policy does not auto-promote a pupil with an F/absent result. Principal's individual academic decisions and per-subject approved maxima are still required.

## Latest live verification
- School1 Exam9 latest snapshot **1762 result entries, 213 real scored zeros** at this checkpoint. School1 Eight Blue: **11 active students**, **55 entered marks across 5 subjects**. Active Pre-Nine students **0**. Teacher-class marks grants **0**. Historical First Term marks/fees/attendance untouched.
- Grade IX original timetable **8 Usman + 8 Fatima periods**; total reference calendar **58 rows** =56 class periods + Assembly+25-min break. Grade IX timetable is a planned teaching timetable, never evidence of sitting First Term.
- 56 staff/scheduled-subject metadata entries exist; 7 unresolved and 6 provisional employee-name matches. No teacher permissions inferred.

## Persisted promotion state (SAFE)
- Production `school_class_promotion_plans` row: school1/exam9/Eight Blue -> Pre-Nine, status `AWAITING_RESULTS_AND_PRINT`, 40% pass, 11 students/7 expected subjects; target section unset, print verification NULL, institution actor approval NULL, snapshot hash NULL, executed_at NULL. App Core signed-role SELECT-only RLS. No self-approval endpoint or implicit grade changes.
- New **Class Eight print gate** is a real PostgreSQL BEFORE UPDATE OF class trigger on school1 current Eight/Blue cohort. It rejects moves to Pre-Nine and direct Nine before a printed result-card batch SHA, true signed academic approval and destination section are recorded. Also blocks school ID mutation for current source cohort. This ensures the older generic bulk student-moving endpoint cannot directly move the planned cohort early.
- Trigger is idempotence guarded during installation: exact school1 pending-plan and 11 Eight/Blue active student preconditions. Audit source and **root-only consistent PostgreSQL archive** `/root/assps-release-backups/eight-to-pre-nine-plan-20261014T1020Z/` checked for SHA. No destructive SQL executed against production.
- First staged trigger had a QA bug: normalization removed capital letters before lowering, therefore Pre-Nine update passed. It was corrected, QA trigger fully dropped/reinstalled, then **three actual QA mutation tests passed**: premature Pre-Nine denied; direct Nine denied; school-scope move denied. None of the attempted updates persisted. Only the corrected version was installed in production.

## Read-only SaaS readiness
- Owner-only signed GET `/api/academic-promotions/eight-to-pre-nine/preflight` is available on isolated Core candidate **9d93c3a8acf1550a5bc9d4bba196b3abc45e1597**, loopback5097, PM2 `assps-promotion-preflight-green-5097`. Returns counts and holds, not pupil PII, edits or promotion.
- Admin `https://app.assps.edu.pk/timetable/regular` now shows school timetable, authenticated staff departments/subjects, and Class Eight → Pre-Nine readiness state. Original source 2024–25 label retained for lower classes; Grade IX timetable sourced from 2026–27 original word file. Viewer JWT must exist; no fake credential use.
- Live HTTPS: app200, viewer200, anonymous signed promo API401, staff API401, timetable API401, existing admin approval route unaffected. Actual live Nginx scoped rollback **old promo route404 -> re-promoted401**, main app200. Current frontend/backend main artifact SHAs unchanged; Paper Studio/APEX Connect ownership respected.
- **35/35 focused Express HTTP/source regressions PASS**, isolated Chromium (synthetic JWT) seven-class/56 lessons + 25-min break + Class VIII promotion HOLD panel/print invocation PASS. Genuine staff browser login, full exam result-card print and authenticated cross-school HTTP are NOT certified.

## Non-negotiable future promotion workflow
1. Complete/reconcile Class VIII Science and Quran/Nazra (or record institutionally approved exceptions), exact 7 subject maxima, actual 40%-passing/grading and individual below-pass review. Distinguish blank/absent from numerical 0.
2. Verify each of the 11 **original Class Eight Blue** result cards, invoke the genuine full-class browser print, print physical copies, and have school operator authenticate batch print completion with exact batch hash/actor/UTC time.
3. Independently **snapshot the original class/section exam cohort and exam9 results** with immutable student_id/result_id evidence. Existing report-card listings join current students.class; moving students before this snapshot risks disappearance of historical Class Eight lists.
4. Authenticate school Principal/admin, approve per-student advancement decisions; choose Pre-Nine section and complete separate teacher/room assignments.
5. Update ONLY approved school1 Eight Blue student rows transactionally, using student_class_movement_audit, safe expected old class/section, reliable rollback plan and idempotency. Existing Grade IX current students untouched; no rewrite of any exam result.
6. Production browser verify new Pre-Nine roster and historical Eight printed results, fees, attendance and tenant scopes; keep original question Paper Studio ownership intact.

No scheduled background task is created. Full examination publication and student promotion remain HOLD until the above actual school evidence exists.
