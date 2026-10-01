# Examination First Term Workflow V1
Baseline frontend: f5a0b96 (current live Paper Editor V13)
Date: 2026-10-01
Goal: Date Sheet -> canonical exam -> enrolled class/sections -> scheduled subjects -> real roster -> marks -> results -> result cards.

## Production audit
- Official First Term source: frontend Modules/dateSheetFinalExam2026.js, session 2026-2027, term First Term Exam, 75 scheduled papers (computed from the current official matrix).
- Official classes: Starter, Mover, Flyer, One..Eight. Nine is explicitly excluded from official date sheet.
- School 1 active roster sections: Starter Blue; Mover Purple; Flyer Pink; One Blue+Yellow; Two Orange; Three Red; Four Blue; Five Blue; Six Blue; Seven Blue; Eight Blue; Nine Fatima+Usman.
- Existing DB canonical candidate: exams.id=9, name First Term Exam, type TE, class All Classes, session 2026-2027.
- Current MarksSheet is disconnected: selects exam type instead of canonical exam ID, generic subjects instead of scheduled subjects, creates a new exam if missing, and queries students using "Class "+name even though DB stores word labels such as One.
- Current exams schema has no class/section enrollment or subject schedule relation.

## V1 data model
Keep exams.id=9. Add:
- exam_class_enrollments(school_id, exam_id, class_name, section)
- exam_subjects(school_id, exam_id, class_name, section, subject, exam_date, paper_time, total_marks, pass_marks, sort_order)
Do not destructively alter exam_results.

## V1 workflow
Exam -> Class -> Section -> Scheduled Subject -> Active Roster -> Marks -> Results -> Result Cards.
One canonical First Term exam record is shared across every screen.

## Safety
No automatic creation of replacement exams from Marks Entry.
No fake students.
No Class 9 First Term schedule.
No broad production folder replacement.
Marks are validated 0..subject total, tenant/class/section checked, and save is atomic.
