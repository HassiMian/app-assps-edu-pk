# ASSPS Paper Studio Phase 22 — legacy Lesson Plan & Diary school-day default correction

9 October 2026 ~04:27–04:39 UTC. **Independent Paper Studio development only; NOT production deployed.**

## Current authority, baseline and protected boundaries

- Read current GitHub coordination issue #4 and handoff `docs/coordination/PAPER_STUDIO_MASTER_HANDOFF.md` and pre-existing chat governance report, with authority precedence live release metadata → immutable owner+GitHub commits → fresh tests → human academic signoff. Latest verified clean Paper Studio owner Phase21 SHA `d45c292cc70c91efb86cb81e11fe23195394bf21`, origin equal and clean. Core Phase25 `cbb4a1ecca07dd751a508cbbf0a325158521a929` independently selectively adopted Phase20 main Diary/Cognitive lesson school-date code; not deployed and not owner for legacy feature edits.
- New isolated branch `feat/paper-studio-phase22-legacy-school-date-20261009`, worktree `/root/workspace/assps-paper-studio-master-phase22-20261009`, exact parent Phase21. Production frontend `24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92`, backend `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9` verified at start, live unchanged. No stored papers, protected First Term exam records, marks, teacher/student records, production service, backend, RLS/JWT, real DB, Nginx, Core, Academic IX–X or Connect modified. Full historical chat byte exports and Phase3AE signed archive cannot be independently inspected.

## New actual teacher/reference date bug and negative tests

- Phase20 already fixed **canonical** Daily Diary/Cognitive Planner defaults; Phase21 already fixed **new paper creation**. Separate backward-compatible `DailyDiaryFeature.jsx` and `LessonPlanTab.jsx` legacy/ref interfaces retained four different UTC-based local-day semantics: Diary's date default, LessonPlan's new blank plan date, automatic generation start, and weekly/monthly **Today** highlights. At Pakistan **2026-10-09 00:30 PKT** (UTC `2026-10-08T19:30Z`) those separate legacy surfaces still produced **previous day 2026-10-08**, potentially misdating a new teacher-authored old-mode diary/lesson.
- Added actual Vite+Playwright Chromium `Asia/Karachi` fake clock test against existing old Lesson Plan acceptance HTML, with minimal test-only fixture query switch `?legacyDiary` to render real `DailyDiaryFeature` using the same test harness; no production app routing changed. **Real PREPATCH Chromium negative RED** both old Lesson Plan editor and legacy Diary `input[type=date]` value **2026-10-08**, expected **2026-10-09**, full TAP 0/3 due parent test, `/tmp/paper-p22-legacy-red.log`. Original old test harness and school data untouched; fixture switch only for isolated test URL.

## Tiny scoped implementation

- Reuse *existing* Phase20 `currentSchoolDate()` from `schoolCalendarDate.js` (IANA Pakistan calendar), not a second independent helper. Replace only `DailyDiaryFeature.jsx` legacy `todayForInput`, and in `LessonPlanTab.jsx` one blank-plan date, one Auto-Generate start date, two Today marker date constants with explicit school-day helper calls. Preserve saved date, manually chosen date, original selected class/section/subject, timetable, weekly/monthly date stepping, school name/font/Urdu layout, card pagination, print/PDF and DB/API. No migration or rewrites of existing data.
- Actual SAME browser source **GREEN**: legacy new Lesson Plan editor, old Daily Diary date, plus added independently exercised *Auto-Generate Lesson Plans* start-date modal, all values `2026-10-09` at fake PK 00:30; teacher-selected earlier dates in all three inputs remain intact. **4/4 TAP PASS, actual process exit0**, `/tmp/paper-p22-legacy-final.log`. Prior 2-field intermediary also **3/3 PASS**, `/tmp/paper-p22-legacy-green.log`.

## Exact validation — do not invent unresolved PASS

| Gate | Evidence/status |
| --- | --- |
| New real Chromium RED→GREEN legacy references/auto-generator | **Before 0/3 (RED), after expanded 4/4 PASS, actual exit0**, Date boundary and user override validated. `/tmp/paper-p22-legacy-{red,green,final}.log` |
| Previously certified Diary, Lesson Plans, Cognitive Planning, Phase20 school date, Phase21 new Paper date existing browser scripts | First combined 5-file run **1 FAIL, 10 PASS, exit1**: existing `dailyDiaryWorkspaceBrowserAcceptance.test.js` generic card-count after "None" returned 3 instead of expected 1 A4 page at 80ms wait; other tests including main prior lesson tab and date suites PASS. `/tmp/paper-p22-prior-day-browser.log/.rc`. **DO NOT CLAIM GREEN** until solo controlled rerun or genuine bug fix. |
| Isolated original Daily Diary browser regression after ending the heavy protected corpus | **1/1 PASS, process exit 0** in isolated execution after heavy official corpus finished, no product changes; `/tmp/paper-p22-diary-solo-final.log/.rc`. Initial combined 80ms card-count failure is retained as a concurrency/timing stability watch, NOT erased. |
| Original protected First Term 43 papers live Paper Workspace screen+print-text parity | **43/43 original protected papers PASS, process exit 0**, full official render + clone print-text parity, case 409.52s / TAP total 416.67s, zero failed/skipped/cancelled; `/tmp/paper-p22-all43.log/.rc` |
| Original 6 protected template hash integrity | **6 unchanged PASS, process exit0**, `/tmp/paper-p22-templates.log/.rc` |
| Full frontend Vite production build | **PASS exit0**, 2,519 modules, 45.05s, `/tmp/paper-p22-build.log/.rc` |
| New Playwright browser test lint | **PASS exit0**, `/tmp/paper-p22-browser-eslint.log`; baseline harness `lessonPlanBrowserHarness.jsx` has existing unused React import (`eslint` FAIL combined) and full source UI lint has pre-existing diagnostics; no entire repo lint success claimed. |
| Original 43-paper DOCX data/math structure | **4/4 PASS, process exit 0**; 43 original export models/1027 nodes/315 tables/612 RTL blocks/4 vertical-maths structures; `/tmp/paper-p22-docx-model.log` |
| Five existing browser-suite files rerun after isolated Diary | **11/11 TAP PASS, controlled process exit0**, all 5 prior independent diary/plan/Phase20 date/Phase21 paper date Chromium scripts, 41.75s total after isolating shared CPU; `/tmp/paper-p22-prior-day-final.log/.rc`. Earlier simultaneous-run failure (10/11 PASS, exit1) retained as timing/stability evidence and **not claimed unconditionally absent under load**. |
| Git staged whitespace, origin pushed SHA, issue #4 comment | Pending final full rerun and commit |

## Release HOLD and integration contract

- **SaaS Core only** may selectively forward-port the two narrow backward-compatibility owner files and the new fixture Chromium test onto its latest verified signed non-BYPASS Core descendant; must not merge stale branches or overwrite private upload Nginx control, 77-table RLS, JWT principal, tenant data, saved assessments, academic IX–X human approval or Connect services. Preserve existing full versioned Core rollback plan.
- Core must independently certify real authorized teacher/parent Save→GET→Reopen restricted DB clone with role/tenant RLS, physical Windows printer/Nastaleeq glyph+page inspection and PDF/DOCX fidelity, live ingress private media gate, backups/restores. Legacy LessonPlanTab remains a compatibility/reference tool, **not** an alternate canonical Paper Workspace authority. Original full historical chats and signed Phase3AE archive not available; do not claim their audit complete. **NO PRODUCTION DEPLOYMENT.**
