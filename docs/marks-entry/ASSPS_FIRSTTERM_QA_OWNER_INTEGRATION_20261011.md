# First Term P0 — independent QA integration and school-scoped catalog fix, 11 Oct 2026

**Current release decision: `RELEASE_CERTIFIED=FALSE`, public deployment HOLD pending genuine logged-in school role and cutover acceptance.** No production school record modifications or academic subject creation are authorized by this document.

## Agent-owned independent QA
Agent branch `qa/firstterm-marks-entry-browser-acceptance-20261011` actual pushed SHA `cd4c0bb76744b8285d08df683e0e8892c23fbe40` (note pasted report erroneously wrote `cd4c0bb757...`). Core cherry-picked that exact source-only QA report/synthetic screenshot commit onto latest Core branch without modifying the original agent worktree. Agent verdict `ASSPS_MARKS_BROWSER_QA_BLOCKED` was preserved: browser tests on mock/candidate PASS but public build still old, Grade Nine/Pre Nine exam subject offerings missing, Principal browser acceptance not yet done.

## Independent live production read-only catalog facts
- First Term Exam id9, type TE, school1, 2026–27, All Classes exists. No new/duplicate exam created.
- `exam_subjects` contains **81 ACTIVE section-scoped rows**, not 75: Starter7, Mover7, Flyer7, One12 across Blue6/Yellow6, Two6, Three7, Four7, Five7, Six7, Seven7, Eight7.
- `students` aggregates: Starter45 Mover42 Flyer24 One38 Two31 Three29 Four17 Five23 Six20 Seven22 Eight0, Pre Nine11, Nine16. Eight has exam subjects but zero students; Pre Nine/Nine have 27 students but no Exam9 subject rows. Preserve academic owner's subject approval authority: no invented/duplicated enrollments/subjects and no deletion of existing rows.

## Core-owned source fixes integrated
1. `services/schoolClassOrder.js`: common natural Starter → Flyer → One..Eight → Pre Nine → Nine → Ten sorting, supports numeric/prefixed labels but **keeps Pre Nine, Nine, Ten distinct**; `useAcademicStore` classNames/activeClasses now sorted, and Marks Entry `marksEntryClasses` merges approved First Term classes even if academic setup only partially configured.
2. `GET /api/exams?include_subjects=1` is an OPTIONAL school-bound extension of the already existing signed tenant `GET /api/exams` route. Only Principal/Admin/Superadmin/Teacher or service with explicit results-read scope can request it; unbound school/Student role denied. Queries active `exam_subjects` with explicit authenticated school ID plus saved exam IDs, retaining class, section, subject, order and exam marks metadata. Normal `/api/exams` without flag returns **unchanged** original response shape, so other exam/result consumers and Paper/Connect remain intact; no additional public routing path is needed.
3. Marks Sheet requests optional configured offering metadata. Subject dropdown prioritizes actual school+exam+class row mappings; section-specific backing data retained and repeated same subject deduplicated *only visually*, not deleted from DB. Empty authoritative catalog remains empty with a clear guidance banner (do not fallback to fake Grade Nine subjects); legacy paper-based official First Term subjects are only a compatibility fallback when the API does not provide the optional field. Existing saved Exam9 preferred, class aliases fetch roster without unrestricted student queries, blank marks distinct from zero.

## Source QA actually executed
- Actual Express HTTP isolated contract verifies `include_subjects` is bound to school21 and saved Exam9, Blue/Yellow sections maintained, Student role receives 403, and default exam response unchanged. PASS.
- Pure Marks Entry class/subject model natural order and missing Nine/Pre Nine offerings tests PASS.
- Backend signed/teacher/transaction security suite 17/17 PASS; optimized frontend build EXIT0, changed-file eslint EXIT0; genuine headless Chromium First Term marks save/reload/zero, Result Designer A4/print tests EXIT0; original six Paper protected template SHA tests PASS. No school data writes in QA.

## Deployment plan and remaining gates
- Existing public frontend still release `24cbcae3`, backend `16ab8f34`; integrated Core source branch produces a new frontend built artifact, but live Nginx and APEX Connect untouched. Private signed green supervised localhost5091 is the only permitted backend for marks-only GET and POST once approved. Preserve old frontend static root, old backend5000, API Connect host3000, PM2 rollback, SHA-verified independently restored pre/post signed backups.
- Reverify green startup and school-scoped query with genuine authorized actor before app-only controlled cutover. Existing user-supplied Principal login screenshot is **human logged-in evidence** but cannot be silently transferred into Cloud Chromium session. No automated login bypass/token capture. After controlled app-only deployment, obtain actual school Principal/Teacher browser result for Exam9, configured class subjects, student roster, marks save/reload with real approved marks, nine Result Cards and cross-school denial. Any failures trigger original app config rollback.

**Status: Source integration and regression PASS; final live actor / release acceptance PENDING.**
