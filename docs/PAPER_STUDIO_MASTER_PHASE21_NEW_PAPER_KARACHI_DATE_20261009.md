# ASSPS Paper Studio Master — Phase 21: canonical new-paper creation dates on Pakistan school day

9 October 2026 ~04:08–04:18 UTC. **Isolated owner engineering; NOT production deployed.**

## Governance, verified source and protected boundaries

- Read GitHub coordination issue #4 and `docs/coordination/PAPER_STUDIO_MASTER_HANDOFF.md` from canonical 2026-10-08 coordination scan. At start latest clean owner Paper Studio Phase20 `ac9d3b832d58898340fa80d6d8ca7063147f0988` local and origin same; new isolated worktree `/root/workspace/assps-paper-studio-master-phase21-20261009`, branch `feat/paper-studio-phase21-paper-creation-date-20261009` from exact Phase20 parent. Core Phase24 was most recent confirmed pushed Core security source `51a4a3c81cad2a063e879ad33a3704ea3e083b6b`, with Phase25 Core isolated WIP. All Core RLS/private Nginx/tenant/teacher save workflows remain Core owned.
- Live unmodified deployment metadata: frontend `24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92`, backend `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9`. No live PM2, SSH/Nginx, database, protected official First Term paper content, question bank, marks, Urdu font, printing, Academic IX/X and Connect source touched. Original full historic ChatGPT chat bytes and Phase3AE reviewed ZIP still not available; their coverage cannot be asserted.

## Actual new defect: blank paper exam dated one day early after school midnight

- Phase20 introduced `currentSchoolDate` for canonical Daily Diary and Cognitive Lesson Planning. **Different new-paper creation surfaces still used UTC** `new Date().toISOString().slice(0,10)` for `PaperCreationStart` teacher `Blank Paper` form, `paperCreationDraft` builder fallback, `AIGeneratorTab` default and `UnifiedPaperGenerator` generated paper config default.
- Real Playwright `Asia/Karachi` browser clock installed at `2026-10-08T19:30:00.000Z` (2026-10-09 at 00:30 Pakistan). Navigate actual `paper-workspace-test.html?new` teacher-facing canonical Paper Workspace → click **Create a Blank Paper** → inspect real `<input aria-label="Blank paper date" type="date">`: **PREPATCH RED `2026-10-08` vs expected `2026-10-09`**. Independent real `createBlankPaperDraft` Node fake-time test also RED `config.examDate=2026-10-08`, despite explicit selected-date override being preserved. Genuine new test **0/2 PASS, process exit 1**, `/tmp/paper-p21-date-red.log`; not a hypothetical UTC timezone assertion.

## Narrow fix, no teacher-selected date changes

- Reuse **Phase20's existing** tested shared helper `schoolCalendarDate.js`, with explicit `Asia/Karachi` IANA date-of-school clock; DO NOT implement a parallel date system. Four exact single-default changes: `PaperCreationStart.jsx`, `paperCreationDraft.js`, `AIGeneratorTab.jsx`, `UnifiedPaperGenerator.jsx`. Each imports `currentSchoolDate`, substitutes for unsaved initial/default UTC date **only**. No retrofit or mutation of saved existing papers, immutable First Term originals, teacher-selected exam date, duration, marks, question selection, table layout, PDF/DOCX, Urdu RTL, local drafts or server handling.
- **SAME real Chromium and domain tests AFTER fix GREEN 2/2, actual exit 0**: blank Setup HTML date `2026-10-09`, new draft document config `2026-10-09`, selected `2026-09-28` teacher form date and `2026-09-29` explicit draft date remain unchanged. `/tmp/paper-p21-date-green.log`.

## Full acceptance evidence and exclusions

| Gate | Outcome |
| --- | --- |
| New actual Chromium teacher Blank Paper form + independent draft factory controlled clock | **2/2 PASS**, RED→GREEN with actual DOM, `/tmp/paper-p21-date-{red,green}.log` |
| Existing self-service blank/duplicate + manual weekly Create→Save→Finalize→Reopen→Print + Phase20 Diary/Planner controlled-clock browser | First combined run failed **only** on separate backend-integrated teacher e2e environment bootstrap; narrowed **actual frontend cases 12/12 TAP PASS, process exit0**, includes synthetic Manual Weekly Assessment Create→Save→Finalize→Reopen→Print and Paper Creation self-service/duplicate/Diary controlled-date regressions; `/tmp/paper-p21-runnable-regression.log/.rc` |
| Authenticated restricted teacher Save→GET→Reopen→Print real backend integration | **BLOCKED/NOT CERTIFIED**: initial combined independent browser tester imported backend `al-siddique-backend/node_modules/pg` absent from isolated owner worktree, causing MODULE_NOT_FOUND before the backend test could execute. It also requires separately authorized disposable `DB_NAME=assps_phase3_teacher_e2e_*` on protected clone. **This is no code-path regression success or proven application failure**; `/tmp/paper-p21-creation-regression.log/.rc` initial combined run **exit 1**. Do not connect to live production DB or fabricate green. Core separately owns this restricted-role gate. |
| All 43 original official First Term source render and print-text parity | **43/43 protected official original First Term papers PASS, exit0**, test 400.51s / full TAP 406.50s, zero failed/skipped/cancelled, `/tmp/paper-p21-all43.log/.rc` |
| Protected six paper template hash integrity | **6 unchanged PASS, exit 0**, `/tmp/paper-p21-templates.log/.rc` |
| Frontend production build | **PASS, 2519 Vite modules, 54.83s, exit0**, `/tmp/paper-p21-build.log/.rc` |
| New controlled-clock browser test and draft factory scoped ESLint | **PASS, exit0**, `/tmp/paper-p21-lint-new-test-draft.log`. Wider file lint did NOT pass: pre-existing `PaperCreationStart.jsx` unused React import + existing AIGenerator/Unified lint errors/warnings; `/tmp/paper-p21-eslint.log`, `/tmp/paper-p21-new-entry-eslint.log`; not an assertion of full-repo lint pass. |
| Original 43-paper DOCX model + source math assets | **4/4 PASS exit0**, original 43 canonical models/1027 nodes/315 tables/612 RTL constructs/4 vertical maths blocks; `/tmp/paper-p21-docx-model.log` |
| Staged whitespace + exact GitHub pushed HEAD/issue #4 checkpoint | Verified at final commit/push and issue #4 read-back |

## Integration and release HOLD

- SaaS Core must selectively adopt only the four owner import/default changes onto its **latest verified signed non-BYPASS** release descendant, preserving its independent tenant RLS, user identity, school scopes, private-media Nginx gate and migrations. This Phase21 does NOT certify AI-generator question quality, true DB authentication, approved source questions or Grade IX/X academic selection.
- Remaining UTC-derived new defaults exist in separate **legacy** `DailyDiaryFeature.jsx` and `LessonPlanTab.jsx` and other historical authoring components; do not falsely report them fixed here. Teacher Windows printer and Urdu Nastaleeq pixel/page visual signoff, restricted Pg18 clone + 77-table RLS, saved paper API source ancestry and PDF/DOCX, role-bound Save→GET→Reopen, backup/rollback, permitted exposure of uploaded student media, and SaaS Core certification are still mandatory. **NO PRODUCTION DEPLOYMENT.**
