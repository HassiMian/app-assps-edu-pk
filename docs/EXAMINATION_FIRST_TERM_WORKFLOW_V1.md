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


## Production deployment checkpoint — 01 Oct 2026
- Live frontend release: examination-first-term-workflow-v1-r2.
- Live commit metadata: a236509f4627d1d913c00c0e3b031a7b57a04ca6.
- Previous live workflow commit: c053da1812f581512cd8e4e6fb1f32f066dfd1be.
- Website HTTP 200; backend /health status ok.
- Live MarksSheet lazy bundle uses /api/exams/:id/setup and /api/exams/:id/roster; it does not fetch /api/students directly and does not POST-create an exam.
- Live ResultCards bundle SHA256: 549AD7EA295254F8493CADE065738B44ECDDBF251E154DDBF265078DE67037E3, exact match to verified local build.
- Browser regression gate: 45/45 PASS (3 examination workflow + 42 Paper Editor V11/V12/V13/canonical checks).
- Production database exam id 9: 12 active class/section enrollments and 81 active section-expanded subject rows; Class Nine has 0 First Term subject rows.
- Subject row counts: Starter Blue 7; Mover Purple 7; Flyer Pink 7; One Blue 6; One Yellow 6; Two Orange 6; Three Red 7; Four Blue 7; Five Blue 7; Six Blue 7; Seven Blue 7; Eight Blue 7.
- Frontend deployment archive SHA256: a0a51710a379fcd96fde64ab83eb416e1c9257c0287e506ea50d2e1ad25f2d1d.
- Rollback snapshots preserved: /var/www/apex-os.bak-20261001-074300 and /var/www/apex-os.prev-20261001-074300.
- Deploy transport improvement: ops/deploy-production.ps1 accepts explicit SshExe/ScpExe paths; deploy safety tests 4/4 PASS.
