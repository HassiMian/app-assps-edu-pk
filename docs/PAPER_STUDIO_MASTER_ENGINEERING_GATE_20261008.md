# ASSPS Paper Studio Master — isolated engineering and release gate (8 October 2026)

## Source authority and worktree

- Live frontend, re-verified 2026-10-08 15:46 UTC: `24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92`, branch `fix/datesheet-session-theme-forward-20261008`.
- Live backend, re-verified: `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9`. No production changes were made.
- Candidate: `/root/workspace/assps-paper-studio-master-20261008`, `feat/paper-studio-master-forward-20261008`, started at exact frontend `24cbcae3`.
- Forward-ported only unique `feat/lesson-diary-live-forward-20261008` changes: original `9f5155ed`, `11a417dc`, `2b10eab3`; resulting commits `95002948`, `94318d3a`, `d6241c9c`. Existing scoring, protected papers, assessment results and latest Date Sheet changes remain in ancestry.
- Source review: old Paper Studio product-final candidates diverge from current deployment. No wholesale merge, reset or stale deployment.

## Scoped development performed

1. `lessonPlanningContext.js`: forward-port of least-privilege settings SELECT detection, with explicit absent/inaccessible settings fallback; no RLS bypass or invented curriculum calendar.
2. `lessonPlanningEngine.js` and `/planner/generate`: strict Gregorian date checks, explicit max-370-day planning range, valid blackout dates and finite buffer default. Fix weighted period allocation to never exceed actual timetable capacity or silently claim periods for unscheduled units. Missing official holiday calendar continues to require teacher confirmation.
3. `teacherDocumentAccess.js`: centralized fail-closed teacher author and school-management visibility boundary. An anonymous/malformed staff ID cannot manage documents. Unattributed legacy documents remain school-management review only.
4. `dailyDiaryRoutes.js`: school-filtered/creator-filtered list, per-item read/update/delete guard and guarded SQL mutations; management retains school-scoped oversight, cross-school rows denied. No production schema changed.
5. `lessonPlanRoutes.js`: creator-only lesson-plan listing/write/deletion for teachers and safe duplicate-public-ID responses. Sharing student/parent notifications requires school management review until authoritative teacher-assignment authorization is certified by SaaS Core. Current lesson_plan schema already has `created_by` and `school_id`.
6. Browser regression harnesses: select existing actual `Print / Save PDF` control rather than removed label, and uniquely scope Early Years header under `.early-years-editor-root`. These change assertions/selectors, not paper content.

## Evidence executed on isolated VPS worktree (no live DB/test records)

| Gate | Outcome | Invocation / evidence |
|---|---|---|
| Planner, settings privilege and teacher author boundary | **13/13 PASS** | `node --test al-siddique-backend/src/tests/{lesson-planning-engine,lesson-planning-settings-privilege,teacher-document-access}.test.js` |
| React/Vite production build | **PASS** | `cd al-siddique-frontend && npm run build` — 2518 modules transformed |
| Protected template integrity | **6/6 unchanged** | `npm run verify:templates` |
| Cognitive planning browser | **1/1 PASS** | `lessonPlanningWorkspaceBrowserAcceptance.test.js` |
| Daily Diary browser | **1/1 PASS** | `dailyDiaryWorkspaceBrowserAcceptance.test.js` |
| Protected official render/print content | **43/43 PASS** | `canonicalAll43RenderPrintAcceptance.test.js` via local 5387, ~178.6 sec, `/tmp/assps-paperstudio-corpus-20261008.log` |
| Urdu Workspace print/formatting | **9/9 PASS** | `paperWorkspaceUrduBrowserAcceptance.test.js` |
| English and Urdu DOCX exports | **2/2 PASS** | `canonicalDocxBrowserAcceptance.test.js` |
| DOCX/math/source/Early Years unit subset | **48/48 PASS** | Run five selected node test files from repository **root** (DOCX model assumes repo-root cwd) |
| Early Years self-service/browser | **2/2 PASS** | `earlyYearsSelfServiceBrowserPhase2.test.js` |
| Early Years print/PDF and geometry | **8/8 PASS** | `earlyYearsRenderPrintGeometryAcceptance.test.js`; nine sources, print CSS and A4 PDF |
| Math + image Workspace | **1/1 PASS** | `mathAssetsWorkspaceBrowserAcceptance.test.js` |
| Manual authoring/nested-scoring unit subset | **20/20 PASS** | `scoringPlanNestedAdversarial.test.js`, `manualAssessmentDocument.test.js`, `selfServicePaperCreationPhase1.test.js` |
| Blank Urdu manual save/reopen/print browser | **1/1 PASS** | `selfServicePaperCreationBrowserPhase1.test.js` after current print label selector fix |
| Assessment Saved Papers offline recovery | **2/2 PASS** | `assessmentPersistenceBrowserAdversarial.test.js` |
| Question Bank/Assessment Results pure and static tests | **10/10 PASS** | `NODE_ENV=test DB_STARTUP_PROBE=false node --test` four targeted backend files; no PG connection attempted |
| Nested OR / attempt-any Workspace browser | **1/1 PASS** | `nestedScoringBrowserAcceptance.test.js` |
| Quick Add / duplicate-safe question entry browser | **1/1 PASS** | `quickQuestionEntryBrowserPhase1.test.js` |
| `git diff --check`, JS route syntax | **PASS** | candidate-only source |

