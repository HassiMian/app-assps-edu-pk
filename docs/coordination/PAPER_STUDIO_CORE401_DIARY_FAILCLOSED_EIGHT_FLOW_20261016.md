# ASSPS Paper Studio MASTER — unified Core401 Diary failure-state release acceptance (2026-10-16)

**Verdict:** QA-only source improvement COMPLETE; PROD CUTOVER HOLD. Existing canonical teacher-facing Paper Workspace, official papers, Diary, marks and tenant policies unchanged. SaaS Core alone owns production release.

## Phase 1 — exact existing source (no restart, no stale deploy)
- Base: `integration/core401-paper-unified-diary5-20261016@2bd42380d916db7014f497ed32f9f0eead04cff2` (origin/local exact). It already contains Core Marks Save 401 source guard, Paper DOCX Jameel RTL and genuine zero-vs-blank formatting, backend safe rich-heading validation, and Diary 5/5 synthetic release suite.
- Isolated descendant `test/core401-paper-diary-failclosed-20261016`, separate worktree. Do not alter other Core, APEX Connect, Academic Master or release authority worktrees. The change is test/CI scope only: five tracked files + this evidence checkpoint.
- Existing 43/43 canonical official screen/print parity, DOCX binary/font/marks 9/9, real two-school JWT/Express/disposable PostgreSQL16 Paper/Diary/Lesson Save→Reopen→A4 PDF 1/1, authentic *synthetic* tenant denials 1/1, and Academic restricted source remain inherited reviewed evidence, not newly rerun on the test-only descendant. No claim of physical school hardcopy or real independent School2 signature.

## Phase 2 — strengthen fail-closed Diary guard
The previous runner checked four browser scenario groups comprising **5** assertions. Three additional *existing* browser acceptance tests were not in the official release gate: HTTP200 with `success:false` is not a saved diary; late HTTP500 must report the original selected class/section/date instead of the new selection; mismatched PUT server response ID must not certify or hijack an existing Diary record. These are previously coded features, not a new runtime bug claim. Their synthetic Question Bank bootstrap stubs are now consistent with the prior Diary revisit fixture, avoiding unrelated global session logout.

Changed only `ops/paper-studio/run_diary_release_browser_20261016.cjs`, `.github/workflows/paper-diary-real-browser-release-20261016.yml`, and `dailyDiarySaveResponseValidationBrowser.test.js`, `dailyDiarySaveErrorScopeBrowser.test.js`, `dailyDiaryPutResponseIdentityBrowser.test.js` in PaperEditor tests. Runner checks exact eight test assertions, zero fail/cancel/skip, and process exit 0; workflow watches all relevant paths and branch. No product runtime, DB or current frontend files altered.

## Phase 3 — actual executed results
- `node ops/paper-studio/run_diary_release_browser_20261016.cjs`: **8/8 PASS, RC0** (1 print/layout +2 Save/Reopen/foreign-tenant +1 late race +1 revisit same ID +1 HTTP200 success false +1 HTTP500 original selection +1 mismatched PUT response ID). Read-only browser synthetic server; zero printer jobs, no actual school login.
- Full transcript private root `0600` `/root/paper_studio_private_qa_20261016/core401-diary-failclosed8.log`; SHA256 `98a8d25a551343a0990904f662e4813430b311f528828164908272a08c4732d5`. Exit receipt in same folder `core401-diary-failclosed8.rc`, contents `0`, also `0600`.
- Metadata/manual/scoring Node tests **22/22 PASS**, protected original template integrity **6 files PASS**, runner JS syntax, `git diff --check`, parsed GitHub YAML job PASS.
- Fresh Vite build **EXIT0**. Exact compiled candidate index SHA256 `db0ef46c9922c049f0b150a1a2b00323c15c67967483cd02ccdafa48d0134237` is **byte-identical** to parent Core401, since runtime application source is unchanged.
- Compiled static five feature checks **5/5 PASS** (Diary, Early Years print, Lesson Planner V5, Saved Marks, Result Cards V3) explicitly `productionReleaseAuthorized=false`.

## Phase 4 — production non-destructive boundary
- Checked public `app.assps.edu.pk` and `api.assps.edu.pk` HTTPS 200/200; read-only actual `exam_results` 1,763 rows with 213 genuine numeric zero marks and 0 NULL marks_obtained. Existing Core emergency signed Marks Save upstream is Core-owned. Do not invent or re-upload failed Class One missing values.
- No Nginx/PM2 reload, backend adapter/worker install, official or student Paper/Diary write, academic approval, database DDL/DML, live print, credentials impersonation, physical Windows printer job or cross-tenant actor signoff.

## Phase 5 — Core signed cutover gate
- Last independently recorded official Core release authority: **6/13 PASS, 7 HOLD**, including approved complete ACL backup/current signed offhost restore, signed restricted persistent worker transport, exact reviewed production adapter, separate authenticated persistent worker, independent effective-grants audit and real School2/unassigned-subject signed denial. Read-only probes and synthetic browser tests cannot substitute for signed third-party evidence.
- SaaS Core must check newest production ancestor, review only the scoped QA/CI files, collect legitimate independent signatures, then perform one rollback-ready controlled deployment and genuine school printer/teacher Save→Reopen acceptance. No public release authorized by this checkpoint.
