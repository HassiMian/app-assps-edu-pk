# ASSPS Paper Studio MASTER — current Core58 / Lesson A+B legacy-clone acceptance

**17 October 2026 PKT.** One coordinated Paper Studio mission, source-only, no production deployment. Core remains sole DB/RLS/production release authority. Paper Studio owns canonical Paper Workspace/official papers, lesson planning, diary and Urdu print fidelity. Grade IX–X academic publication approval is NOT owned here.

## Phase 1 — Recover actual latest rather than restart

- Source of truth: GitHub issue #4 and its Paper Studio master handoff plus actual VPS worktrees, immutable ancestry, data and QA receipts. Entire old ChatGPT transcripts are not available byte-for-byte; do not infer unresolved past conversation acceptance.
- Current Core owner source `integration/core503-marks-urdu-teacher-print-scope-20261016@58a111c82e4e2051ecab08960cf4c68c25085a24` incorporates reviewed Paper exact effective class/subject/section teacher print boundary and independent Urdu 38-row post-save receipt. Do NOT redo the already integrated patch from Paper `214aae36`.
- Actual latest Lesson Planner owner source `feat/lesson-ab-subject-unification-exclusions-20261017@ebf13f4cf0e87a655d9c55be6d4aaca2319b9388` is clean, identical to origin, a strict descendant of Core58 through Paper `a36fd532`. It handles 59 immutable source candidates, two principal-excluded entries and exactly six A/B subject merges in classes One/Two/Three (10 active classes / 51 active subject rows). New legacy A/B clone-before-save fix is INCLUDED in ebf; no duplicate runtime patch.
- Separate new worktree `test/paper-lesson-ab-legacy-ebf-ci-20261017` forked from exact ebf. Paper audit `60e9a1e3` two test-only files were cherry-picked cleanly (as distinct new commit) onto ebf; not a stale production candidate. Existing Paper and Core owners' working trees and all old documents, marks, grades, backups and classes are preserved.

## Phase 2 — Exact source behavior and genuine synthetic browser tests

- Current latest native frontend `plannerABMergeExclusion.test.mjs` and `termPlanningModel.test.mjs`: **16/16 PASS, RC0**, root-only SHA256 `c4bdad8d581bbaabeca9a1e714afd7b0d3cafe01f5c500952de1993a79e5e08f`. Includes explicit fail-closed legacy separate English A/B or Urdu A/B plan detection, nonmatching classes, source revision and nonpublication.
- Current latest Chromium `plannerLegacyABCloneBrowserQA.mjs` using only original private review manifest and mock school server: **RC0**, `LEGACY_WEEK_CLONED_POST_NOT_PUT`, `LEGACY_TERM_CLONED_POST_NOT_PUT`, both prior parts preserved and no historical revision overwritten or academic publication. Root-only SHA256 `dac10575493f185ff43338da7e4698164855bf46fde8f458a65adcce5ed54aaf`.
- Current latest Chromium `plannerABBrowserQA.mjs`: **RC0**, Class One 6 / Two 5 / Three 6 visible subject rows with [A]/[B] provenance, all 10 active classes/51 rows; synthetic A4 student card layout 5 pupils with 2/page ->3 pages, 3/page ->2 pages, 4/page ->2 pages. No real student PII or production API write. Root-only SHA256 `0428f1e4c469db29565fa663e78dfd4e06fc8aa24cfe5501bdcac0f080e8783b`.
- Strict protected-template verification: six official source templates unchanged PASS. Canonical `PaperDocument` 43-paper corpus preserved; not a new approved question bank or real school printed hardcopy.

## Phase 3 — CI coverage and further canonical regression

- Source-only `.github/workflows/paper-lesson-ab-regression-20261017.yml` forward-ported to current ebf lineage, updated to run against this audit branch and the newest actual legacy clone native unit via Node22; `contents:read`, no secrets, database/passwords, deployment authority, production browser or printer. The private-manifest Chromium tests run only on protected VPS fixture and are NOT hosted CI steps.
- Workflow also checks all six protected templates and exact 43-paper corpus count. Local YAML parse/least privilege/CI steps verified; independently hosted GitHub Actions status must be observed, never fabricated.
- **NEW completed exact-source 43/43 Chromium acceptance:** Original `canonicalAll43RenderPrintAcceptance.test.js` executed against this current `ebf13f4` app source with a 720-second hard timeout. Every individual official First Term paper `PHASE14 1/43` through `43/43` reported PASS, encompassing Urdu RTL and English/Math/Science/Islamiyat/Computer papers. Node TAP **1/1 suite PASS, process exit code 0**, zero skips or failures, duration `466754.619511` ms. Root-only mode-protected log `/root/assps-release-evidence/paper-studio-legacy-ebf-20261017/canonical43-full.log`, SHA256 `d03b2b714a67785237bbe1ca15747cc17a47bb6f5a662a0c10af9216374a1880`. This **supersedes** a preserved earlier 165-second partial 14/43 watchdog RC124; it is still a localhost Chromium screen/print test and NOT genuine Ricoh hardware hardcopy or Core signed production cutover.

