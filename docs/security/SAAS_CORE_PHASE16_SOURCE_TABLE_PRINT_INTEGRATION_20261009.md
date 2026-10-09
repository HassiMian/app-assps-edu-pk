# ASSPS SaaS Core — Phase 16: Markdown SourceTable multilingual A4 print boundary

**2026-10-09 UTC · Isolated new source candidate · PRODUCTION RELEASE HOLD.**

## Verified ancestry and Master-owned source

- Phase 15 exact clean parent: `bd8011ae3b76da6ea33ba791684fa6089f9bd118`, branch `feat/saas-core-phase15-mcq-matrix-20261009`. This phase uses new isolated worktree `/root/workspace/assps-core-phase16-source-table-print-20261009`, branch `feat/saas-core-phase16-source-table-print-20261009`.
- Paper Studio Master's newly pushed Phase 14 source `a6d2d17be60f7a4c098e9f0fb0b54495d60fd655`, owner `feat/paper-studio-phase14-source-table-print-20261009`, clean at source inspection; review showed one `SourceTable` data-cell CSS change, plus owner-authored **synthetic** browser fixture and Chromium regression. Exact `overflowWrap:'anywhere', wordBreak:'break-word'` style change integrated into latest Core descendant, not an older full Paper Studio branch.
- Imported only owner synthetic SourceTable fixture and browser test, using unique isolated Vite test port `5496`. No Paper/Assessment backend, signed restricted pools/RLS, finance, teacher, school source or official templates modified. The ARCHV1 26-dirty-file branch remained untouched.

## Reproduced Core failure and verified fix

- Created the owner synthetic bilingual three-column `layoutPreset=table` fixture (long non-breaking Urdu and English runs, source markers and 5 marks). **Before renderer patch**, Core's actual Chromium test emitted TAP **0/1 FAIL**, A4 geometry assertion failure at line 33: SourceTable overflow exceeded container width. This was a new negative reproduction against Core Phase15, not only copied Paper Studio reported results.
- Applied exactly the two word-break containment CSS properties to SourceTable `<td>` in `OfficialSectionRenderer.jsx`. No hidden overflow, clipping, question content, marks, RTL direction or official data changes.
- **After patch**, same isolated Playwright/Chromium print test **1/1 PASS / exit 0**. Measured preview `client/scroll = 732/732`, print frame `scroll/client=731/732`, no overflowing source table data cells and all three synthetic markers retained. Browser's actual print HTML generated a **2-page A4 PDF**. This does **not** equal human-pixel inspection of Nastaleeq glyphs or a physical printer certification.
- Previous independent Phase 15 MCQ matrix and Phase14 odd RTL/two-column fixes retained by exact Git parent. Do not treat Paper Studio owner's 43-paper results as Core acceptance.

## Test and build evidence

- Phase 16 **full isolated Vite build PASS**, measured `✓ built in 6.88s`, exact shell exit **0** in `/tmp/assps_p16_fullbuild.exit`. This closes the prior *Phase 15* missing integrated frontend build exit gate for the **new Phase16 descendant only**.
- Backend `node --check` **259/259 JavaScript files PASS**, no errors, despite no backend changes.
- Protected official template verifier **6/6 unchanged PASS**, git working diff whitespace check PASS.
- The Phase16 Vite build used an isolated symlink to earlier Core Phase15 `node_modules`, with exact `package-lock.json` SHA256 parity `4d9385d6d72de6827d33f2e45eefda7424629e1d85bd3c5ea883965876fed7f4`. **Fresh independent installation was also performed and separately verified** in a private disposable scratch directory `/var/tmp/assps-core-phase16-deps-cert-20261009`: copied exact Phase16 `package.json` + lock, `npm ci --prefer-offline --no-audit --no-fund` **PASS exit 0 / 315 packages / 7s**, `npm ls --depth=0` **PASS exit 0**. This fresh directory was not substituted for the symlinked dependencies in the above completed Vite build; claim only a successful **same-lock fresh install**, not a second fresh-install-backed build.
- **43/43 PASS — protected official First Term corpus render+print text parity**, actual `node --test src/Modules/Paper-Generator/PaperEditor/tests/canonicalAll43RenderPrintAcceptance.test.js` under isolated `ASSPS_CANONICAL_CORPUS_PORT=5489`, complete 43 distinct PASS markers, TAP `1..1`, fail/skipped/cancelled all zero; independent runner saved process **exit 0** to `/tmp/assps_p16_corpus43.exit`. Duration 314,573.59 ms end-to-end; full TAP evidence `/tmp/assps_p16_corpus43.log`. This test ran on the new **Core Phase16 renderer source**, not Paper Studio owner's separate branch or a preceding Core SHA.
- Following scoped ESLint inspection, imported SourceTable test's use of Node `Buffer` was made explicit with `import {Buffer} from 'node:buffer'` (test-only portability/lint fix). New browser test rerun **1/1 PASS, exit 0**, same 2-page PDF after that final source change, and new test-file ESLint **PASS exit 0**. The production renderer remained byte-for-byte the same as the owner data-cell CSS delta.
- **3/3 PASS** separate real Chromium layout regression suite against exact Phase16 renderer, runner **exit 0**, 0 fail/skip/cancel: inherited long RTL odd 13+12 two-column PDF, Urdu-English 9-item paired table A4 and bilingual MCQ matrix long option/stem A4. Full log `/tmp/assps_p16_crosslayouts.log`. Together with the NEW SourceTable 1/1, **4 distinct focused Chrome tests PASS**. Existing source/question IDs and tenant DB were never mutated.
- No live teacher JWT/role, PostgreSQL user table, protected student record or production print workflow was used by this frontend-only synthetic test.

## Full frontend lint — measured failure, no false certification

- Exact Phase16 `npm run lint` ran to completion with process **exit 1**, reporting **753 problems: 707 errors and 46 warnings** across the frontend repository. **Full lint FAIL**, not a timed-out or passing gate; the unrelated error population requires a separate scoped remediation plan before production certification.
- Focused modified renderer + existing test harness ESLint shows **6 errors in both Core Phase15 parent and Phase16 descendant** (5 unchanged unused-symbol errors in renderer, 1 unchanged Fast Refresh fixture rule now at a shifted source line). The new SourceTable browser test initially had one `Buffer` undefined lint error; corrected with explicit Node import, then dedicated new-file ESLint exit **0**. No newly introduced lint issue remains in the Phase16 changed-source three-path comparison, but the six baseline errors and wider repository fail gate remain.
- Do not run ESLint `--fix` across unrelated owner modules or change protected paper/test architecture under this isolated print fix.

## Remaining production RELEASE HOLD gates

1. Whole-corpus official 43 render/print text parity plus all targeted bilingual/Urdu/MCQ geometry, exact Urdu font/pagination visual review and Windows-attached physical printer test. Teacher real signed JWT Save/GET/reopen/PDF/DOCX integration still required.
2. Production-equivalent separate Core+Paper NOBYPASS RLS 77-table migrations/grants, full signed fee/attendance/student/guardian/superadmin/service actor and cross-tenant tests, secret rotation, restore/rollback, external firewall/SSH rescue and independent release artifact ancestry.
3. Paper Studio is the independent owner of newer renderer research; integrate only reviewed changes. Grade IX–X original textbook physical-page/human academic approvals remain zero; Connect local-only Git permission/source and authenticated upload/privacy release gates unresolved.
4. Old Phase3AE reviewed ZIP/PG18 archive and complete historic chat data not independently recovered; no silent reconstruction claimed.

**Decision:** ISOLATED SOURCE ONLY, no production deployment, database mutation, restart, Nginx, SSH or firewall change.
