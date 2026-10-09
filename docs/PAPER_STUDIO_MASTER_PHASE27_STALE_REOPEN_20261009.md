# ASSPS Paper Studio Phase27 — stale asynchronous Diary Reopen cannot overwrite a newly selected school day

2026-10-09 UTC. Paper Studio isolated owner development only. **Not deployed**.

## Verified governance and source lineage

- GitHub coordination issue #4 freshly read before implementation; Paper Studio Phase26 original clean owner `d95772b15bdac8c56f14a68643bf4679d369574b`, origin exactly equal and full protected corpus tests already covered. New isolated owner branch `feat/paper-studio-phase27-diary-reopen-stale-response-20261009` and worktree `/root/workspace/assps-paper-studio-master-phase27-20261009` directly descend Phase26. Source-of-truth `docs/coordination/PAPER_STUDIO_MASTER_HANDOFF.md` checked, canonical DailyDiaryWorkspace and new Paper Workspace retained; old editors are compatibility-only. Older complete archived original chats and signed Phase3AE reviewed ZIP not byte-accessible.
- Latest verified completed SaaS Core at start Phase30 `cc70033337420429de04fe06e0f650d779f3bd4c`, with Phase25 owner memory-map integrated after Core Phase29; owner Phase26 explicit Reopen not integrated yet at start. Live deployed source metadata independently verified frontend `24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92` and backend `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9`; neither touched.

## NEW genuine reproducible UI race (distinct from already completed Phase24/25/26)

- Canonical Phase26 `Reopen Saved Diary` properly validates the *old captured request's* date/class/section against authorized `GET /api/daily-diary/:id` response; but it does **not** re-verify that the teacher is still editing the same scope after awaited HTTP list/detail. If teacher clicks Reopen for class Eight/Blue/Oct9, GET detail is delayed, and they choose Oct10 before response, Phase26 can load Oct9 rows/footer/palette into current Oct10 editor. This can contaminate a later Oct10 Save even though underlying GET was correctly authorized. It is a client async data integrity race; NO claim of actual production incident, cross-tenant leak, bypassed RLS or modified customer data.
- Real new Vite+React+Chromium test intercepts exact authorized `GET /api/daily-diary/301`, deliberately holds response, then changes selected teacher day from Oct9 to Oct10, releases genuine HTTP200 Oct9 row. On UNCHANGED Phase26 code, the existing editor was populated with `Private October 9 English homework` although selector visibly showed Oct10. **Actual RED 0/1 pass, test exit1**, `/tmp/paper-p27-stale-red.log`. Test uses fake school1 teacher/roster, no actual school user or database. This is different from original saved ID scope controls and reload reopen availability.

## Scoped fix

- In canonical `DailyDiaryWorkspace.jsx` only, a component-scoped monotonic `diaryScopeGeneration` ref is incremented whenever React commits a change of `classLevel`, `section`, or `date`. Reopen captures generation when teacher clicks; immediately after each asynchronous boundary (the filtered authorized list, teacher confirmation, authorized detail GET) it checks the opening generation is unchanged. A mismatch ends without changing rows, A4 count, palette, footer or mapped saved ID, and displays `Diary selection changed while reopening... content preserved`. Even if teacher moves Oct9→Oct10→Oct9 while request is in flight, generation changes, so simple tuple-equality ABA mistakes are avoided. The original backend authorization, server row-scope verification, explicit confirmation and prior within-session ID map remain intact.
- No backend routes, school identity, auth/session cookies, teacher/roster access, RLS, DB changes, original official papers, questions/marks, paper templates, printer, DOCX, PDF, Urdu RTL, SaaS Core/Academic/Connect modules, production metadata or original customer documents modified.

## Measured real test gates

| Gate | Result |
| --- | --- |
| New controlled late GET exact Phase26 source | **RED 0/1 exit1**: Oct9 saved rows were loaded into selected Oct10 editor, `/tmp/paper-p27-stale-red.log` |
| New race browser two-case re-run after fix | **2/2 PASS exit0**: Oct9→Oct10 AND ABA Oct9→Oct10→Oct9, `/tmp/paper-p27-stale-final.log`; exploratory first two-case script had test-only undefined `port`, corrected without product edits |
| Combined prior Phase26 explicit Reopen normal + all old adversarial cases | **3/3 PASS exit0** on new source (`/tmp/paper-p27-reopen-green.log`); this preceded final extra ABA case which was separately passed |
| New test file scoped ESLint | **PASS exit0**, `/tmp/paper-p27-eslint-final.log` |
| Original 43-paper canonical DOCX model and math | **4/4 PASS exit0**, 43 models, 1027 nodes, 315 tables, 612 RTL elements, 4 vertical maths; `/tmp/paper-p27-docx-model.log` |
| Full original 43 First Term teacher Workspace browser print-text parity | **43/43 PASS exit0**, 226.18s test/228.36s TAP, zero fail/skips, `/tmp/paper-p27-all43.log/.rc` |
| Prior 11 inherited Diary A4/Save/Revisit/Reopen, lesson, timezone/scheduling browser and pure tests | **24/24 PASS exit0**, all 11 inherited test files including Phase24/25/26 Diary and date/lesson browser suites, 96.68s TAP, run after full corpus; `/tmp/paper-p27-inherited.log/.rc` |
| Original six protected templates hash integrity | **PASS exit0**, six protected originals unchanged, `/tmp/paper-p27-templates.log/.rc` |
| Full optimized frontend Vite build | **PASS exit0**, 2,519 Vite modules in 13.61s, `/tmp/paper-p27-build.log/.rc` |
| Commit, GitHub remote SHA and issue4 coordination | All test/build gates green; pending scoped git commit/GitHub issue4 final handoff |

## Release HOLD and remaining blockers

- Core alone must selectively integrate the owner Phase26 button/GET feature and Phase27 generation guard and associated tests on the **newest verified signed Core descendant**, not merge a stale owner branch, after independent signed teacher/role/backend/tenant RLS validation. Core retains production deployment authority.
- This frontend race fix does not certify cross-school DB controls, attached Windows printer Nastaleeq/physical A4, PDF/Word output, restricted real PostgreSQL clone Save→GET→Reopen→PUT, user author/tenant grant tests, private upload HTTPS ingress, backup/rollback or Grade IX–X Academic Master original source approvals. Ambiguous duplicate records and 100 recent record list cap from Phase26 remain consciously fail-closed; no server uniqueness/version proof. No production deployment or service restart performed. Old chat source ZIP still inaccessible.