## Independently executed final companion tests

- Canonical Paper semantic parity / DOCX model / editor invariants / printed marks ledger parity: **15/15 PASS RC0**, SHA256 `4cab1fa61e165181ba5714a420038c41413e7762deb89e3a81871b9bc01379c1`.
- Actual local isolated Express HTTP synthetic same-school assigned/revoked/unassigned teacher vs peer school/student-safe question projection/staff-only answer privacy: **14/14 PASS RC0**, SHA256 `f9cc066f68eee9a7778b01155fae94395b3cf749bae243ab5d598f566b0429da`.
- Backend canonical 43 DOCX projections with mathematics/immutable diagram ZIP packaging: **8/8 PASS RC0**, SHA256 `17426dbbcc0d4b3d40f5d14c53a45453f5ca3357743cc300e4652215a6b44fa9`.
- Pinned backend/frontend `package-lock.json` digests exactly matched previously reviewed installed dependencies. Only isolated test-worktree symlinks were used and both were removed after testing; neither shared target nor published app source was mutated.
- Public API after previously identified 502 incident: **five** consecutive sampled HTTP `health200/login200/anonymous auth-me401`; existing public stable Next Build ID `ONDwxEIZlx5onDIKY7wYf`, green PM2 process historic 30,947 restarts did not increase during this verification. Short samples do not prove sustained SLA or official Core signoff.
- GitHub source-only CI pushed; combined commit statuses and associated PR workflow runs returned empty. Hosted Actions remain **UNVERIFIED**.

## Phase 4 — Live read-only readiness and operational caveats

- Authorized Principal Chrome earlier genuinely saved original 38 Class One Yellow Urdu First Term records. Independent Core 38/38 exact source matches and preserved previous 152 other subject rows. Current read-only PostgreSQL reports `exam_results=1801` and genuine numeric zeros `213`, no current marks changes by this mission. **Urdu marks ARE SAVED**; formal `exam_subjects` maximum/pass approval still pending, so publication not certified.
- `teacher_class_assignments` actual total/active = `0 / 0`; new teacher exact-scope print protection remains operationally fail-closed until genuine institution-approved assignments. Never guess or auto-fill role assignments from timetable labels.
- Public API intermittent 502 incident investigated by independent Core/Connect. Stable OLD signed Next build was recovered on green :3002 via Core/Connect report; public app/API Login and health 200, anonymous auth/me 401 on fresh read-only spot check. Historical green PM2 restart storm (~30947) still deserves Core incident review; successful short samples alone do not certify sustained uptime or signed release.
- Windows Jameel Noori font subset + A4 PDF MediaBox proved on synthetic native Chrome PDF in earlier owner QA; Ricoh/Samsung physical hardware `WorkOffline` and hardcopy/real authenticated Diary or Paper print not yet certified.

## Phase 5 — Exact release ownership, hold and rollback

- New source diff is exclusively protected test/CI/docs. No live frontend/backend deployment, DB DML/DDL, actor impersonation, password extraction, RLS/roles, Nginx/PM2 restart, printer job, original paper edit or unauthorized bank approval. Source rollback is revert of test-only commit(s); live rollback unnecessary because nothing from this branch deployed.
- SaaS Core alone must reconcile latest owner source and independent live teacher positive/peer-school negative authorization, school-approved assignments, Lesson Save->Reopen->Print, 43-print/Diary15 physical acceptance, independent full ACL offsite recovery, signed restricted worker transport/adapter/auth/grants, independent peer School2 denial and rollback witness. Last signed Core release status: **6/13 HOLD**, with seven external security items missing; no synthetic signer or bypass may claim deployment success.
- This is one authoritative source/evidence continuation, not independent release or fragmented competing implementation. GitHub issue #4 is the coordination record and must remain open until all genuine release gates pass.
