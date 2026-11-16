# A315 — Academic Integrity & Result Cards Source Recovery
Date: 16 November 2026. Release disposition: ACADEMIC HOLD.

## Production monitoring correction

The Nginx live static root is /var/www/assps-releases/assps-diary-a208-word-narrow-margins-20261109.
The index dynamically imports four route-specific index JS shells from ASSPS-PAPER-REVISION-SAFE-BOOT-20261031.js, with 12 asset import-map overrides.
The October 15 monitoring guards expected a single direct index JS script, which created false negatives for Diary and Marks.

A315 installed only new read-only verifier code in /usr/local/libexec/assps-technical-self-verification.
The deployed main verifier was backed up before this change and source checksum verified.
The active academic guard follows the bootstrap, four selected shell bundles, import maps,
component JS/CSS and exact feature signals. It rejects missing/ambiguous assets, symlinks
and remote import maps. The updated existing systemd verification service returned CRITICAL,
as designed: Diary and Marks source checks PASS, Result Cards FAIL, subject maximum inconsistency
and Grade IX–X evidence still FAIL. No new timer was created.

The current dropdown contains ten selector template IDs, but only nine of the ten legacy
premium-contract IDs. The Result Cards print/roster audit still lacks nine legacy
source markers. Counting dropdown options is not adequate release certification.

## School 1 First Term Exam 9 historical data

Protected Oct19 baseline: 1,853 result rows and 224 zero marks.
Live Nov16: 1,854 rows and 213 zero marks. Result hash differs; exam metadata unchanged.
Verified changes since baseline: 1 inserted Starter-Blue English Oral score (45/50);
74 modified existing rows: 11 Mover zeros became positive, 62 total-marks changes,
65 stored grade changes. No real student data was modified in this mission.

Starter-Blue 45/50 entry belongs to student admitted 19 October, after examination
end 10 October, and entered 21 October. There is only one subject row for that student.
Other 45 Starter Blue English Oral records have a maximum of 25. Requires authorized
adjudication; no automatic conversion/deletion or rebaselining.

The current-class completeness audit reports 205 missing subjects and 91 unmapped
result rows. Historical class movement shows eleven Eight->Pre Nine students (66
historical recorded subjects), one One->Flyer student (five recorded subjects).
Read-only movement-based cohort diagnostic, excluding the one post-exam admission,
recounts 1,853 results, 193 missing subjects and 20 unmapped. This is a candidate
diagnostic, not signed proof of every historical cohort.

## Subject grade policy and frontend source parity

Official school 1 grade bands: A+ 90-100, A 80-89, B 70-79, C 60-69,
D 40-59, F 0-39. Live exam9 has 52 subject scores in the 40-49 interval.
There are 97 saved grade labels disagreeing with current bands, grouped by
Starter34 Mover34 Flyer24 Six4 One1. Do not auto-edit these historical grades.

Git main resultCardTemplates.jsx has six incorrect bitwise OR fallback expressions.
A synthetic First Term 20/25 sample becomes 0/125. The deployed minified Result
Cards JS already has correct nullish fallbacks, so blindly rebuilding Git main
would undo a fix. A315 restored the correct source fallbacks in a review branch,
added a tenant-specific gradePolicy module, and retrieves grade bands from the
existing protected /api/exams/grade-settings endpoint.
The source candidate refuses printing if grade policy missing, grade labels stale,
or score totals invalid. The live frontend was NOT redeployed.

Twenty-two pure frontend regression tests PASS. Eleven dynamic graph/monitoring
tests PASS. Vite production build PASS. Nine pre-existing ESLint errors remain
the same on original main and on A315; no new lint rule violations observed.
The reconstructed marks and grade policy are preview/source tests, not live
authenticated principal browser certification.

## Source and evidence commands

Use the Node test runner on the two gradePolicy and resultCardTermValues test
files in al-siddique-frontend/src/Modules/examination/tests. The two graph
test files in ops/a315 require A315_LIVE_ROOT pointing to a mounted four-shell
frontend release. Their default is the current mounted VPS release.

A read-only readiness SQL script is in ops/a315/academic-release-readiness.sql.
The read-only historical class correction diagnostic is in
ops/a315/historical-cohort-diagnostic.sql. Neither modifies school data.
Run using authorized PostgreSQL SELECT-only access.

## Required human closure

Principal/faculty must authenticate and authorize historical corrections,
decide the post-exam admission policy, resolve 97 conflicting saved grades and
mixed maximum, validate Result Cards print safeguards and verified template
requirements, and obtain independent source/answer provenance for nine
approved Grade IX Biology seed questions. No automatic academic signoff.

Overall academic certification remains HOLD. No marks edits, baseline update,
principal impersonation, app restart, frontend deployment or new schedule occurred.
