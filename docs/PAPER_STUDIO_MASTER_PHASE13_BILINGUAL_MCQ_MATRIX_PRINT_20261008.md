# ASSPS Paper Studio — Phase 13 MCQ matrix bilingual long-word A4 print overflow

Date 2026-10-08 ~18:51–19:01 UTC. Isolated owner engineering only, **production RELEASE HOLD**.

## Source and coordination

- Verified branch `feat/paper-studio-phase12-bilingual-table-print-20261008` exact previous Paper Studio owner commit `3377266ff40d00c82e499bd5ac6859d5ee90ced6`, GitHub remote SHA matches and source worktree clean before any change. New isolated descendant worktree `/root/workspace/assps-paper-studio-master-phase13-20261008`, branch `feat/paper-studio-phase13-mcq-matrix-print-20261008`. Paper Studio Phase9/10 canonical revision and server validation, Phase11 RTL short grid, Phase12 bilingual short table work preserved; not repeated.
- Checked GitHub issue #4: Core separately advanced beyond Phase13 signed Paper-pool login, and Phase14 RTL frontend reconciliation worktree exists; never modify Core's active worktree or deploy stale source. Academic Master official approval remains 0; APEX Connect external branch is local-only and unrelated to this renderer correction.
- Production frontend marker `24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92`, backend `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9`, inspected before work. No live service, tenant DB, role, migration, PM2, firewall, print device, existing papers or protected templates changed.

## New reproducer (not Phase11/12 short-question issue)

- Built one test-only **three-MCQ Urdu/English** official renderer stress fixture, each with 4 genuine option cells, 3 marks, original content always synthetic. Includes one 720+ character unbroken English scientific term in prompt, 500+ character unbroken option, and 220-character unbroken Urdu prompt, unique `MCQ-STEM-01..03` tokens, RTL medium, canonical `matrix-table` MCQ layout and A4 print preview.
- First browser attempt **failed on Vite cold start/navigation timeout** during heavy concurrent VPS builds, not counted as a renderer failure. A warmed, independent Chromium rerun **reproduced REAL product defect**: MCQ fixed-layout table `scrollWidth 10717` vs `clientWidth 732`, with prompt-cell `10658/672`, option-cell `7822/167`, Urdu prompt-cell `1414/672` overflow. That was a genuine negative geometry assertion; text existed, but visible/printable width was violated.
- Scoped fix in `al-siddique-frontend/src/Modules/Paper-Generator/PaperEditor/official/OfficialSectionRenderer.jsx` **only inside matrix-table branch**: prompt-cell and choice-cell CSS gain `overflowWrap:'anywhere',wordBreak:'break-word'`; replaces ineffective `overflowWrap:break-word` on options. No option-text mutation, answers/marks/labels/selection changes, layout switch, old/simple editor change, or truncation. 
- Post-patch same Playwright **1/1 PASS**: screen table `scroll/client=732/732`, actual print iframe `731/732`, zero overflowing prompt/choice cells; all unique question stems and long option text preserved. Actual iframe HTML passed to Chromium A4 print-to-PDF compositor, generated **5-page nonempty PDF**. This checks paginator invocation and DOM element boundaries, not every rendered page glyph or school printer output.

## Regressions (final results tracked below)

| Test | Result |
| --- | --- |
| NEW real Chromium matrix table screen/print/PDF test | **1/1 PASS**, red initial prepatch 10717/732, postpatch 732/732, 5-page A4 PDF |
| Prior two-column RTL grid and bilingual table real Chromium/PDF | **2/2 PASS**, explicit process exit 0, A4 8-page and 2-page respective output `/tmp/paper-p13-previous-layouts.log` |
| Canonical English/Urdu DOCX and unified official Workspace Chromium | **3/3 PASS**, process exit 0, `/tmp/paper-p13-docx-unified.log` |
| Protected full 43 actual First Term paper print-text corpus | **43/43 PASS** (TAP suite 1/1 PASS), actual process exit **0**, individual 318.30s / total 325.74s; `/tmp/paper-p13-all43.log`, `/tmp/paper-p13-all43.rc` |
| Existing Urdu official Workspace browser | **9/9 PASS**, TAP 0 fail/skip, `/tmp/paper-p13-urdu.log` |
| Protected 6 original templates | **PASS**, six protected original templates unchanged, `/tmp/paper-p13-templates.log` |
| Frontend Vite build | **PASS**, 2,519 modules, 40.27 s under concurrency `/tmp/paper-p13-build.log` |

Remote tool wrapper 50 seconds may time out under concurrent browser/build CPU load. A wrapper timeout is **not** success; underlying complete TAP and process exit were independently checked: 43-paper corpus exit 0, Urdu Workspace final 9/9 PASS, prior layouts process exit 0 and DOCX/official process exit 0. Build log finished successfully but its remote wrapper timed out and no independent shell rc was written, so rely on Vite terminal completed output rather than claiming wrapper success. 

## Remaining ownership and release gates

- SaaS Core owns safe forward-port of this minimal Paper Studio-owned matrix rendering delta onto the **latest** signed/RLS Core stage candidate, keeping Core's separate Paper restricted NOBYPASS login and teacher authorization intact. Actual signed tenant role Save→GET→workspace print/PDF/Word, student/parent/guardian/fees and cross-tenant sensitive flows, migrations/grants/keys/perimeter and restore/rollback require independent Core certification.
- Printable visual glyph/page fidelity for long Urdu + mixed English, Jameel Noori on Windows printers, external physical USB/shared printer, multipage page-break content visual inspection and issue #3 full staff operator acceptance remain outstanding. PDF page-count and print iframe text do not prove those.
- Issue #2 original Phase3AE reviewed ZIP and PG18 runner not located in currently accessible project sources, so original artifact certification unavailable. Historical chat transcripts partially inaccessible. Grade IX–X independently approved questions still zero and must not be selected as verified.

Rollback: selectively revert the renderer-only candidate after review; **no live rollback or production deployment attempted**. 
