# ASSPS Paper Studio Phase26 — explicit authenticated canonical Diary Save/Reopen

9 October 2026 UTC. **Owner-only isolated development, NOT PRODUCTION DEPLOYED.**

## Canonical source and boundaries

- Freshly read GitHub issue #4, canonical coordination handoff, independently reconciled Paper Studio Phase25 exact remote+clean `b16082287bd3608c30b70f675a29e68aa786cd99`, SaaS Core Phase29 `972cb12a80710a059471c6d0144a7eb36deb7d76` latest completed Core at start (Phase25 Paper Studio owner not yet integrated), and live release metadata frontend `24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92`, backend `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9`. Other owners' active worktrees untouched; no production command/service restart, DB, migration or deployment.
- New isolated owner worktree `/root/workspace/assps-paper-studio-master-phase26-20261009`, branch `feat/paper-studio-phase26-diary-explicit-reopen-20261009`, direct child Phase25. Preserved school official original First Term papers, students, existing diaries, assessments, Urdu Nastaleeq, maths, marks, tenant/RLS/JWT, SaaS Core and Connect, source approval Grade IX–X. Complete historical conversation byte exports and signed Phase3AE ZIP not independently available.

## NEW uncovered saved Diary UX defect, different from Phase24/25 in-session IDs

- Phase24 prevented wrong-date cross-scope update; Phase25 reused the original ID when *revisiting within a mounted editor*. **After browser page reload**, component memory `useRef(Map)` necessarily resets, and the newer canonical DailyDiaryWorkspace had **no teacher-facing way to reopen** an already-saved record. The authenticated backend ALREADY offered `GET /api/daily-diary?limit=...` and `GET /api/daily-diary/:id`, with school+role+created_by list filters, and detail authorization. Legacy DailyDiaryFeature already used the authenticated list, but is NOT canonical editor.
- Added Vite+Playwright actual canonical editor acceptance with synthetic auth user/school 1 (Class Eight Blue date Oct9), saved row ID201, plus foreign-school SAME CLASS/DATE row ID999. **Real before-patch RED**: `Reopen Saved Diary` button absent, user cannot load record, one browser test failed, process exit1; `/tmp/paper-p26-reopen-red.log`. No production data accessed and no claim any real record disappeared.

## Scoped implementation: explicit user-controlled, fail-closed, no background draft overwrite

- Only canonical `DailyDiaryWorkspace.jsx`: `Reopen Saved Diary` button appears in Diary mode, separate from Save and Print. It NEVER auto-overwrites unsaved draft; teacher selects class/section/date and must confirm replacement. Current auth school identity must be available in existing login session. It calls existing authenticated `GET /api/daily-diary?limit=100` and filters **exact school ID, class level, section and date** (date-only substring from PostgreSQL ISO serialization). If 0 matches, explicit no-match notice. If 2+ matches, fail closed with duplicate/ambiguous notice rather than randomly selecting another teacher's record.
- For exactly one match, second existing authorized `GET /api/daily-diary/:id` fetches exact original ID. Client independently validates response.success=true, integer ID, matching school/class/section/date, and rows array *before* replacing draft rows, palette, footer and A4 cards per page. Successful authorized fetch registers the ID only for the selected in-component map; subsequent Save uses existing Phase24/25 exact-scope `PUT /:id`, not a duplicate POST.
- Network failure, wrong-school list entry, duplicate matches, swapped unauthorized/detail response or teacher cancellation leaves current local editor state intact. Server remains ultimate authority; no new backend/API/permissions, no persistence of cached IDs between sessions, no stored student/teacher records edited. Scoped UI code has no student roster selection or print/layout changes.

## Test evidence and release hold

| Gate | Evidence/status |
| --- | --- |
| New actual real Chromium before-patch | **RED exit1**, no teacher accessible Reopen Saved Diary, `/tmp/paper-p26-reopen-red.log` |
| After-patch reloaded Diary → scoped list → authorized detail → same ID Save PUT | **GREEN 1/1 exit0**, exact calls GET list, GET `/201`, PUT `/201`, wrong school row `/999` never requested; `/tmp/paper-p26-reopen-green.log` |
| Adversarial duplicate, cross-school and detail substitution browser acceptance | Expanded **2/2 PASS exit0**, each ambiguous/fabricated unauthorized response rejected without editor hydration; `/tmp/paper-p26-reopen-extended.log` |
| New browser file ESLint | **PASS exit0** `/tmp/paper-p26-lint-final.log` (final expanded browser file linted; full old JSX lint not claimed) |
| Original DOCX model/math assets | **4/4 PASS exit0**, original 43 document models, 1027 nodes, 315 tables, 612 RTL, 4 vertical math; `/tmp/paper-p26-docx-model.log` |
| Original 43 First Term canonical renderer→clone printed-text parity | **43/43 PASS process exit0**, 220.98s test / 223.15s TAP, 0 failed/skipped/cancelled; `/tmp/paper-p26-all43.log/.rc` |
| Ten inherited Diary A4/saved-scope/revisit/legacy Lesson/Cognitive/date/scheduling browser+unit scripts | **22/22 PASS process exit0**, 10 inherited suite files, run after official 43, 66.30s TAP; `/tmp/paper-p26-inherited.log/.rc` |
| Six protected template hashes | **PASS 6 original protected files unchanged, exit0**, `/tmp/paper-p26-templates.log/.rc` |
| Full frontend build | **PASS 2,519 Vite modules/10.60s, exit0**, `/tmp/paper-p26-build.log/.rc` |
| Git commit/push/remote exact SHA and issue #4 readback | All runnable gates green; stage/commit/push/remote and issue #4 readback pending |

## Honest limits and release gates

- Authenticated browser above uses **synthetic mocked HTTP**, NOT signed-role PostgreSQL clone or proof teacher owns the data. Backend's real `protect/requireRoles`, school RLS and `canAccessAuthoredDocument` were inspected but not tested in this phase. Server list caps at 100 most-recent accessible records; older records outside the window are NOT discovered. User must explicitly Reopen; Save alone after fresh browser reload still can create a duplicate record. Multiple matching records intentionally require separate record-resolution UI; no arbitrary auto-selection. Real uniqueness/version conflicts across teachers need SaaS Core release tests and possibly backend schema policy.
- Core only may selectively apply two owner UI/test paths onto newest verified signed non-BYPASS Core descendant, preserving existing security, private uploads/Nginx, RLS/77-table permissions, branches and protected official papers. Need real role-bounded POST→GET→reopen→PUT, school-context mismatch test, authorized class/section/day + teacher membership, end-to-end print/PDF/DOCX and physical A4/Jameel Noori, backup/rollback, private upload ingress, HTTPS certification, independent Academic IX–X human textbook source approvals. Original historical chats and signed Phase3AE reviewed bundle not accessible. **NO PRODUCTION DEPLOY until SaaS Core independently certifies.**
