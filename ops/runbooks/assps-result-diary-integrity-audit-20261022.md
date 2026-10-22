# ASSPS First Term Marks & Diary Source Audit — 22 Oct 2026

## Findings (READ ONLY — real production database unchanged)
- Exam 9: 1,854 persisted subject results, 303 students with marks, 224 authentic numeric zeros, zero SQL NULL obtained marks in saved result rows. Do not equate uncreated rows with score zero.
- Mover/Purple has 42 students normally scoring 7 subjects with a 250-point total. One student has an eighth, 100-point Computer subject scored 85, making their 329/350 total incomparable with the other 41 students' 250 maxima. The old Result Cards frontend unconditionally summed every subject and ranked the 329 total first. This is a real leaderboard distortion, not an error in the other two reported Mover pupils' recorded totals. No exam-subject roster exists for Mover in `exam_subjects`.
- Subject-count or denominator discrepancy occurs in four class-sections: Flyer/Pink (one incomplete/atypical 5-subject record), Mover/Purple (one 8-subject record), Six/Blue (one 4-subject record), Starter/Blue (one recently admitted 1-subject record). New admissions can legitimately have pending papers, so blank records must never be invented.
- Six saved records give a non-top grade to perfect subject marks (100% score, stored grade D). All belong to English Written in pre-primary classes. School 1 has no custom grade_settings rows, so defaults are used in source. Do not rewrite historic printed cards or stored grades silently.
- Legacy ExaminationModule quick-entry form defaulted all missing subject entries to zero and could post an entire class at exam-wide 100 rather than official 25/50 per-subject maxima. Primary Marks Sheet already sends only edited marks, but had trusted POST acknowledgement without independently re-reading saved values.
- Four original Diary palette themes are currently available. Existing subject font/row height/header/controller and physical printing workflows were repeatedly used successfully; do not rebuild printing or Fees without evidence.

## Recovered source fixes (isolated branch; NOT LIVE)
- Result Cards: `resultRankIntegrity.js` requires an identical non-Nazra subject list and subject maxima for class ranking, respects blank/AB/EX states, preserves tied positions, and suppresses new result-card printing if a class has mismatched subject maxima or missing papers. Printed historic cards and student marks remain untouched.
- Marks Sheet: Save → independent GET/reopen exact row comparison before green success, including strict numeric 0 versus NULL/blank. Unsaved edits survive failed verification.
- Legacy Examination quick grid: save explicit edits only; no blank-to-zero fabrication; prevent entry for First Term exam's subject-specific maxima; reject silent modifications to existing scores; reset drafts when switching class/exam/section.
- Diary: preserve original four styles and extend to 10 palettes, adjust row-height at 1mm resolution, add optional header top-spacing stored in saved style settings and reflected in preview/print CSS; existing default settings/print margins unchanged.

## Release controls
- Changes must pass TypeScript/JSX/Vite build, hashed chunk graph, synthetic result rank/save unit tests, Daily Diary Playwright browser print-layout smoke, independent tenant-security tests and authenticated school-specific Save→Reopen→Print acceptance.
- No live DB update, no reranking of already issued cards, no correction to genuine zero marks, no changes to the live Fee service.
- Historical rank corrections require an authoritative first-term subject roster and signed policy for extra papers, missing papers, student transfers and tie treatment. Do not assume single student's extra Computer score should be deleted.
- Existing working immutable frontend release must remain in place until authenticated acceptance for Results/Diary/Marks has passed. Keep the previous release and rollback accessible.
