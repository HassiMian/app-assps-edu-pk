# ASSPS SaaS Core Phase 19 — Early Language A4 printing containment

**2026-10-09 UTC · Isolated new source candidate · PRODUCTION RELEASE HOLD**

## Verified source, scope and ownership
- Clean pushed parent Core Phase18 `aa45db866b349bb2209bbf450b23ca6f2270d1b2`. Phase19 isolated branch `feat/saas-core-phase19-early-language-print-20261009` in `/root/workspace/assps-core-phase19-early-language-print-20261009`.
- Paper Studio owner Phase16 `bfebfed410bc5387547583b1d88c870add21d708`, clean owner worktree at inspection, controls the new SentenceUsageTable and PairPracticeTable print CSS regression. Owner commit was directly descended from its Phase15 `3713e023fefba80b73d844648e69eea7928cf172`.
- On latest signed Core descendant, selectively integrated **exact four owner-tested JSX CSS deltas** (SentenceUsageTable column headings TH and word TD, PairPracticeTable column headings TH and word TD) using checked owner patch applied to Core. Added only synthetic bilingual sentence/pair fixture and its owner-authored real Chromium test, isolated Vite port `5495`, explicit `node:buffer` import for JS lint portability.
- No whole Paper Studio backend/renderer cherry-pick, no changes to Core signed HMAC/DB session pool/tenant RLS/finance/attendance and no student data/official paper authoring/other master code modifications. Older ARCHV1 dirty production worktree preserved.

## Genuinely reproduced Core PREPATCH RED / POSTPATCH GREEN
- New fixture on **prepatch Core Phase18** actual Vite/Chromium printed English and Urdu adversarial long nonbreakable tokens (synthetic data only). **Prepatch suite exited 1; 0/3 PASS**. Sentence preview `scrollWidth 9760/clientWidth 731`; Pair Practice `9214/731`; several TH/TD cells overflowed by thousands of pixels. This is independently verified Core failure, not a copied owner claim.
- Applied exact four owner `overflowWrap:'anywhere', wordBreak:'break-word'` cell-style deltas. **Same Playwright suite exits 0, TAP 3/3 PASS** (parent scenario plus two subtests). Sentence preview `732/732`, printed frame `731/732`, actual Chromium A4 **3 pages**. Pair preview `731/731`, printed frame `731/732`, actual Chromium A4 **2 pages**. All synthetic English/Urdu tokens and original answer-line/edit handlers retained, no overflow hidden/truncation.
- No claim to real installed Urdu Nastaleeq PDF pixel/glyph manual review or school's actual Windows attached printer.

## Actual Phase19 build and acceptance
- Backend **261/261 JS syntax `node --check` PASS**; no backend source modified.
- Frontend protected original six templates unchanged **6/6 PASS**.
- Imported new test-file targeted ESLint **0 errors**, exit 0. Whole frontend ESLint remains separately known FAIL at ancestor Phase16 (707 errors, 46 warnings) and is a release blocker; no unrelated lint autofix.
- Full Phase19 isolated Vite frontend build **PASS with actual process exit 0**, `✓ built in 3.12s`. Exact lockfile from Core Phase18, reused prior isolated matching-version `node_modules` symlink; no separate fresh `npm ci` certification for this branch. Core Phase16 had validated scratch same-lock `npm ci` 315 dependencies.
- Protected First Term original **43/43 papers PASS** on exact Phase19 source: isolated `ASSPS_CANONICAL_CORPUS_PORT=5491 node --test canonicalAll43RenderPrintAcceptance.test.js`, **process exit 0** from controlled runner `/tmp/assps_p19_corpus43.exit`, complete 43 source-specific PASS markers, TAP one overarching PASS, fail/skip/cancel zero, overall duration `153385.12 ms`. Evidence `/tmp/assps_p19_corpus43.log`. This is independent Core descendant evidence, not copied from owner or Phase17.
- **Previous five browser print layouts 5/5 PASS on Phase19 source**, real Chromium A4 PDF/iframe tests for odd RTL numbered grid, bilingual paired short table, long MCQ matrix, Markdown SourceTable and Matching Columns, **process exit 0**, TAP fail/skip/cancel zero, duration `96911.25 ms`; evidence `/tmp/assps_p19_layouts_clean.log` and `.exit`. Together with the two NEW Early Language layouts, **seven independent print geometry cases PASS**.
- **Full suite initial run had a PORT COLLISION**, not a false product assertion: Paper Studio's simultaneous owner test occupied TCP port 5446, causing Core bilingual table test to fail `Port 5446 is already in use`; it then hung on incomplete Vite cleanup. Identified/terminated **only own Core test PIDs**. Reran the same five tests with temporary isolated unique ports `5621–5625`, all 5/5 PASS, then used `git restore --` **only inside Phase19 worktree** to remove all five temporary script changes before commit. Owner process untouched. No assertion that the original colliding run passed.

## Still blocked for SaaS Core production release
1. Phase19 original 43/43 paper automated text parity and all seven browser print/PDF geometry cases PASS; **human Urdu Nastaleeq glyph/page-by-page review and physical school-connected printer** remain acceptance blockers.
2. Production-equivalent separate signed Core/Paper non-BYPASS PostgreSQL login/RLS across 77 tables; bootstrap/service/platform super-admin bypass/restricted rules; tenant- and peer-denial read/write student, guardian, teacher, fee and attendance matrix; safe migrations, HMAC key rotation and backups/restoration.
3. Authenticated teacher JWT Paper Save → GET → Workspace Reopen → PDF/DOCX, Connect local-only source publishing/security/tenant uploads, independent Grade IX-X textbook provenance and human academic approval (still zero), server ingress/firewall, SSH rescue, frontend full lint, actual production artifact ancestry and rollback.
4. Old complete chats and original reviewed Phase3AE ZIP/PG18 source not independently recoverable; no inferred approvals.

**Decision: Isolated test candidate ONLY. No production rollout, live database writes/migrations, PM2, Nginx, firewall or SSH modifications.**
