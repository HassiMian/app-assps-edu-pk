# ASSPS Class Eight historic cohort preservation & signed preflight

Verified 2026-10-14 ~12:10 UTC. Continues coordination issue #4 and previous Class Eight promotion hold.

## Actual live change
- New `public.school_class_promotion_source_roster` table captures only source school1, exam9, Class Eight Blue **11 original student IDs** before any Pre-Nine promotion.
- This is an original **membership** snapshot, NOT a completed exam score snapshot, approved result-card print batch, or Principal signature. Rows include plan ID, original class/section, exam ID and capture time; NO scores, passwords, printer output, student names, promotion event or approval artifacts created.
- Production SQL identity count: 11 frozen distinct, 11 still active Eight Blue, 0 Pre-Nine, **55 existing Exam9 result IDs join through the frozen membership**. Future result-card history can join the preserved cohort after current students.class changes, rather than only filtering today's class.
- Tenant RLS ENABLED; signed restricted core app SELECT permitted and legacy apex_app_runtime SELECT denied, no public grants, no application writes. Does not increment existing hardcoded 77 FORCE-protected table check.
- Separate private full database and globals backup SHA checked at `/root/assps-release-backups/class8-historical-roster-snapshot-20261014T1210Z`. QA Pg55432 applied 11, rolled back/drop table with DB-specific gate, and reapplied successfully before live transaction.
- Production marks, Grade IX and timetable, staff subjects, attendance/fees untouched. Status school1 promotion still `AWAITING_RESULTS_AND_PRINT`. Live population unchanged.

## Preflight revision
- Signed admin-only read-only `/api/academic-promotions/eight-to-pre-nine/preflight` now verifies the **same exact 11 original student IDs remain in source class**. Merely having a new 11-student Class Eight roster is insufficient if someone replaced one of the source students.
- API returns **counts only**: frozenOriginalCohortCount, historicalLinkedScoreCount, originalCohortPreserved; never exposes student names/IDs to the browser.
- Fails closed with `HISTORICAL_CLASS_EIGHT_ROSTER_NOT_VERIFIED` if original cohort is incomplete/changed. Does not make incomplete Science/Quran scores pass, and does not certify physical result-card printing.
- Isolated backend suite **36/36 PASS**, including mismatched source cohort, signed-role test fixtures and peer-school denial; Chromium fixture checks Seven class/section teaching tables, admin-only employee list, restored original cohort display, promotion HOLD and print window command without physical printing.
- Independent original result-card publication and future immutable **completed-score** batch hash remain Paper Studio / authorized school-operator dependencies. No genuine teacher login performed or impersonated.

## Production deployment status
Snapshot table LIVE. Full service revision deployment to current signed canary requires separately verified immutable source, green runtime health, narrow Nginx routing, rollback and live HTTP smoke; this document alone is NOT proof.
