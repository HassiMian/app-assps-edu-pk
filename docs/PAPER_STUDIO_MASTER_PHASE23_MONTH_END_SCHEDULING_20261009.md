# ASSPS Paper Studio Phase23 — end-of-month lesson scheduling and timezone-safe date-only recurrence

2026-10-09 05:18–05:26 UTC. **Paper Studio isolated feature owner; NOT deployed**.

## Governance / verified latest baseline

- GitHub issue #4 read, including latest Core Phase26 clean `3f46857711bcdcf48b1b2200719f82754ab7a1ca` (owner Phase21 new-paper date selectively adopted, production NOT deployed), Paper Studio Phase22 clean remote `5a5efe3f5f89d5f8aa025c6157c1b9e8b78d1c5f`. Latest live production source-metadata at cycle start frontend `24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92`, backend `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9` and must remain untouched.
- New owner branch `feat/paper-studio-phase23-lesson-schedule-month-20261009`, worktree `/root/workspace/assps-paper-studio-master-phase23-20261009` isolated, direct child exact Phase22. Read canonical coordination handoff. Archived complete original historical chats and Phase3AE signed reviewed ZIP cannot be byte-read; cannot infer complete historical evidence. Zero DB, JWT/RLS, Core, Connect, Academic IX/X, original question source, First Term paper data, student/teacher marks or protected template edits.

## NEW bug, not prior Phase20–22 date-input defaults

- Original legacy Auto-Generate Lesson Plans `buildPlanDates(startDate,scope,count)` parsed a school date-only input through `new Date('YYYY-MM-DD')`, advanced dates using host-local `setMonth/getMonth` and `setDate/getDay`, then serialized by `toISOString().slice(0,10)`. JavaScript's overflowing `setMonth` with the originally desired 31st **skips short months entirely**, while mixing date-only UTC parsing with local getters **shifts weekly generated plans on computers in other timezones**. Calendar highlighted Today/initial input defaults were fixed earlier Phase22 but do NOT protect generated schedule values.
- Exact source implementation executed before patch (not conjecture) in VPS JavaScript: under `TZ=Asia/Karachi`, **2026-01-31 monthly ×3 → [2026-01-31, 2026-03-03, 2026-03-31]**, February missing; annual January31 → March03 / May01 / July01 ... with multiple months displaced. Under `TZ=America/Los_Angeles`, Monday `2026-10-05` weekly ×3 generated **2026-10-06, 2026-10-13, 2026-10-20** (all Tuesday). Root cause previous mixed local/UTC semantics, not a live customer-data incident. No persisted user records touched.

## Isolated immutable-date scheduling fix

- Replace only the former locally defined `buildPlanDates` algorithm in `LessonPlanTab.jsx` with imported pure `lessonPlanDateSchedule.js`, using *UTC-calendar methods exclusively* for `YYYY-MM-DD` school-day arithmetic. Monthly/annual recurrence retains the originally requested day-of-month but **clamps** to each shorter target month's final valid day (e.g. Jan31→Feb28→Mar31→Apr30, Feb29 leap-year aware). Date-only inputs are validated, no time-zone/local clock translations or unbounded loops. Daily weekday/weekly Monday recurrence uses `getUTCDay/setUTCDate`, preserving existing Mon–Fri/Monday-only rules regardless of laptop timezone, and annual produces exactly 12 months. No API/backend/schema changes.
- `planRangeLabel` for generated plan dates now derives its displayed **month and year** using `YYYY-MM-DDT12:00:00Z` with UTC month/year getters, preventing legitimate first-of-month plans from being labelled with previous month when viewed west of GMT. Other calendar views/rich plans/teacher saved dates untouched, no marked questions, RTL/font, print/PDF/Word, marks changed. Existing Phase20 `currentSchoolDate` still sole source for *default today* (distinct from pure day-only recurrence).

## Actual measured code/browser/print gates

| Gate | Result |
| --- | --- |
| Original source execution negative (PK and LA) | **RED**: Jan31 next target March03, 3 Mondays shift to Tues in LA, see baseline command capture in originating owner run |
| Pure date scheduler edge / invariants | **4/4 PASS, exit0** `lessonPlanDateSchedule.test.js`: leap/regular Jan31 end-of-month, annual 12 months, Dec→Jan→Feb, Friday→Monday daily, Monday-only weekly, term weeks, invalid input fail-closed, LA/Pakistan/UTC byte-identical (three independently spawned TZ Node processes). `/tmp/paper-p23-schedule-unit-final.log` |
| Real legacy Lesson Plan UI Auto-Generate + mocked persistence across foreign timezone | **1/1 PASS exit0** Vite+Chromium timezone `America/Los_Angeles`, teacher selects Science/Class7, start **2026-01-31**, Monthly 3 plans, actual captured POST models dates **[Jan31, Feb28, Mar31]**, correct `planningScope=monthly`. `/tmp/paper-p23-schedule-browser.log`. Real upstream DB not used. |
| New standalone pure helper + date test + Chromium test ESLint | **PASS exit0**, `/tmp/paper-p23-eslint-final.log`; first version test-only had missing `import process from node:process` flagged by ESLint; added and retested all 4/4 pass, did not alter implementation. Do NOT claim whole legacy UI file lint passes. |
| Protected original 43 First Term real Browser render+clone print-text parity | **43/43 PASS, controlled process exit0**, 220.77s case/225.15s TAP, zero failed/skipped/cancelled, `/tmp/paper-p23-all43.log/.rc` |
| Existing Diary/old Lesson Plans/Cognitive Planner/Phase20/21/22 date tests | **15/15 PASS, controlled exit0, 41.58s TAP**, six old separate browser suites (old Lesson Plans, legacy reference dates, Diary A4 cards, Cognitive Planning, Phase20 Diary date, Phase21 paper creation date), run AFTER official corpus to avoid earlier concurrent 80ms card-pagination flake; `/tmp/paper-p23-prior-browser.log/.rc` |
| Original 6 protected paper templates hash integrity | **PASS, 6 protected files unchanged, actual exit0**, `/tmp/paper-p23-templates.log/.rc` |
| Full frontend Vite build | **PASS, 2519 modules/24.50s, exit0**, `/tmp/paper-p23-build.log/.rc` |
| Canonical DOCX source model and mathematics assets | **4/4 PASS exit0**, 43 models / 1027 nodes / 315 table structures / 612 RTL blocks / 4 vertical math, `/tmp/paper-p23-docx-model.log` |
| Staged commit/GitHub origin and issue #4 | Final diff/commit/push must be verified independently after completing tests |

## Release HOLD

- SaaS Core current Phase26 owns selective integration into **its newest signed non-BYPASS descendant**, must not merge stale Paper Studio owner full branch; preserve Core private Nginx media policies, tenant JWT/restricted RLS, backup/rollback. Teacher permission-backed real Save→GET→reopen/print/PDF/DOCX against disposable signed PostgreSQL clone, 77-table grants, attached physical Windows printer Nastaleeq/pagination and authenticated Nginx private upload ingress gate all remain Core release gates. Academic IX–X independent original/source human approval remains separate. Original Phase3AE signed ZIP/complete historical chats unverified. Core alone deploys after certification; owner branch rollback simply leave it unused. **NO DEPLOY.**
