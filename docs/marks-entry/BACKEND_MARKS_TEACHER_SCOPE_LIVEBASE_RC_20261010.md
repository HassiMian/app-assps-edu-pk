# ASSPS Marks Entry API — production-ancestry scoped backend teacher authorization candidate (2026-10-10)

**Production backend BASE:** `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9` (checked deployed backend artifact metadata).
**Reviewed Core security delta source:** `0076279e7ff893ae0cf9654125f7418cd3e3b3b6` from `54121d7f93012c27cb7fe0491a53ccd56d6990c3`.
**Branch/worktree:** `release/marks-firstterm-backend-livebase-20261010`, `/root/workspace/assps-marks-backend-livebase-20261010`.
**Exact scope:** route patch only to `al-siddique-backend/src/routes/examRoutes.js` (26 additions, 2 deletions), pure teacher authorization helper plus two tests. Re-applied the reviewed scoped patch onto the LIVE backend source; did NOT replace its existing result-details fields or import the many unrelated upstream backend modules. No SQL migration, production school data write, PM2, Nginx or permissions escalation.

## Security gap closed in candidate
Previously, `POST /api/exams/results` checked student/exam tenant membership but no active teacher assignment on class/section/subject; GET result routes also lacked teacher-specific class/subject scope. On this candidate:
- Every teacher POST is checked within the existing DB transaction against actual school-scoped active `teacher_class_assignments` records, student class, section, subject, and saved exam class. A batch containing any unauthorized mark is rejected with 403 before any UPSERT; rollback and principal/admin paths are preserved.
- `GET /api/exams/results`, `GET /api/exams/results/:exam_id`, and `GET /api/exams/student-results/:student_id` require parameterized EXISTS teacher authorization by class/section/subject as part of DB query, not post-query filtering. This does not bypass PostgreSQL RLS or tenant predicates.
- Teacher class/subject names must match configured assignments exactly as required by the existing teacher student roster scope. If teacher assignments are inconsistent, controlled configuration/role correction is needed; no fallback to permissive access.

## Actual exact-base verification
- `npm ci --ignore-scripts` PASS. Native Node syntax PASS.
- `node --test` on pure teacher scope + actual Express router with synthetic auth and transactional database doubles + original first-term schedule: **9/9 PASS numeric exit0**, `/tmp/assps-back-livebase-security-20261010.tap`.
- Real Express HTTP test covers authorized teacher GETs, assigned POST COMMIT and **six forbidden teacher POST 403 with zero inserts plus rollback**, principal positive comparator. This is synthetic; **no real school account, JWT, credentials or PostgreSQL records** were read or changed.
- Some larger Core signed static test files did not exist in this historical deployed backend source and were not imported into the minimal candidate; do not count them as an executed green suite.

## Release protection and rollback
Fresh authorized DB snapshot and protected artifact/metadata copy before release; verify no newer deployed backend commit, test migration/role catalog, test actual restricted non-BYPASS signed sessions and cross-tenant/teacher assignments, monitor errors, smoke results GET/POST, restore exact backend base `16ab8f34...` if any failure. **Do not restart backend merely because staging tests passed.**
P0 live private media aliases and approved SCRAM/JWT E2E test credentials remain unresolved. Frontend hotfix must be verified separately on live frontend `24cbcae3...` ancestry.

**RELEASE_CERTIFIED=FALSE; BACKEND_DEPLOYED=FALSE; real actor role acceptance BLOCKED.**
