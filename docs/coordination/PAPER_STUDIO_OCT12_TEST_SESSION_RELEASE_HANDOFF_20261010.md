# Paper Studio — 12 October test-session release handoff (10 October 2026)

## Ownership and source provenance

Paper owner isolated candidate `test/paper-diary-core-reconcile-20261010`, current source after this report's code commit `385b5cd1c14dbc6398879c543d873174b8c4c21f`, originally derived from Core candidate `b5df66a79f6eaad3b875a0db5c99a6633e6127ff`; it is NOT a Core-signed release branch. Exact deployed release metadata **still** frontend `24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92`, backend `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9` in read-only VPS check. Never deploy this Paper branch directly over the newer Core source. Core must reconcile all changes with its own latest signed frontend and backend descendants before certification.

## Owner fixes on branch

- Earlier integrated Diary late-save revision preservation and safe initial draft hydration (`4bf5c30e` selectively reconciled as `a1c9117a`, further repair `9212c7f3`); Urdu MCQ and Elite preview fixes inherited from Core integration parent.
- Eliminated unused vertical parser declarations (`db0a88c2`), 37 obsolete Paper React default imports (`b40ab854`), three unused bindings (`a4d7e6f8`).
- Replaced scanner class/subject/publisher cascading setState effects with class/subject change handlers, preserving auto-prefill only for an empty publisher (`a9ac347f`); focused ESLint zero issues.
- Fixed actual React Rules of Hooks violation in BuildPaperWizard's Save Paper click handler: usePaperStore now called unconditionally in PreviewStep; resolved conditional useMemo after Early Years branch in PaperEditorRouter; removed duplicate overriding moduleAccess property; made DOCX embedded-image base64 Node Buffer guard use `globalThis.Buffer` with browser `atob` fallback (`8c86c554`).
- Removed 99 source-import no-unused findings without dropping existing module side effects, and replaced undefined Node test globals with explicit imports / globalThis (`385b5cd1`).

## Evidence rerun on isolated candidate

- Paper-only complete ESLint at intermediate exact source: **361 errors, 12 warnings** over 286 files. After edits: **224 errors, 12 warnings** over 286 files (fresh captured `/tmp/assps-paper-test-session-lint-final.json`, process EXIT1). This is substantial reduction, **NOT zero lint**. Full frontend tree remains uncertified and also includes Core/other-owned paths. No lint rules suppressed, no fake PASS.
- Optimized Vite frontend build PASS exit0 `/tmp/assps-test-session-afterglobals-build.log`; legacy Results protected reference templates **6/6 hash unchanged** `/tmp/assps-test-session-afterglobals-template.log`.
- Paper model/tenant-store/DOCX/migration/Diary 24/24 PASS `/tmp/assps-session-node-globals-regression.tap`; separate DOCX/math assets and migration 24/24 PASS `/tmp/assps-session-final-model.tap` (different suites, not totalled as distinct questions).
- Genuine Chromium acceptance: canonical Urdu Workspace 9/9 `/tmp/assps-session-urdu-browser-final.tap`, Early Years + Lesson Planning 13/13 `/tmp/assps-session-early-lesson-final.tap`, canonical marks/metadata 12/12 `/tmp/assps-session-marks-final.tap`, official/vertical-math preview/print 2/2 `/tmp/assps-session-official-print-final.tap`, Early Years blank self-service 2/2 `/tmp/assps-session-ey-selfservice-final.tap`, personalized durable print 1/1 `/tmp/assps-session-print-persistent.tap`, bilingual MCQ matrix 1/1 `/tmp/assps-session-bilingual-mcq.tap`. Synthetic/mock HTTP in these browser suites is NOT real tenant auth.
- Static RLS and artifact guards 5/5 PASS `/tmp/assps-session-security-static.tap` (logic/unit only, NOT connected production RLS).
- Authenticated teacher create/save/reopen/print isolated DB test: **SKIPPED** because disposable teacher DB and credentials not provisioned to this candidate (`/tmp/assps-session-teacher-save-browser.tap`). DO NOT count skipped as pass.
- Repo Git diff --check PASS, isolated candidate worktree clean on publication, origin SHA verified.

## Cross-owner latest evidence / release blockers

- SaaS Core issue #4 checkpoint: live Nginx private upload aliases remediated with 7/7 gate PASS and localhost TLS smoke; disposable real restricted SCRAM signed PostgreSQL role clone 13/13 PASS. These are Core-owned proofs, not evidence of live frontend/backend publication.
- **P0 still OPEN:** 10 October read-only live PostgreSQL role query independently reconfirmed `apexos_user` LOGIN=true, BYPASSRLS=true; `apex_app_runtime` NOLOGIN, BYPASSRLS=false. Live signed restricted teacher/tenant actor authentication and cross-tenant role matrix are NOT certified. Do not change production roles from Paper-owned branch.
- Core Phase7 Results signed HTTP fixture gate failed due missing clone rows; Phase8 Paper signed HTTP clone timed out; missing fixtures/approved credentials must be coordinated with Core for repeatable role HTTP acceptance. No workaround via privileged production login.
- Basic Ricoh MP C307 A4 physical paper exit was user-confirmed in issue #4; multi-page English/Urdu Jameel Noori Nastaleeq print + DOCX glyph positioning, attached generic printer matrix, color/mono fidelity still require actual on-site signed sample. Windows remote workstation was STANDBY at last check; cloud source work continues independently.
- Grade IX/X separate Academic owner reports zero independently human-approved selectable revisions. Do not make provisional textbook-derived content 'approved' for Monday tests. Teacher-authored/manual papers remain the fallback subject to teachers verifying questions and marking scheme.
- 43 completed historical papers are reference fixtures for preserving **pattern, marks, numbering, editor, RTL and print structure**, not a fresh new-content approval baseline and were not altered.
- VPS root disk 89% used at last check; avoid duplicative package installations or deleting protected sources/backups.

## Required next owner actions before any release

1. Paper owner: finish remaining 224 Paper ESLint errors + 12 warnings without suppressing rules; regress all canonical editor, save, print and multi-tenant paths after any fixes.
2. Core owner: reconcile new Paper commits from exact Core predecessor through candidate HEAD with latest Core candidate (including marks corrections); no direct branch overwrite. Repeat reproducible optimized build and authenticated teacher save/reopen/print and sign-off using disposable properly scoped actor fixtures.
3. Core owner: migrate production app to least-privilege, non-BYPASS database runtime only through signed credential/release protocol, prove tenant/role negative and positive tests, validate rollback. No production role change by Paper.
4. Core owner: repeat signed Results and Paper HTTP clone suites with valid scoped fixtures; independently confirm deployed artifacts + recovery/rollback and secured live Nginx post-cutover.
5. School printer/academic owner: independently sign off actual Urdu/English printed copies, marks totals and real approved Grade IX/X question revisions. Teacher manual entries may be used only with normal academic checks.
6. **Only after** all real release P0 gates pass may SaaS Core schedule the separately approved controlled production promotion. Current status RELEASE_CERTIFIED=FALSE; APPLICATION_DEPLOYMENT=HOLD.
