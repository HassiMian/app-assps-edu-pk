# ASSPS Paper Studio Master — Phase 15 RTL/English Matching Columns A4 print containment

Date: 9 October 2026 ~01:16–01:24 UTC. **Isolated un-deployed engineering; Core certification HOLD.**

## Source of truth and safe branch

- GitHub issue #4 read first; latest Paper Studio Phase14 `a6d2d17be60f7a4c098e9f0fb0b54495d60fd655` clean and remote SHA matching. Paper Studio Phase13 `58c715eb`, Phase12 `3377266f`, Phase11 `fa1dffeb`, Phase10 `f01d9eb` are prior completed evidence and were not reimplemented. Separate Core Phase15 signed-protected integration `bd8011ae` and its independent Phase16 worktree left untouched. Read authoritative coordination handoff from `/root/workspace/assps-four-master-gate-scan-20261008/docs/coordination/PAPER_STUDIO_MASTER_HANDOFF.md`.
- New clean Paper Studio owner worktree `/root/workspace/assps-paper-studio-master-phase15-20261009`, branch `feat/paper-studio-phase15-matching-rtl-print-20261009` directly from Phase14. Production release-meta at start: FRONTEND `24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92`, BACKEND `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9`. No production DB, tenant records, official papers, first-term source, template, grade IX/X academic data, roles, migrations, network, PM2 or deployment touched.

## New genuine RED→GREEN issue (distinct from existing table formats)

- Previous repaired render paths: 2-column short CSS grid; 2-column short table; MCQ matrix table; arbitrary Markdown `SourceTable`. Separate **MatchingColumnsTable** (`data-matching-columns-table`) still used fixed-layout two-column HTML table. Its editable A/B **header cells and answer-row cells lacked overflow wrapping** for very long unbroken Urdu and English tokens.
- New isolated 5-mark, five-pair bilingual RTL teacher fixture, synthetic only, with custom long A/B header text, 195 Urdu characters and 27 repeated long scientific English measurement words in matched cells, stable markers `MATCHING-CELL-01..05`. Test loads actual Vite-served Paper Workspace, measures DOM geometry and all visible header/response cells, clicks Print/Save PDF, measures independently the **actual cloned print iframe**, then runs Chromium real A4 print-to-PDF from that print frame.
- **Before change, Playwright RED:** table `scrollWidth=10326` vs `clientWidth=732`; four header/response cells overflow: `616/365`, `6153/365`, `1864/365`, `9960/365`. Two patch attempts were rejected by a safe script assertion because a generic substring occurred more than once (first in entire file, later in component due to an InlineEditable style). No source was modified in those two attempts; source patch was then constrained to the actual HTML table header and response cells.
- **Narrow fix:** only `MatchingColumnsTable`'s `<th>`/`<td>` React inline styles gained `overflowWrap:'anywhere',wordBreak:'break-word'`. No text deletion/clipping, no change in table/heading content, source row/answer serialization, marks, RTL, per-header/per-cell inline editor, academic source, fonts or grid.
- **Same script GREEN:** actual Chromium table preview `scrollWidth/clientWidth=731/731`; printed iframe `731/732`, zero overflowing cells/headers, all five unique pair markers preserved, both Urdu and English text present. Real headless Chromium A4 PDF from printed iframe produced **2 pages**. Physical printer, actual glyph-by-glyph PDF visual inspection, signed teacher end-to-end DB persistence NOT claimed.

## Fresh verification

| Gate | Evidence |
| --- | --- |
| New real matching headers/answer-row RTL bilingual Chromium + iframe + A4 PDF | **1/1 PASS** after actual RED; logs `/tmp/paper-p15-matching-red.log` / `/tmp/paper-p15-matching-green.log` |
| Prior Phase11 RTL odd grid, Phase12 bilingual short table, Phase13 MCQ matrix, Phase14 Markdown SourceTable print | Independent 4-case process `/tmp/paper-p15-prior-print.log` and `.rc`; final status to be recorded after completion |
| Protected 43 official First Term source-render and print-text parity | Controlled independent process `/tmp/paper-p15-all43.log` and `.rc`; final status to be recorded after completion |
| Protected template `npm run verify:templates` | **6 original templates unchanged, PASS**, exit 0; `/tmp/paper-p15-templates.rc` |
| Frontend Vite build `npm run build` | **PASS 2,519 modules, 34.90s, exit 0**; `/tmp/paper-p15-build.log`, `/tmp/paper-p15-build.rc` |
| Scoped JS/JSX/test/doc files + staged whitespace, Git remote branch and clean worktree | Verify before declaring completion |

**Final release HOLD:** Core alone certifies latest signed non-BYPASS Paper session/RLS, staff Save→GET→reopen→print and PDF/DOCX, Grade9–10 approved question snapshots (currently zero), original Phase3AE PG18 artifact recovery, tenant perimeter, backup/rollback and manual Windows/connected printer Jameel Noori visual signoff. Historical chats/reviewed ZIP not independently byte-for-byte accessible. No deployment allowed until Core passes gates.
