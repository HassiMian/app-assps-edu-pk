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
- Blank manual Assessment Paper Workspace: user-authored documents now expose first-question creation and the selected-question inspector. Synthetic Chromium entry and question-edit acceptance passed.
- Saved Papers review: the prior tab displayed only browser-local drafts, not Assessment Studio's tenant-authorized server list. It now shows server-saved assessment metadata separately and can request a server-verified revision for editable workspace reopening; failed or unavailable cloud reads never invent an empty recovered document, and no server item can be deleted by the local-only delete button.

- Independent no-release GitHub CI workflows cover assessment and attendance on the same unified branch.

## Verified test evidence
- Isolated VPS worktree: 47/47 frontend and 6/6 backend mock tests passed, plus a separate 47/47 backend service/authorization regression sweep and 24/24 lesson-policy/domain tests; targeted ESLint and full production-mode frontend build passed. Added 3/3 real Chromium component-browser tests with intercepted synthetic API: failed Assessment save leaves the dialog open, explicit retry with confirmed server ID closes it; server-saved assessments appear in Saved Papers and failed reopening does not create a fabricated document; a blank manual assessment can type/edit its first question. These tests did not write to school PostgreSQL.
- Previous integrated commit 3ea86315: GitHub Actions exams run 41053116163 SUCCESS; attendance run 41053115964 SUCCESS. New creator-attribution change requires its own fresh CI on updated head.

## Fresh live READ-ONLY checkpoints (school_id 1)
- Exam definitions: two only (id 9 First Term, id 7 historical Class 1 Assessment). No live Assessment 1/2/3 was created during this review.
- Exam 9: 1,854 saved result rows; 213 exact numeric zeros; 0 null. Earlier quoted 224 zeros is not the observed current number.
- First Term pass policy stored as 33 out of 100 versus requested 40 percent. Twenty scores fall from 33 percent inclusive to below 40 percent. Existing grades and scores have not been rewritten.
- Active students 329; attendance marked 328 for 30 October; unmarked 1.
- Class Eight still has **11 active students** in the current admissions roster, while **no active Pre-9/Pre Nine students** are listed. This contradicts the stated school promotion policy; never mass-update student class or historical examination records without a verified student-by-student promotion roster.
- No exam 7 marks exist; all currently saved exam result rows belong to the First Term exam 9. Grade/class configuration table and exam class enrollment table have 0 rows for the queried school scope; do not treat a configured Pre-9 as proven from those empty tables.

- Active school principal/owner users 0, admin 3, super_admin 1, teacher 19. No fabricated authenticated Principal review.
- assessment_papers and lesson_plans: 0 rows in current school scope.
- Live portal HTTP 200, anonymous students API HTTP 401. PM2 services online, without any restart in this mission.
- Two on-VPS 30 October restore receipts reported all_restore_gates_passed true for Git repository clones, fsck, patch checks and source zip checks. **These receipts do not establish any PostgreSQL data restoration**, let alone independent off-VPS database recovery. That essential release gate remains unmet.
- Source contains Class Eight Second Term forbidden lesson-policy guard, but this guard was not found in the active backend path, so live certification is withheld.

## No-release / certification gates
1. Core code owner review and safe merge, source/live ancestry, backup snapshot and rollback verification. The current GitHub connector has read-only permissions; PR creation returned 422 not a collaborator. Remote SSH pushed review branches, not production.
2. Genuine authenticated role-based Admin/Principal and Teacher create-assessment, enter new QA marks, save, reopen and preview acceptance. Do not submit fabricated live pupil scores.
3. Original syllabus page ranges, Grade IX–X academic approval and institutional signing evidence. Lesson Planner classes One to Seven; Class Eight has no Second Term; Pre-9 excluded from present rollout.
4. Independently restored off-VPS PostgreSQL instance and authenticated historical marks revision acceptance, without compromising existing records.
5. Resolve pass threshold 33-versus-40 policy through audited academic authorization, without rewriting marks.
6. Saved Papers server revision recovery and backend/API persistence acceptance; local-only saved banner is not accepted as cloud recovery.

No production database writes, releases, restarts, fake identity, academic signoff, or certificates performed or claimed.

## Broader diagnostic not yet cleared
The pre-existing assessmentPersistenceBrowserAdversarial.test.js, not included in the CI PASS suite, still fails late on second-tab reopen: neither its older 'Edit question content' selector nor the current 'Selected question content' selector becomes available after its Edit Paper attempt. The first-question Chromium test passes, but this does not establish full multi-tab, stale-editor or offline-replay acceptance. Do not certify the unresolved path or reinterpret the failed full suite as passed.
