# First Term Marks Entry — mixed legacy class roster union and least-disclosure acceptance (2026-10-10)

**Basis:** exact deployed frontend commit 24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92 -> isolated reviewed marks frontend candidate acc915677a9b33634f6306d4a307fd8116f3e53e. New branch fix/marks-roster-alias-union-20261010, isolated worktree /root/workspace/assps-marks-roster-alias-union-20261010. Backend teacher scope candidate remains independent 8f4814b67695bfd231a5d70ad67536684d05f843.

## Real code defect fixed
- Previously MarksSheet first requested GET /api/students?class=One. If any returned, it stopped. In a mixed legacy class database with One and Class One or Class 1 records, it omitted valid classmates in other labels; otherwise it fell back to unfiltered GET /api/students (entire authorized school roster), unnecessarily broadening access.
- marksClassQueryAliases strictly enumerates canonical+prefixed written+numeric+prefixed numeric values for One–Ten (e.g., One, Class One, 1, Class 1). Starter/Mover/Flyer only use applicable written labels. Each request is an explicitly class-filtered GET to the existing authenticated tenant/teacher-scoped API. Server maintains all role/tenant/active teacher assignment checks. No privileged fallback, no new endpoints, no production credentials.
- mergeMarksRoster canonicalizes each returned student's class, excludes wrong classes, ignores invalid IDs and deduplicates across mixed labels by positive stable student ID. Every matching label is checked whether or not first query returns students. A failed/invalid response fails closed with no incomplete-mark save, rather than silently treating an incomplete roster as complete.
- Official First Term 2026–27 75-paper subject lists, explicit saved exam selection, previous marks restore, edited-only save, invalid ID/class restrictions and six protected result templates remain unchanged.

## Executed exact-code tests (source branch)
- Source model tests PASS including exact mixed-label four-query set, union of partial responses, wrong class exclusion and duplicate removal.
- Real local Vite + Chromium PASS with intentionally empty Academic Setup subjects; mixed One and Class One students are returned from separate individually filtered class requests, duplicate One/1 IDs deduped. **Unfiltered /api/students mock explicitly returns HTTP403**, so regression proves no whole-school fallback. First Term selector, six Class One subjects, saved 76 restored, edited zero alone saved, invalid 101 and repeat no-edits blocked, saved-results HTTP503 read failure keeps roster and disables saving.
- Focused ESLint PASS zero errors, optimized Vite build PASS (6.42s), six protected template fingerprints PASS.
- No actual user/student/marks data fetched, changed or exposed. No deployed code, PostgreSQL, PM2, Nginx, teacher assignments, papers, grades or exam records changed.

## External release gates
- Existing live Nginx private upload checker still reports five unsafe aliases; protected signed non-BYPASS PostgreSQL actor RLS test credentials absent. P0 production certification still false.
- Frontend staged candidate source branch (after merge) remains a descendant of original live frontend commit. Backend remains independent staged release for teacher classroom and school-ID scope; needs authorized real actor end-to-end tests.

**Source tested; NOT production-deployed. Release certification HOLD.**
