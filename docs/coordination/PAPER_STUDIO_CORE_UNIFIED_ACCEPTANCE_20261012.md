# ASSPS Paper Studio — three-checkpoint Core-descendant integrated source acceptance (2026-10-12)

## Ownership and immutable boundary

Paper Studio owns the canonical teacher Paper Workspace, Early Years, Diary, Lesson Planning, paper schema/editor, saved papers, Urdu RTL, print/PDF/DOCX. SaaS Core alone owns production deployment and production RLS/network/DB migrations. Grade IX–X question provenance and genuine approval belong to Academic Master. Coordination: GitHub issue #4.

**Checkpoint 1 — Current-source recovery and non-destructive integration (completed).**
- GitHub Core release branch verified at `00da1e296c3116086a1d1e98c272eb0534e4ee8e` immediately before integration and checked again during QA; this supersedes older Core and Paper chat release anchors. Public frontend compiled release reported in Core issue #4 remains source `8b5d370e`; this operation did not change production.
- New isolated worktree `/root/workspace/assps-paper-core-unified-acceptance-20261012`, branch `test/paper-core-unified-acceptance-20261012`, forked from that exact Core HEAD. Existing Paper worktree/remote `test/paper-oct11-owner-safe-lint-20261011` preserved clean.
- Applied exactly one previously proven Paper-owned commit `05d1c89a` with `git cherry-pick -x`; integration commit `816aa309` (24 Paper files, 200 additions, 307 deletions), no conflicts. This avoids deploying the stale standalone Paper branch over Core marks/cards and security changes.
- A reproducible DOCX acceptance harness issue was found by the new integrated run: `canonicalDocxModel.test.js` depended on the caller's cwd and could not locate the 43-paper corpus when launched from the frontend directory. Changed fixture resolution to `import.meta.url` anchored at the test module; zero paper/schema/assertion changes. The same test now passes both corpus and RTL/table/math assertions with 43/43 documents, 1,027 nodes, 612 RTL blocks, 315 tables, four vertical-math models.
- Added a fail-closed, evidence-directory-isolated offline QA command: `bash ops/paper-studio/run-unified-candidate-qa-20261012.sh`. It refuses DB connection env and evidence overwrites. It does not provision a DB, contact live signed-in school APIs, or perform release/production actions.

**Checkpoint 2 — Regression acceptance on integrated Core-descendant source (completed to explicitly listed gates).**

| Actual freshly executed gate | Result | Scope/limitation |
| --- | --- | --- |
| Protected premium Result Card hashes | PASS, all six protected files | Byte preservation |
| Production Vite build | PASS, 2,535 transformed modules | Compiled isolated source, not deployed |
| Paper RLS role + artifact guard unit tests | 5/5 PASS | Unit fixtures, not signed real roles |
| Canonical editor Chromium | 20/20 PASS | Draft/save/reopen and corrupted source safely handled in synthetic browser |
| Structured migration / 43-paper DOCX model / MCQ-boundary | 43/43 PASS | 43 historical schemas retained as patterns |
| Early Years Chromium | 13/13 PASS | Distinct Starter/Mover template identity |
| Urdu Workspace + A4 Chromium PDF | 10/10 PASS | Two genuine synthetic-source A4 PDF binaries generated; no physical printer signoff |
| Daily Diary + Lesson Planning Chromium | 2/2 PASS | Synthetic saved-bridge workflow |
| Official Workspace route | 1/1 PASS | No legacy editor regression |
| Inline selection/theme browser V11 + V12 | 12/12 PASS | Undo/redo, Urdu paragraph, print-clone selection |
| First Term ID9 Marks browser | PASS | Synthetic exact-zero-vs-blank, edit-only save, roster and refresh checks; not actual school marks |
| ESLint Paper-owner partitions | 0 errors / 4 warnings, all exit 0 | Two AIGeneratorTab unused deps; one editor store-registry identity dependency; one Early Years inspector selected-object dependency. Do not blindly remove dependencies: browser/selection identity must be preserved |
| `git diff --check` | PASS | No whitespace errors |

These are disjointly executed named test processes: 106 passing individual Node/TAP assertions across the guard/model/Chromium groups listed above, plus template/build and marks-browser gate successes. The unified shell command had an initial FAIL at the cwd-dependent DOCX test; the fixture-path issue was fixed and all listed suites were rerun successfully using separate direct commands because the remote command service's execution timeout is bounded. **Do not claim the entire new shell mission ran end-to-end after the fix.** Full SaaS frontend ESLint and actual signed teacher/DB tests are NOT certified by these Paper-only results.

**Checkpoint 3 — Explicit blockers, remaining acceptance, and SaaS Core release handoff.**
1. **P0 Core network containment remains unverified:** issue #4 documents confirmed external direct TCP 3000 and 5000 exposure. Core prepared containment source, but a privileged live rule application was blocked and NOT applied. Paper owner does not alter firewall or service binds; release remains HOLD pending reviewed containment, off-VPS negative probe, HTTPS/SSH positive probes and rollback evidence.
2. Real Principal/assigned-teacher/cross-tenant signed acceptance of saved papers, Diary/Lesson, and real First Term marks SAVE→reload→actual nine Result Card print styles requires authorized session and authentic school records. No marks fabricated and no school DB updated by this Paper branch.
3. Physical multipage Urdu Nastaleeq A4/A5 and exported DOCX/PDF acceptance must be witnessed using the connected printer, which was not available to this remote test environment; synthetic A4 Chrome PDFs are not a substitute.
4. Grade IX–X Academic Master still requires independent faculty/source-revision approval before candidate questions may be selected as approved in Paper Studio.
5. Core/other-module whole frontend lint warnings/errors and potential disk/capacity issues require their own owner. Disk observed 48GiB total, about 5.1GiB available at checkpoint; no cleanup, backups deletions or destructive migrations attempted.

**Release instruction:** SaaS Core must inspect this exact branch and cherry-pick/merge only its Paper-owned commits onto its latest reverified release descendant, run Core signed RLS/role/real-marks acceptance and remaining external gates, then deploy only after certification. Never deploy this candidate directly. Preserve all 43 template-pattern fixtures, six Results hashes, actual school data, older Paper branches and separate Academic/Connect workstreams.

Status: `PAPER_CORE_DESCENDANT_SOURCE_INTEGRATED=PASS`; `PAPER_LISTED_QA=PASS`; `REAL_SCHOOL_SIGNED_AND_PHYSICAL_ACCEPTANCE=PENDING`; `CORE_NETWORK_CERTIFICATION=HOLD`; `PRODUCTION_RELEASE_CERTIFIED=FALSE`; `PRODUCTION_MUTATION=NONE`.
