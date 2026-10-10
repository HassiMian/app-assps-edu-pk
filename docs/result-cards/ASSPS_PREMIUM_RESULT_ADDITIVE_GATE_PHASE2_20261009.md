# ASSPS Result Card Designer — Phase 2 protected-baseline-preserving integration

Date: 2026-10-09. **Isolated development candidate. PRODUCTION HOLD.**

## Design and governance
- Recovered previous Phase 1 local-only result card candidate `856d441f7fab237d7a59b6ee08bea515c446ff07` without resetting or modifying its worktree.
- Forward-reimplemented Phase 1 only in a new isolated additive worktree on the newer Core security descendant `13ce32688479ded500fa533c58ee46eb366103c0`, descending from canonical Core Phase39 `7c3b32dc` through the 77-table effective RLS test candidate `360118712`.
- **DO NOT** modify `al-siddique-frontend/src/Modules/examination/resultCardTemplates.jsx` or update `docs/template-baseline/TEMPLATE_BASELINE_SHA256_20261005.txt` to bless a hash change. New adapter `premiumResultCardTemplates.jsx` imports/delegates original ten templates (legacy paths and semantics unchanged), and implements only three new premium layouts with scoped calculation corrections. The only integration edits are in the unprotected ResultCards caller and screen-only CSS.
- Three templates: Signature Editorial, Swiss Grid, Data Atelier. Larger school title, lightweight table grid, subject-by-subject bars (all subjects, including 12-subject stress), thin donut, marks feedback and restrained footer. On-screen designer: light shell, compact exclusive flagship preview thumbnails, selected modern template by default, legacy choices preserved below.
- Premium performance charts cannot be disabled. Premium output deliberately A4 portrait only, the certified mode; legacy remains with existing orientation options.
- New print-window title is HTML-escaped instead of interpolating raw student name.
- Missing/zero marks are distinguished and selected term isolated in the premium data adapter. No grade is invented when grade bands are unspecified.

## Verification and limits
- `npm run verify:templates`: **PASS**, all six approved template files byte-identical; no fingerprint baseline rewrite.
- `node scripts/test-premium-result-cards.mjs`: SSR for all 3 flagship templates, exact legacy original data delegate, zero/pending/selected-term isolation, mandatory charts/A4 toolbar, template selector tests.
- `node scripts/test-premium-result-a4.mjs`: real Chromium print-media A4 geometry for 10 subjects, 3/3 PASS. `RESULT_EXTRA_SUBJECTS=1 node scripts/test-premium-result-a4.mjs`: 12 subjects, 3/3 PASS. Test images and one-page PDFs saved to isolated VPS `/tmp/assps-premium-*-20261009.*` (not accessible as ChatGPT sandbox links).
- Frontend production Vite build and ESLint logs/exit codes are recorded in the checkpoint; focused ESLint excludes the inherited React-refresh mixed-module export rule. `ResultCards.jsx` also inherits the pre-existing `react-hooks/set-state-in-effect` lint error at its existing Results loading effect; separate remediation/independent review required.
- Checked candidate school logo files in ChatGPT Library: alpha-transparent RGBA images exist, but are NOT deployed or selected in SaaS `paperSettings.logo`, and sandbox has no direct VPS mount. CSS transparency only respects existing alpha, not embedded opaque bitmap backgrounds. Do not claim universal logo transparency until the approved original binary is transferred and deployed via an authorized path.
- Real school enrollment/marks, tenant/teacher authentication, 77-table production role RLS, HTTPS ingress, Urdu/Nastaleeq printers, actual school logo and backup/restore/rollback certification remain unresolved. Release authority remains SaaS Core. No production deployment or school data mutation in this phase.

## Exact current command results
On isolated Phase 2 worktree, executed sequentially with numeric exit statuses:
- `npm run build`: **EXIT 0**, Vite optimized build (14.80s), `/tmp/assps-premium-phase2-build-20261009.log`.
- `npm run verify:templates`: **EXIT 0**, six protected originals unchanged, `/tmp/assps-premium-phase2-protected-20261009.log`.
- `node scripts/test-premium-result-cards.mjs`: **EXIT 0**, `/tmp/assps-premium-phase2-ssr-20261009.log`.
- `node scripts/test-premium-result-a4.mjs`: **EXIT 0**, 10-subject 3/3, `/tmp/assps-premium-phase2-a4-10-20261009.log`.
- `RESULT_EXTRA_SUBJECTS=1 node scripts/test-premium-result-a4.mjs`: **EXIT 0**, 12-subject 3/3, `/tmp/assps-premium-phase2-a4-12-20261009.log`.
- Focused ESLint of new adapter and scripts with the unchanged legacy React-refresh mixed-export rule excluded: **EXIT 0**, `/tmp/assps-premium-phase2-eslint-20261009.log`.
No claims of full-repository lint, physical print parity or real authenticated production acceptance are made.
