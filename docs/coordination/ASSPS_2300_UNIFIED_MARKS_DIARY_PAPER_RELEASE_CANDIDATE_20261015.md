# ASSPS 15 October 2026 — 23:00 PKT unified Marks + Diary + Paper frontend candidate

**Status:** new isolated source-only integration, QA PASS on bounded tests; **production NOT promoted**. SaaS Core owns official release authorization and full-stack cutover.

## Exact source lineage
Parent: clean full three-route Paper/Diary/Core/worker preservation candidate `qa/paper-studio-full-route-postflight-20261015`, `c66a5ae205545e41dbd445e58543ad5f938296a9` (descends from `f1e6f3d852d9afafa64ad467ad0738c00bff2458`).
Forward-ported **exact 8-file reviewed saved Marks Register View/Edit/Print patch** `4ce2c5e3` from live Marks P0 source; cherry-pick staged without merge conflict, new isolated source commit `19631c427a915132e9563c974b4b08855b09ddaf`.
Preserved separately reviewed weekly-first Lesson Planner Chromium QA fixture from `40a8c0f05fe2c2416506e45738365d1182e394ac`, cherry-picked to `07446c0a05319515635e0e5df84cc50509192268`.
No shared branch/worktree overwritten, no force push, no production source/database mutations.

## New integrated release safety
- Added `ops/release/verify-marks-register-active-bundle-20261015.cjs` to follow the **actual `index.html -> active Vite index JS -> reachable MarksRegister JS + CSS`** route, require both protected Marks Review aliases, `exams_marks` permission marker, stored marks numeric zero/absent/pending and Print/Save PDF controls. Reject orphaned/stale chunks, symlink substitution, removed styling and missing review routes. This checks compiled route fidelity, **not** live account authorization by itself.
- New `ops/tests/marks-register-active-bundle-20261015.test.cjs`: **10/10** negative and positive checks.
- Updated Core-owned `ops/release/guarded-lesson-planner-rollout.py` in isolated candidate to REQUIRE same Marks Register active-route guard both **pre-promotion and post-promotion** (postflight failure triggers existing backup rollback), in addition to existing Diary 11 + V5 Lesson Planner + Early Years/print. **No relaxation** of required signed Core production gate, Nginx snapshot, source clean, backend provenance or rollback.
- Existing postflight hermetic QA expanded to Marks fourth route: **5/5 PASS**.
- CI `.github/workflows/lesson-planner-release-contract.yml` now enforces Marks active-bundle verification and adversarial tests after building exact frontend.
- Targeted new MarksRegister component lint errors corrected with user-event-scoped clearing before async fetch, removing unused code. Test-only browser harness Fast Refresh false-positive narrowly disabled with explanation. **Targeted Marks JSX/browser lint PASS (0 errors)**. Full-tree lint still has preexisting failures and is **NOT** certified.
- This has **not** been merged or authorized by official SaaS Core and Paper owners; submit/forward-port through issue #4.

## Executed new QA
- Fresh optimized `npm run build`: **PASS**. Exact merged preview `dist/index.html` SHA256 `968a66357697b4113150e13ed8d2164e617e1d81db3246c11f0be29ba176edfe`.
- Reachable rich Diary active import graph: **11/11 PASS**.
- Reachable reviewed Marks Register View/Edit/Print route: **PASS**, active `assets/MarksRegister-CUCraSgG.js`.
- V5 Lesson Planner Term/Weekly/Daily contract: **PASS**.
- Early Years/Diary print companion contract: **PASS**.
- Headless Chromium Marks View/Edit/Print numeric zero vs NULL/ABSENT and 403 school-denial: **2/2 PASS** after targeted component change; synthetic QA records only, log `/tmp/assps-2300-unified-markscore-qa2.log`, SHA256 `fc78960063caf1b7890be6a98d712883b51d45fc75649e6b320dbd9706ea8dfa`.
- Fresh merged Chromium Lesson Planner generation/save/Student Cards bridge **1/1 PASS**, log `/tmp/assps-2300-unified-lesson-browser.log`, SHA256 `1b5770ea05bbcdf54a566e8c527d92a556c5a5f5fa0c39dacab398e2e36dcc3c`.
- Fresh merged Chromium Daily Diary exact-scope Save→Reopen and cross-school/duplicate failures **2/2 PASS**, log `/tmp/assps-2300-unified-diary-browser.log`, SHA256 `25a1414e3ed27224a9bf2c0479ecb705b04eb1d412be4789e3c7b37eb1baea89`.
- Anonymous public backend `/api/exams/results?exam_ids=9` **HTTP401**, expected.

## Actual production scope and urgent blockers
At ~15:38 UTC, active `app.assps.edu.pk` Nginx root `/var/www/assps-marks-register-p0-4ce2c5e3`, index SHA256 `aa29d4980a73d085a64c02ad14edd0d189531f5c727cc66ab49237bf1f9090c1`, live Diary **11/11 PASS**, Marks P0 imported, but public V5 Lesson Planner **FAIL**, Early Years print companion **FAIL**. **Do not deploy an older Diary-only or V5-only build**; newer Marks view/edit/print must remain.
Core full-stack signed Ed25519 receipt intake was absent, reviewed worker module absent from running backend, genuine independently signed School2 denial and teacher first-login security acceptance not certified. Official Core production gate previously **HOLD/exit2**. This integration does not assert production readiness.
Protected School1 Exam9 read-only invariant: **1,762** numeric rows, **213** true zero marks, **0** NULL, last checked after concurrent Marks P0; no record updated by this agent.
School1 saved diary date `2026-10-16`: **0** rows (15 Oct has 3). Do not fabricate homework or re-date previous Diary. Owner must have authentic 16 Oct Diary content saved and physically printed before claiming end-to-end acceptance.
Emergency production release only under SaaS Core's genuine signed gate, approved backup/rollback, current Nginx root hash check, independent peer-school/role HTTP security and real authenticated Diary Save→Reopen→Print; after promotion run **all four** reachable-feature postflight checks and verify current Marks P0 functionality.

## Additional genuine no-data-loss fix after first release build
Current MarksSheet source had an obsolete regression test and a real failed-reverification risk. The `searchStudents` network error branch cleared `marks` and `savedMarks` after a failed saved-results read; search initialization also discarded last-known savedMarks before read success. Fixed both in isolated source without any production SQL: preserve the same-exam/class/subject in-memory marks and unsaved edits when backend is unavailable; `marksLoaded=false` keeps Save disabled until re-verification succeeds. Scope changes already invoke `resetRoster()`, preserving cross-class/tenant isolation. Test adapted to the refactored `resetRoster()` abstraction and real failed-GET policy, **2/2 PASS**; reviewed teacher assignment/subject maximum tests **6/6 PASS**. Updated CI to require no-loss test and targeted Marks Register lint **0 errors** (full historical tree lint is still not certified). Rebuilt frontend optimized **PASS**, new exact HTML SHA256 `968a66357697b4113150e13ed8d2164e617e1d81db3246c11f0be29ba176edfe`; new Marks Browser Chromium **2/2 PASS**. These are QA-source and synthetic sessions only, not authenticated production acceptance.