### Temporary failed attempts resolved (do not conceal)

- First combined DOCX model run used the frontend working directory; path was doubled and test process failed. Re-run from repository root yielded complete 48/48 PASS.
- Self-service browser old selector `Print` timed out after current UI renamed control to `Print / Save PDF`; inspected actual live harness buttons, updated selector, full functional save/reopen/print then PASS.
- Early Years geometry test selected two `header.no-print` nodes under new Studio shell. Narrowed the existing Early Years editor selector; entire test suite 8/8 PASS. No source-content or PDF expectations were weakened.
- The full 43-paper run exceeded a 50s remote command limit; resumed with the same isolated test and a local longer-running harness to completion: 43/43 PASS, exit 0.
- An unconfigured backend DB startup probe caused a test runner to linger; terminated only its own test process, reran pure/static tests with `DB_STARTUP_PROBE=false`: 10/10 PASS.

## HOLD — mandatory external and operational release gates

1. **SaaS Core (owner):** existing production connection login `apexos_user` has BYPASSRLS. Coordinate new teacher creator-scope rules with the current Core restricted-login candidate; validate real signed tenant context and every used endpoint against a separate authorized **disposable production-schema clone**. Do not run DB-backed suites against `apexos` or use current privileged connection as RLS certification.
2. **SaaS Core + Paper Studio:** real authenticated teacher/principal/other-school records; Diary and Plan CRUD, revision/conflict, class/subject assignment and principal-only portal publication, missing-schema refusal, no privilege fallback and rollback. Current pure/fixture/Chromium tests are not these DB gates.
3. **Print operations:** physical printer output and independent long multi-page Urdu/English PDF pagination/overflow are not certified by text parity/geometry tests alone; native OS printer/PDF selection remains printer-neutral.
4. **Academic Master:** Grade IX–X question snapshots remain 0 independently approved as of coordination issue #4. Do not promote provisional data as teacher-selectable approved content; consume only revision-bound reviewed snapshots under issue #1.
5. **Historical issue #2/#3:** Phase3AE recovery and contiguous serial+instruction cross-field selection are distinct outstanding acceptance; unrelated passing browser suites cannot close them.
6. **Production promotion:** SaaS Core alone to reconcile frontend/backend descendant, currently unresolved role/RLS/perimeter and backend artifact parity, protected-paper regression and actual restore/rollback rehearsal. No deployment permission inferred from this branch or this report.

**Release decision:** Stage-only engineering candidate; functional regression suite materially improved and passed in isolation. Full school-backed Paper Studio release **HOLD**. Preserve legacy papers and all overlapping worktrees/branches.
