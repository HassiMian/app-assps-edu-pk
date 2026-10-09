# ASSPS Paper Studio Master — Phase 18 vertical arithmetic multi-column A4 containment

9 October 2026 ~02:18–02:25 UTC. Isolated development only; **production NOT deployed**.

## Verified source of truth, ownership and release boundary

- Fresh GitHub issue #4 read before changes: latest owner Paper Studio Phase17 `015b4e1c05a7e9519cfdec5a7b0ac589000c7cc9` (exact local=remote, clean worktree); SaaS Core Phase20 `7b0fd3eb67ab6d5485ca5c7726a0d1e7594142e7` (separately signed strict-paper-id gate, not production). Paper Studio phases 11–17 not redone. Coordination handoff at `/root/workspace/assps-four-master-gate-scan-20261008/docs/coordination/PAPER_STUDIO_MASTER_HANDOFF.md` reviewed from canonical earlier audit. Independent original historical chat transcripts/Phase3AE review ZIP/PG18 not available as original bytes.
- New isolated clean worktree `/root/workspace/assps-paper-studio-master-phase18-20261009`, branch `feat/paper-studio-phase18-vertical-math-print-20261009`, exact parent Phase17 SHA. Protected official First Term paper data/template/marks, saved school/student/teacher papers, Jameel Noori font, backend signed non-BYPASS JWT/tenant RLS/migrations, Academic IX/X bank, Connect and unrelated SaaS changes preserved.
- Production metadata before change: frontend `24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92` (`fix/datesheet-session-theme-forward-20261008`), backend `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9` (`fix/phase4-printer-fee-after-review-20261008`). No deploy/restart/DB/PM2/firewall/SSH changes.

## NEW actual browser negative reproducer (distinct from prior maths comparison/number tables)

- Phase17 repaired `MathPracticeGrid` numbered `math_compare` and `math_table`. The separate `vertical_math` renderer uses `VerticalMathLines` → `data-place-value-stack` inside `data-math-operation-matrix`, a dedicated 2-column arithmetic layout with operator/digit alignment. Its grid used intrinsic `18px minmax(3ch,max-content)` and unbreakable `whiteSpace:'pre'` numeric and fallback line spans. Extremely long teacher-authored numerical/Urdu digit runs grew far beyond the A4 printable area despite parent CSS grids. This is an actual distinct path, not repeated Phase17 tests.
- Built one strictly **synthetic 4-mark stress paper** with 2 arithmetic blocks × 2 vertical arithmetic stacks, large conventional ASCII digits, Urdu/Persian digits and long scientific terms, plus individual `[VERT-MATH-01..04]` text tokens and `+` and `-` operators. No official, curriculum-adopted or school assessment data changed. New test Vite-serves the actual Paper Workspace fixture, reads all operand span geometry and source digit runs, clicks genuine `Print / Save PDF`, inspects actual cloned print iframe and calls Chromium print-to-A4 on that exact print-frame HTML.
- **BEFORE patch actual Chromium RED** `/tmp/paper-p18-vertical-red.log`: matrix `scrollWidth=13273/clientWidth=731`, six overflowing operand spans including long decimal spans `7511/315`, Urdu digits `12890/337` and scientific tokens `10360/336`. Test assertion FAILED as expected; not a navigation timeout or hypothetical defect.

## Scoped implementation and real postpatch evidence

- Only `VerticalMathLines` and the dedicated vertical-math cell container inside `MathPracticeGrid` in `al-siddique-frontend/src/Modules/Paper-Generator/PaperEditor/official/OfficialSectionRenderer.jsx` modified:
  - intrinsic unconstrained `inline-grid` → bounded grid `width:100%;minWidth:0;maxWidth:100%`, columns `18px minmax(0,1fr)`; parent arithmetic cell minWidth:0;
  - operand/fallback line spans `whiteSpace:'pre-wrap'` instead of no-wrap `pre`, with local `minWidth:0`, `overflowWrap:'anywhere'`, `wordBreak:'break-word'` so very long digit runs remain fully present rather than escaping A4. Normal right-aligned numeric operands retain their right alignment, conventional fixed operator column, `tabular-nums`, LTR, original operand and line characters, plus/minus, 2-column operation grouping, and arithmetic underline. No trimming, font replacement, clipping, hidden overflow, original source edit, class marks, paper template, PDF export pipeline or global print stylesheet change.
