# ASSPS First Term Exam — Marks Entry recovery (10 October 2026)

**Status:** Isolated implementation and synthetic UI/source QA complete. Not deployed. Live school authenticated user, actual First Term exam row, true student roster, and live marks acceptance remain unverified. Prior SaaS Core P0 authentication/RLS and private Nginx upload security release gates remain open.

## User-visible incident and exact affected route
- User reports the First Term Exam not appearing in Marks Entry dropdown, no registered students in class, and inability to enter/save marks.
- Actual route `/examination/marks` and alias `/exams/marks` render `al-siddique-frontend/src/Modules/examination/MarksSheet.jsx` (not the older ExaminationModule marks tab).
- Current deployed frontend/backend release metadata at investigation: frontend `24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92`, backend `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9`. Neither modified.

## Diagnosed application source defects
1. Previous MarksSheet submitted `class=Class One` while school student API normalizes names like `One` and performs exact SQL class comparisons, hiding real students. Existing legacy data may also include `Class One` in records. Fixed by shared pure class normalization, canonical class query and fallback read-only same-authenticated-tenant/student-scoped roster filtering on empty exact-class response. Never widens the server's role/tenant authorization.
2. Previous marks entry had Exam Type only and automatically selected `matchingExams[0]`, hiding the actual term/record choice. Now uses an explicit saved Exam/Term dropdown with real exam name, academic session and class, matched by persisted ID; prioritizes a genuine First Term record when the catalog loads. Never invents a stored exam or silently selects an incompatible class/type.
3. Old Save path silently created an exam when no matching record existed. Now **fails closed** with actionable Manage Exams guidance; only existing persistent exam IDs may be used. No automatic duplicate First Term assessments.
4. Earlier class search and marks fetch ran in `Promise.all`, so a marks-read failure concealed a successful student roster. Now loads roster first and retains authorized students; if saved marks cannot be read, display clear error and disable Save.
5. Old marks save took all nonempty entries, including previously loaded untouched marks. Now tracks **editedMarks** separately and POSTs only explicit changed student/subject marks; blank omitted, intentional `0` accepted, negative/non-numeric/exceeding total rejected. A second Save without fresh edits cannot rewrite existing data.
6. Prevent stale old class/exam/subject requests from replacing a newer selection with `rosterFetchSeq`; concurrent save response cannot clear newer edits due to `marksEditRevision`. Students, marks and session are not mixed between exam contexts.
7. If academic class setup list is temporarily unavailable but actual First Term Exam is in the saved exam catalog, display a limited official `Starter/Mover/Flyer/One–Eight` class picker. This only allows selection; actual class enrollment still comes exclusively from the authorization-scoped student API.
8. Save requires a successful matched saved-marks read, valid total/pass, at least one explicit edit, an exact existing exam ID, and `success=true` plus matching `savedCount` acknowledgement before displaying success.

## Minimal source architecture
`MarksSheet.jsx` (teacher UI, state, role-scoped API requests) → `marksEntryModel.js` (pure canonical class/exam matching and bulk-save validation) → existing protected `GET /api/exams`, `GET /api/students?class=...,` `GET /api/exams/results/:exam_id`, `POST /api/exams/results`. Backend already has a tenant-scoped transactional UPSERT; **no backend schema, RLS, migration or endpoint edits** performed. No Paper Studio, Grade IX–X, APEX Connect, fees or admissions module changes.

## Actual tests on isolated candidate
- Source/pure contract script `node scripts/test-marks-entry-first-term-recovery.mjs`: PASS canonical Class One / numeric One aliases, named saved First Term exam selection and class/type matching, filtered authorized roster, zero-vs-blank, negative/over-max input rejection, no implicit `POST /api/exams`.
- **Real headless Chromium + Vite** `node scripts/test-marks-entry-firstterm-browser.mjs`: PASS explicit synthetic persisted First Term Exam ID 9 option, two authorized synthetic One students despite `class=One` filtered API returning empty, excludes unrelated Class Two student, restores previously saved 76, prevents invalid 101, accepts explicitly edited zero only (previous 76 not rewritten), second Save without edits blocked, separate existing-results-read HTTP503 leaves students visible and disables saving. Entire browser fixture uses localhost and synthetic API stubs. ID 9 and all marks in fixture are **synthetic**, not verified actual production exam or school grades.
- ESLint focused on MarksSheet/model/two tests PASS exit0.
- Optimized frontend Vite `npm run build` PASS exit0, final `/tmp/assps-firstterm-marks-final2-build-20261010.log`.
- Original six premium/legacy result card template hashes PASS unchanged.
- Live anonymous four Results API routes return HTTP401; not a login acceptance certificate.
- `git diff --check` PASS; no database writes, PM2/Nginx changes or production deployment.

## Required before live marks entry
1. Core review and controlled frontend-only release candidate from the latest verified source, **subject to pre-existing Core security release gates**.
2. Fresh protected artifact/DB backup, rollback proof and frontend/backend SHA ancestry; do not overwrite production from stale branch.
3. Authorized principal/teacher session, real First Term exam presence and class labels, student roster and access-scoped exam marks GET verified. School actor must already be authorized; do not use hardcoded credentials or a privileged impersonation.
4. Enter one approved test mark for an authorized real student **only under school-approved live data acceptance conditions**, verify POST exact exam/student/subject, reload persistence, no untouched results changed, and tenant/role/teacher assignment negative tests.
5. Existing P0 private-upload ingress and signed restricted PostgreSQL/RLS acceptance must be independently resolved before broad SaaS production release certification.

**Release decision:** MARKS_ENTRY_ISOLATED_FIX_IMPLEMENTED=true; BROWSER_REGRESSION=PASS; VERIFIED_PRODUCTION_MARKS_ENTRY=false; DEPLOYMENT=HOLD.
