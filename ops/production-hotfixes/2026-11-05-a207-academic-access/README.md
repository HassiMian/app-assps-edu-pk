# ASSPS A207 — Academic Authorizations, Marks Review, Regression Evidence

## Two confirmed production issues

**1. Pre Nine classroom identity:** The Academic Setup/student roster names the cohort `Pre Nine`, but timetable and teacher-assignment DB records store `Pre-Nine` (hyphenated). Contrary to an exact-name-only A206 summary, **eight active Pre-Nine Blue subject assignments already exist**, spread over **seven active teacher accounts**. The backend's existing `academicClassKey.js` safely normalizes only the hyphenated spelling and matches 12 Pre Nine students, without granting access to 15 Grade Nine students. Do not create fake or duplicate teacher assignments, and do not rewrite teacher records merely to change spelling. A206's frontend fix is required for the `Pre Nine` exact API filters. Actual authenticated Teacher acceptance remains unverified.

**2. View Marks empty filters by default:** Live `/api/exams` supports the optional `include_saved_counts=1` and emits `saved_scored_count` and `saved_result_count`. Modern `MarksRegister.jsx` previously requested `include_subjects=1` only and always selected `exam[0]` (newest) rather than the latest exam containing saved marks. School1's four newest Assessment 1–4 headers have zero result rows; the original First Term exam has 1,854 saved rows. A proposed review-only fix requests the read-only count and selects the newest exam with scored marks, then pending saved rows, then legacy First Term/first exam fallback. It preserves exam switching, 401 behavior, and blank-versus-zero semantics. No exam or marks mutations occur.

## Other confirmed blockers

- School1 exam_subjects: 81 pending, zero genuinely approved. Assessment 1–4 headers 4, exam subject offerings attached 0, legacy marks rows 0, Assessment 5 absent; 12 live exam-class enrollment rows.
- First Term's 1,854 historical marks row checksum stays unchanged. A valid Principal subject signoff and real multi-role acceptance are required.
- School generic login owns 73 RLS tables. Off-host DB/ACL restore not certified. Root-disk headroom below safety gate.
- Existing historical test in A203 tree **wrongly hardcodes 6 draft Paper Vault rows**. During A207 the live active draft count legitimately/externally changed to 8, while 6 approved stayed stable. Two A207 full-suite cycles were marked FAIL; we do **not** rewrite the original test evidence or pretend it passed. Preserve the new draft records; use read-only counts in a separate isolated monitor and evaluate if writes originated from external user sessions before release.

## Artifacts
- `a207_production_readonly_gate.py`: aggregate-only, transaction-read-only live school + teacher + exam gate. No private names/IDs exported.
- `tests/a207-teacher-class-key-safe.test.cjs`: backend source-mock authorization and strict-tenant/class/subject checks.
- `tests/a207-marks-review-default.test.mjs`: pure frontend selection, safety, and API compatibility tests.
- `al-siddique-frontend/src/Modules/examination/marksReviewExamSelection.js`: candidate review-only selector.

**RELEASE: HOLD. No deployment, no production DDL or DB writes authorized.**
