# ASSPS Paper Studio — Phase 11 RTL odd two-column long-text print overflow

Execution: 2026-10-08 ~18:11–18:21 UTC. **Isolated, not deployed.** This is a Paper Studio-owned continuation from Phase10, not a restart or a Core SQL worktree merge.

## Source / coordination and scope

- Verified prior pushed clean Paper Studio HEAD `f01d9eb614314d015a79b907abf2ebeacc8405ed`, new branch `feat/paper-studio-phase11-rtl-pdf-20261008`, isolated worktree `/root/workspace/assps-paper-studio-master-phase11-20261008`.
- Read canonical handoff from `/root/workspace/assps-four-master-gate-scan-20261008/docs/coordination/PAPER_STUDIO_MASTER_HANDOFF.md`; GitHub coordination issue #4 reviewed before and during execution. Core latest separately owns signed Paper/Assessment RLS, including newer Phase11 PostgreSQL session reset; do not modify its active or dirty worktrees. Full historical ChatGPT transcripts and Phase3AE reviewed ZIP are not demonstrably accessible byte-for-byte; not used as release authority.
- Verified LIVE release-meta frontend `24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92` and backend `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9` before execution. No deploy, live DB/roles, migration, student, fee, academic question, saved/official paper data, font files, PM2 or firewall changes.

## Genuine prepatch defect, red/green source evidence

- Built an isolated **25-item long Urdu numbered short-question** fixture. It intentionally includes one 420-character nonbreaking Urdu word, several long response prompts and unique `PRINT-PROOF-01` to `PRINT-PROOF-25` markers. Paper carries 25 marks, RTL language, **2-column-balanced** renderer and an **odd** 13+12 item split. Only test fixture, never an official paper or production record.
- On real Playwright Chromium before fix, all 25 items were present in RTL visual columns but the CSS grid's content **overflowed horizontally**: `scrollWidth=7017`, `clientWidth=732`; explicit assertion FAILED (real red). This makes printable text prone to clipping outside A4 even when question/mark count remains correct.
- Scoped change in actual `PaperEditor/official/OfficialSectionRenderer.jsx`: set two grid tracks to `repeat(2,minmax(0,1fr))`, and give the existing numbered answer-text flex cell `overflowWrap:'anywhere'`, `wordBreak:'break-word'`. Retains its per-item editing, marks, numbering, RTL presentation, answer-line logic and protected official text. No truncation or string replacement.
- Same original Chromium test PASS after patch. Precise **preview 732/732** scroll/client width and **cloned print iframe 732/732**. Every item marker present exactly in the print clone, RTL direction retained and 13+12 columns preserve numbering 1–25 (with item 13 ending first RTL column and 14 starting second). Bounding boxes constrained inside print section width.
- Real browser compositor test: took the **actual print iframe HTML/CSS**, ran independent headless Chromium A4 `page.pdf()` and measured **8 PDF pages** (valid nonempty PDF). This proves Chromium pagination was actually invoked; does **not** prove every page's text glyph was visually inspected, exact font installed on VPS, or physical printer fidelity. Screenshot/full PDF content human review is still outstanding.

## Executed tests

| Test | Exact observed result |
| --- | --- |
| New `rtlOddLongTwoColumnPrintBrowser.test.js` | **1/1 PASS**, negative prepatch overflow 7017/732; postpatch preview+print iframe 732/732; 25 markers; 13+12 odd RTL; Chromium A4 8-page PDF |
| Existing Urdu Workspace `ASSPS_PAPER_ACCEPTANCE_PORT=5440` | **9/9 PASS** |
| Phase8 cross-field actual mouse-drag + Phase9 canonical save/reopen Chromium | **6/6 PASS**, full TAP log; remote wrapper timed out after 50s under concurrent corpus/build load, **but test process completed 74.4s later with 0 failures**; wrapper success not claimed |
| Canonical DOCX Chromium | **2/2 PASS** |
| Unified official Workspace browser | **1/1 PASS** |
| Protected template integrity | **6 original template files unchanged, PASS** |
| Final Vite frontend build | **PASS**, 2,519 modules, 28.26 seconds under concurrent browser tests |
| Protected 43-paper render and print-text parity | **43/43 PASS**, process exit 0, 255.26 seconds; `/tmp/assps-paper-phase11-all43.log` and `.rc` |
| Whitespace / isolated source paths | `git diff --check` PASS |

Previous Phase10 backend heading HTML guard/new Express HTTP tests and Core signed-RLS work are preserved, not repeated. No changes to protected exam questions or academic approval status; Grade IX–X human source-reviewed and approved count remains zero.

## Remaining acceptance/release gates

1. Add separate **bilingual mixed English/Urdu** real pagination and multi-page visual pixel/glyph review; this fixture proves a synthetic *Urdu* adversarial case and print-clone geometry only. Physical Windows/USB/Wi-Fi printer test and actual Chrome print operator still not available on this VPS; not claimed.
2. Actual tenant JWT/signature auth, independent Paper LOGIN non-BYPASS RLS, teacher-assigned school/peer/other-tenant server save/get/reopen and question rich HTML safe validation on **Core's latest stage clone** remain controlled by SaaS Core. Do not port older branch's unsigned transaction methods.
3. Issue #3 selection and odd-column bugs now have browser-level regression; retain issue open until authenticated real teacher, full print/PDF/DOCX, mixed bilingual and physical acceptance. Issue #2 Phase3AE/PG18 artifact recovery pending. Grade IX–X approved-snapshot gate remains empty.
4. Core-only production release gate includes migrations, grants, privilege/bootstrap/Connect, perimeter/SSH rescue, artifact ancestry, restore/rollback and human operator signoff. **No production deployment.**

Rollback: revert/cherry-pick this scoped Paper Studio commit only after review; no production rollback action attempted.
