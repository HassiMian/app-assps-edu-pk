# ASSPS A199 — Assessment 4/5 and Class Six subjects: read-only facts

Date: 2026-11-05
Scope: school_id=1 of live apexos database; no writes.

## Database inspection

School-level exams of type AS:
- Assessment 1, Assessment 2, Assessment 3, Assessment 4 are saved in the exams table for academic session 2026-2027; each configured 20 total marks / 8 passing marks.
- Assessment 4 has exam id 17 and exists, but has zero rows in exam_results.
- Assessment 5 is not present in exams; it cannot be treated as an existing saved examination.
- Assessment 1, 2 and 3 also have zero exam_results rows.
- None of these Assessment 1–4 records has rows in exam_subjects.
- For Class Six/6, no records were found in the school-scoped subject_offerings table among class labels Six, 6, Class Six, Class 6.
- First Term Exam has its own 1854 exam_results and 81 exam_subjects and was not modified.

## Numbering and policy

Live grade_settings F=0–39 percent. The existing next-assessment policy proposes:
Assessment 5, type AS, All Classes, session 2026-2027,
20 total marks, 8 passing marks.
Policy explicitly requires an authorized Create action and approved academic subject scope. It is a PREVIEW only; no exam was auto-created.

Automated backend policy unit tests 7/7 PASS. Frontend marks roster scoping tests 3/3 PASS.

## Conclusions and unresolved work

Assessment 4 creation is successful, but marks persistence has not been exercised by an authenticated principal/teacher in a non-production test transaction. Assessment 5 missing is a creation/workflow state, not evidence it was successfully saved. Class 6 Assessment 2 empty subjects are consistent with missing configured subject offerings in checked tables. Do not fill with fabricated subjects or copy unrelated examination scopes.

For final live acceptance, an authorized principal must review Assessment 5 creation and class/section-specific subject approvals, then safely enter/reopen actual marks. A test that writes live production marks without authorization or exact pupil/scope provenance was deliberately not attempted.

This evidence is supplementary to the A199 Saved Papers V5 source restoration report. Both production front and DB remained unchanged.
