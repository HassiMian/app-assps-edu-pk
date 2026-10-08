# ASSPS Paper Studio — Phase 12 bilingual RTL two-column table print overflow

Date: 8 October 2026, ~18:27–18:34 UTC. **Isolated engineering candidate only — production RELEASE HOLD.**

## Source, ownership and boundaries

- Newly isolated branch `feat/paper-studio-phase12-bilingual-table-print-20261008`, worktree `/root/workspace/assps-paper-studio-master-phase12-20261008`, verified parent clean Paper Studio Phase11 `fa1dffebc4d615cd9611dd4eb54abccfd17b5b7f`. It retains previous Phase9 canonical saved-document round-trip, Phase10 rich HTML guard, Phase11 two-column **grid** wrapping. It does not repeat those fixes.
- Read issue #4 latest checkpoint and `docs/coordination/PAPER_STUDIO_MASTER_HANDOFF.md` from the separately maintained coordination scan worktree. Verified production release metadata before changes: frontend `24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92`, backend `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9`. No production database, official papers, student questions, marks, protected templates, PM2, firewall, Nginx or service changed.
- This phase belongs to Paper Studio **print renderer**. SaaS Core separately owns and has advanced signed real PostgreSQL Paper/Assessment security integration. Do not merge old editor backend source into newer Core authentication/privileged DB code. Academic Master approved Grade IX–X questions remain 0.

## NEW defect RED in actual Chromium, not a repeated Phase11 grid issue

- Phase11 covered CSS-grid `2-column-balanced` short questions. Distinct editor option `table-2-column` uses a fixed-layout HTML `<table>` with four cells per row and had **no constrained word wrapping** on question-data cells.
- Added **synthetic nine-question English/Urdu bilingual** short-section fixture with long unbroken Latin `LONGMATHSOURCETOKEN...` and long unbroken Urdu letter sequences, `table-2-column`, 9 marks, RTL, and odd first/second column balance (5+4). Unique test tokens `BILINGUAL-TABLE-01..09` ensure no question is lost. Fixture source is only inside the new isolated test harness and contains no real paper/student data.
- On original Phase11 renderer, Playwright **genuinely FAILed**: two question cells overflowed: one cell `scrollWidth=9143` vs `clientWidth=320`, another `1260` vs `320`; table `scrollWidth=9187` vs `clientWidth=731`. English/Urdu real DOM text was present yet visibly outside the print table; potential A4 clipped content risk. An earlier initial test script's `page.evaluate` call passed no document and produced a **harness error**, then was corrected before measuring this genuine prepatch red. Do not misreport harness error as the product's defect.

## Scoped source fix

- In `al-siddique-frontend/src/Modules/Paper-Generator/PaperEditor/official/OfficialSectionRenderer.jsx`, only the existing **table-2-column** answer-text `<td>` style gained `overflowWrap:'anywhere'` and `wordBreak:'break-word'`. The original fixed table layout, borders, individual serials/heading/marks, Urdu writing direction, user content, choice groups and edit actions remain unchanged. No string truncation, hard clip or altered official source.
- Same Chromium negative script after fix **PASS**: bilingual table preview `scrollWidth=732/clientWidth=732`, cloned **actual print iframe** `scrollWidth=731/clientWidth=732`. All nine identifiers present; five paired `<tr>` rows with exactly ordered 5+4 question pairings (`01,06,02,07,03,08,04,09,05`), proper RTL, actual Urdu and English phrases and original collapse borders verified, all data cells inside their widths, no loss.
- The actual print iframe HTML was rendered via Chromium `page.pdf({format:'A4',preferCSSPageSize:true,printBackground:true})`, nonempty **2-page A4 PDF**. This is genuine headless-browser pagination, **not** full PDF glyph-by-glyph inspection or physical printer acceptance. No claim of page-level visual manual approval.

## Actual tests

| Suite | Fresh result |
| --- | --- |
| NEW bilingual table preview/print iframe/A4 PDF Playwright | **1/1 PASS** after earlier product red; actual 2-page PDF |
| Phase11 independent odd grid Urdu, page PDF/browser | **1/1 PASS**, 8-page PDF, RTL 13+12 |
| Protected Urdu Workspace browser | **9/9 PASS** on isolated alternate acceptance port 5450 |
| Canonical DOCX/Urdu + unified official Workspace | **3/3 PASS** in final TAP log (remote wrapper timed out at 50s; TAP process finished after 52.86s, so wrapper is **not** claimed PASS) |
| Protected official 43-paper render+print text acceptance | **43/43 PASS**, TAP 1/1 PASS, **actual exit 0**, 265.50 seconds core test / 266.56 seconds overall; `/tmp/paper-phase12-all43.log`, `/tmp/paper-phase12-all43.rc` |
| `npm run verify:templates` | **PASS** six protected source templates unchanged |
| `npm run build` | **PASS** 2,519 Vite modules, 24.98s (concurrent browser/corpus load) |
| Source diff whitespace and isolated worktree | Must run after staging; no unrelated paper/data edits |

## Remaining actual release gates

- Additional bilingual long-passage physical page review, exact glyph and page-break visual comparison at school-installed Jameel Noori, all printer targets, full real staff browser-to-signed-backend Save/GET/Reopen/Print/Word authentication and time-of-check permission changes. Test fixture is synthetic, not authorization proof.
- SaaS Core must selectively forward-port this **narrow one-style frontend delta** onto its newest signed restricted-role Core candidate, without copy/overwriting its security logic or stale production base. Real two-tenant non-BYPASS RLS, key rotation, privileges, production-safe migrations and restore/rollback/perimeter/source ancestry gates are Core-owned.
- Historical chats and Phase3AE signed original reviewed ZIP/PG18 source are incompletely accessible and cannot be used as authoritative tests; issue #2/#3 remain operationally open. Grade IX–X authoring drafts are not independently approved.

**No deployment permitted until SaaS Core certification.** Rollback by reverting one scoped commit after review; no runtime rollback executed.