- **SAME actual Chromium test GREEN** `/tmp/paper-p18-vertical-green.log` and enhanced `/tmp/paper-p18-vertical-final.log`: preview `scrollWidth/clientWidth=732/732` and cloned print iframe `732/732`, four independent stacks width 337/337, no overflowing child operand spans. All 4 synthetic marker labels plus long ASCII and Urdu digit runs preserved in both preview and cloned print text, operators `+` and `-` present; LTR and tabular-digit alignment remain. Real A4 `page.pdf` from the genuine print frame yielded **4 pages**, nonempty. New browser TAP **1/1 PASS, exit 0**. No claim of manual four-page glyph inspection or physical connected printer output.

## Fresh exact branch acceptance evidence (complete results required before publishing)

| Gate | Actual status |
| --- | --- |
| New vertical-math Chromium preview + real print frame + A4 PDF and operator/source fidelity | **1/1 PASS, process exit 0** (enhanced final `/tmp/paper-p18-vertical-final.log`) |
| Previous seven real browser test files (Phase11–17, including Phase17 maths comparison & tables, long Urdu sentence WBR, RTL, MCQ, matching and Markdown table) | **11/11 TAP PASS, actual controlled process exit 0**, 7 test files including prior Early Years/Math/RTL/MCQ/Markdown/Matching, 128.13s; `/tmp/paper-p18-prior-print.log/.rc` |
| Full protected official 43 First Term paper render + print text parity | **43/43 official documents PASS**, controlled process **exit 0**, test 241.64s / total TAP 243.60s, 0 failed/skipped/cancelled, `/tmp/paper-p18-all43.log/.rc` |
| Protected template verifier | `/tmp/paper-p18-templates.log/.rc`, 6 original sha files verified unchanged, **exit 0** |
| Full frontend Vite production build | `/tmp/paper-p18-build.log/.rc`, **PASS 2,519 modules, 22.68s, exit 0** |
| Targeted new browser test lint | **PASS exit 0**, `/tmp/paper-p18-targeted-eslint.log`; whole repo lint NOT newly certified |
| Canonical DOCX model + embedded math assets | **4/4 PASS, exit 0**, 43 canonical paper DOCX models/1,027 nodes/315 tables/612 RTL blocks/4 vertical-maths structures; `/tmp/paper-p18-docx-model-correctcwd.log`. First wrong-working-directory attempt **FAILED ENOENT** because test expects repository root, not frontend subdirectory, `/tmp/paper-p18-docx-model.log`; exact same unchanged tests **PASS 4/4** when rerun at repository root. No misleading originally successful claim. |
| Staged Git whitespace, isolated clean origin after commit | Verified staged whitespace before push and exact branch SHA/clean status after push |

### SaaS Core release HOLD

Only SaaS Core may selectively forward-port the narrow new `vertical_math` operand layout patch and new synthetic browser print test onto its latest *verified signed non-BYPASS* RLS branch; DO NOT merge stale Paper Studio branch or replace current Core identity scope/session pool. Core must still certify JWT/role-dependent real authenticated staff Save→GET→reopen→PDF/DOCX, 77-table grants/migration, school tenant RLS, attached Windows printer visual/Nastaleeq glyph and full print pagination, backup/restore/rollback, external perimeter, and final production commit ancestry. Original Grade IX/X human-academically approved source question count remains zero; original Phase3AE source ZIP/PG18 runner unresolved. No production deployment/restart/tenant data action was taken.
