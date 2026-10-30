# ASSPS Unified Review Gate — 30 October 2026

Mission: consolidate Assessment 1/2/3 creation, marks integrity, and attendance roster/save fragments in one isolated, independently testable no-release candidate.

Repository: HassiMian/app-assps-edu-pk
Review branch: review/assps-unified-exam-attendance-20261030
State: REVIEW ONLY, production certification HOLD.

## Engineering fixes staged
- Assessment 1/2/3 source: active-only student roster, exact marks parsing, zero-vs-pending distinction, protection against exam deletion with saved results and unapproved official score revisions.
- Legacy examination dialog: explicit class, valid session and marks; default Assessment; optional date; close only after server confirms success and new exam ID. Failed save stays open and displays error.
- Legacy marks entry: blanks stay pending, explicit zero survives, invalid/over-maximum input rejected; server acknowledgement required before success.
- Attendance: active-only roster and exact save acknowledgment with honest counts.
- Backend: created_by on new exams now derives from authenticated actor, not user-supplied payload.
- Independent no-release GitHub CI workflows cover assessment and attendance on the same unified branch.

## Verified test evidence
- Isolated VPS worktree: 45/45 frontend and 6/6 backend mock tests passed; targeted ESLint and full production-mode frontend build passed. Added 1/1 real Chromium component-browser test with intercepted synthetic API: failed Assessment save leaves the dialog open, explicit retry with confirmed server ID closes it. These tests did not write to school PostgreSQL.
- Previous integrated commit 3ea86315: GitHub Actions exams run 41053116163 SUCCESS; attendance run 41053115964 SUCCESS. New creator-attribution change requires its own fresh CI on updated head.

## Fresh live READ-ONLY checkpoints (school_id 1)
- Exam definitions: two only (id 9 First Term, id 7 historical Class 1 Assessment). No live Assessment 1/2/3 was created during this review.
- Exam 9: 1,854 saved result rows; 213 exact numeric zeros; 0 null. Earlier quoted 224 zeros is not the observed current number.
- First Term pass policy stored as 33 out of 100 versus requested 40 percent. Twenty scores fall from 33 percent inclusive to below 40 percent. Existing grades and scores have not been rewritten.
- Active students 329; attendance marked 328 for 30 October; unmarked 1.
- Active school principal/owner users 0, admin 3, super_admin 1, teacher 19. No fabricated authenticated Principal review.
- assessment_papers and lesson_plans: 0 rows in current school scope.
- Live portal HTTP 200, anonymous students API HTTP 401. PM2 services online, without any restart in this mission.
- Two on-VPS 30 October restore receipts reported all_restore_gates_passed true; independent off-VPS full restore evidence remains absent.
- Source contains Class Eight Second Term forbidden lesson-policy guard, but this guard was not found in the active backend path, so live certification is withheld.

## No-release / certification gates
1. Core code owner review and safe merge, source/live ancestry, backup snapshot and rollback verification. The current GitHub connector has read-only permissions; PR creation returned 422 not a collaborator. Remote SSH pushed review branches, not production.
2. Genuine authenticated role-based Admin/Principal and Teacher create-assessment, enter new QA marks, save, reopen and preview acceptance. Do not submit fabricated live pupil scores.
3. Original syllabus page ranges, Grade IX–X academic approval and institutional signing evidence. Lesson Planner classes One to Seven; Class Eight has no Second Term; Pre-9 excluded from present rollout.
4. Independently restored off-VPS PostgreSQL instance and authenticated historical marks revision acceptance, without compromising existing records.
5. Resolve pass threshold 33-versus-40 policy through audited academic authorization, without rewriting marks.
6. Saved Papers server revision recovery and backend/API persistence acceptance; local-only saved banner is not accepted as cloud recovery.

No production database writes, releases, restarts, fake identity, academic signoff, or certificates performed or claimed.
