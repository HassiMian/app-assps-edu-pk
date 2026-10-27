# ASSPS Mode B — Term built from original Weekly dates, pages and verified activities
27 October 2026 — REVIEW-ONLY source patch.

## Required term projection
1. Term filter: selected school/class/section and selected term start–end. Keep first and last actual teacher-source weekly dates independently from the selected date window. Do not imply all selected dates had school weekly source.
2. Per-subject pages are first dated verified week start page through last dated verified week end page, not a concatenation of all week text. If source pages reverse chronologically or have no verified pages, leave the derived range blank and flag manual teacher reconciliation. Keep original weekly dates, source IDs, activity details, page references and teacher-specified Unit/Chapter headings read-only in source provenance.
3. Short Term instructional statement is a grounded synthesis of only activities explicitly present in teacher source weeks. Recognized activities: reading, classwork, homework, exercises, copy/writing, task work, revision, learning and assessments. Do not invent reading, homework, exercises, task work or assessment just because Unit/page/subject is present. In a source with pages and chapter labels but no actionable instruction, detail remains EMPTY with source-review warning, not filled with fictional classwork. Only teacher-approved corrections alter the statement.
4. Term and Weekly remain independent per-student print docs. Mode B full student archive is primary; Term one A4 per student, all subject compact tables and source-backed assessments. No single-subject page printing as primary. Keep Urdu original script in Jameel Noori Nastaleeq (verified installed in private VPS fontconfig; browser availability / public font redistribution not certified).
5. Weekly parser previously took the first body topic as abbreviated visual headline, unintentionally dropping following teacher work directives. New teacherText field now preserves ALL source lines in original sequence. The condensed headline remains independent of the source. Prevents generic activities derived from Unit titles.

## Regression and release evidence
Synthetic examples (NEVER real student data):
- Selected term 12 Oct–10 Nov; actual teacher source weeks 15–28 Oct: source dates remain 15–28 Oct.
- Week pages 37–40 and 41–48 => Term 37–48; original Unit 7/8 names preserved without generating labels.
- Weekly explicit reading, classwork, homework, tasks => concise term summary containing those, no unsourced exercises or assessments.
- Unit/page-only source => no generated teaching action; reversed page numbering => no fake continuous span.
- 51/51 JS Term/Weekly source & print tests PASS; 79/79 Python release unit tests PASS; production Vite build PASS.
- Candidate only. No signed owner approval, Principal browser Lesson Save/Reopen/Print or School2 authenticated deny witness. No production deploy / marks or student DB changes.


## Additional fail-closed edge tests
- Eight kinds of explicit original teacher work (reading, classwork, homework, exercises, written work, tasks, revision and learning) are all retained in no more than two summary sentences; do not arbitrarily drop the fifth or sixth task.
- Explicit negation such as NO HOMEWORK or NO TEST does not become a new obligation or an assessment.
- New true teacher activity text is taken from all source block-body lines, NOT just the truncated visual first-topic headline.
- Source chapter titles such as Unit 7: Reading Skills or Chapter 4: Homework Policy NEVER count as teacher-assigned tasks, even if they contain English work verbs.

## Current iteration: one-A4 student-sheet real browser print checks
- Historical school report exists in older Git worktree but shows only a few verified subject plans, not the missing approved 59 cohort archive; neither Week 18 nor textbook pages for all students may be fabricated.
- New isolated Chromium printer QA includes 8, 10 and 12 distinct synthetic subjects with separate subject tables. Each rendered on exactly one A4 with all subject tables inside the physical card boundary, and Urdu print stylesheet reports Jameel Noori Nastaleeq.
- The synthetic fixtures contain no actual pupil data or newly approved syllabus. They prove only render/fit of the candidate CSS, not owner academic approval or the school RICOH printer's per-class content acceptance.
- C.W. / H.W. / T.W. explicit teacher abbreviations are classified without altering the original source statements. Test suite: 52/52 planning PASS; 79/79 release PASS; Vite build PASS.
