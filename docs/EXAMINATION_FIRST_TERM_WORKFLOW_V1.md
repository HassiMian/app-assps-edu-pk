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

## Snapshot safety follow-up — 01 Oct 2026
- After the verified 12/81 sync, the only active One/Blue student moved to One/Yellow, leaving the live roster at One/Blue=0 and One/Yellow=38.
- This is treated as a roster change, not grounds to rewrite historical exam enrollment.
- Official sync now merges existing official exam enrollments with the current active roster instead of deleting an already-enrolled official section.
- Non-official classes such as Nine remain excluded, and exam_subjects are rebuilt only from the official 75-paper matrix.
- Regression coverage confirms One/Blue remains in the exam snapshot when the current roster contains only One/Yellow.

## Production acceptance follow-up — 01 Oct 2026 (r3)
- Backend snapshot-safety commit: ab28a5c8d02b0339eee166a0af1facab1db7cd68.
- Frontend stale roster-status fix: 594f6951d56d123d5db6ae05035b4e8e1d476482.
- Patched official sync returned HTTP 200 with exam id 9, 75 official papers, 12 enrolled class/sections and 81 scheduled section-papers.
- Live setup/roster API: 12/81; One Blue=0; One Yellow=38; Starter Blue=45; Mover Purple=42; Flyer Pink=24; Two Orange=31; Three Red=29; Four Blue=17; Five Blue=23; Six Blue=20; Seven Blue=21; Eight Blue=11.
- Live Marks Entry acceptance on new MarksSheet-C7DMTe5V.js: One/Blue empty state observed, then One/Yellow loaded 38 students and the stale Blue error cleared (STALE=false).
- Live Result Cards correctly reports no students with marks because exam_results for exam 9 remains 0. No fake marks were created.
- Frontend deploy helper false-success was traced to multiline payload forwarding through the Windows .cmd/Paramiko SSH wrapper. Remote payloads are now base64-encoded into one argv item before execution.
- release-meta.json is now source-controlled in frontend/public so future clean frontend swaps retain release identity.

## Live Marks Entry acceptance and paper-marks guard — 01 Oct 2026
- In authenticated Opera on live r3, Exam 9 selects correctly. Starter/Blue loads 45 real students.
- One/Blue correctly shows its empty-roster state. Switching to One/Yellow automatically loads 38 real students without stale error.
- Switching One/Yellow from English (28 Sep) to Mathematics (30 Sep) retains and reloads the 38-person roster; no results were altered.
- Blank Save All Marks gives "Enter at least one student mark before saving"; production exam_results for Exam 9 remained zero.
- Result Cards selects First Term Exam - All Classes and correctly reports no saved marks.
- Production data audit: 81 active exam_subjects, ZERO total_marks configured, ZERO pass_marks configured. Previous 100/33 display was inherited fallback, not approved paper-specific grading.
- MarksSheet guard now displays empty, explicit Total Marks and Passing Marks for unconfigured subjects; student mark inputs remain disabled until both are supplied. First verified save still atomically locks the scheduled subject scheme, using existing backend rules.
- New browser test validates no implicit 100/33, no POST on missing scheme and correct input enablement after values are provided.
- Clean baseline build of source-controlled r3 matches all compared production JS asset hashes exactly, including Paper Editor, Result Cards, Notifications and Diary. No broad or blind frontend replacement.
- Full combined regression: 28/28 PASS; production safety check PASS; production build PASS.

## r4 release checkpoint — tested, NOT YET deployed (01 Oct 2026)
- Current live frontend remains r3 (release commit 594f695); do not claim r4 is live.
- Guard implementation commit: 083aed524b5cf964fcd996825025b2fa9fd3c7dd.
- Source-controlled r4 release metadata checkpoint: ac8cbe733cdd2e75365b6aa674b76997f327b307.
- Local release archive: C:\Users\Imac\AppData\Local\Temp\assps-examination-r4-083aed5.tar
- Archive SHA256: d7bdf2cfc629f1146b2e6e84c0e506a25e4fc42ae90def75f1c4ebc114f68323 (4,361,216 bytes).
- Full production safety gate passed. Combined Examination + Paper Editor V13 regression 28/28 passed. Vite production build passed.
- Clean r3 baseline rebuild reproduced the live ResultCards, PaperEditorRouter, NotificationModule, DailyDiaryFeature, MarksSheet, AppLayout, and index asset hashes byte-for-byte. Temporary baseline build folder cleaned and guard source restored.
- Archive upload through Remote Desktop Commander's SCP was blocked by the command safety check; there was no production archive transfer, directory swap, or marks mutation.
- Next action: use an approved transfer/deployment route; stage by COPYING current live directory and overlaying the reviewed r4 archive (retain old hashed assets), verify, back up, switch with rollback, and confirm r4 in live release-meta.json.
- Then repeat authenticated Marks Entry on Exam 9 / One / Yellow and verify Total Marks / Passing Marks initially EMPTY with required-paper notice; verify blank save and Result Cards; do not use fake marks.

## Live acceptance follow-up — 01 Oct 2026
- Production backend restarted successfully with snapshot-safe First Term sync code active.
- Live official sync returned HTTP 200 for canonical exam id 9 with 75 official papers, 12 enrolled class/sections, and 81 scheduled section-papers.
- Post-sync invariants remained exact: exam id 9 unique; enrollments 12; subjects 81; Nine 0; 04-Oct 0; exam_results 0.
- Live Marks Entry accepted First Term Exam -> One -> Yellow and loaded 38 active students with 0 marks entered.
- One/Yellow scheduled subjects matched the official matrix exactly: English 28 Sep, Mathematics 30 Sep, Urdu 02 Oct, Science 05 Oct, Islamiyat 07 Oct, Quran / Nazra 09 Oct.
- Live Result Cards route loaded successfully and correctly reported no saved marks for the exam.
- Save -> reload -> Result Cards with a mark remains intentionally unexecuted until a genuine student mark is available; no fake production mark was inserted.
