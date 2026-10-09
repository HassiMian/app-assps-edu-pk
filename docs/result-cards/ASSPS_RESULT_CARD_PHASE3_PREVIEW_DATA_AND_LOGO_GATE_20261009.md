# ASSPS Result Card Studio — Phase 3 data/branding preflight

Date: 2026-10-09. **Development only, PRODUCTION HOLD.**

## Source and changes
- Exact clean parent: `2337f0da932a914527cb7c1e85d850280a59dfbd`, new isolated worktree `/root/workspace/assps-premium-results-integrity-phase3-20261009`.
- No original approved resultCardTemplates.jsx, baseline hash, paper, marks row, database, nginx, role policy, service process, or production file edited.
- A scoped `resultPreviewIntegrity.js` pure score reducer now distinguishes explicit scored zero from missing/unrecorded, rejects out-of-range and invalid values, uses actual row-level maximum marks, and reports pending count. ResultCards preview totals/percentage/pass-mark highlighting now use this, preventing 0% and false pass presentation on pending marks.
- The Results page has a request-generation guard: when the selected exam changes or a reload starts, old API reply/failure/finally handlers cannot replace the newly selected exam's records or loading/error state; both exam selectors invalidate old request tokens. Invalid response envelopes fail closed.
- Premium serializer now refuses scores outside [0, max] and refuses missing/invalid maximum marks instead of fabricating 100-point totals or grades. Legacy 10 templates remain delegated to byte-identical protected original.
- `resultLogoDiagnostics.js` adds a non-invasive light amber designer notice only if the school logo is missing or explicitly JPEG (which cannot contain alpha). A PNG/WebP/SVG extension alone never certifies real alpha. The current approved school branding setting remains unchanged.

## Executed checks (exact environment)
- Synthetic backend-format Result Preview Integrity assertions: `node scripts/test-result-preview-integrity.mjs` **EXIT 0**, 15 checks: zero, null, partial rows, weighted max, invalid values, source integration and request-token checks. Static checks do **not** certify real-browser asynchronous race behavior.
- Logo diagnostics: `node scripts/test-result-logo-diagnostics.mjs` **EXIT 0**, 7 checks.
- Flagship SSR and grade/zero/pending/invalid maximum tests: `node scripts/test-premium-result-cards.mjs` **EXIT 0**.
- Real Chromium 12-subject 3-template A4 print-media geometry and PDF generation: `RESULT_EXTRA_SUBJECTS=1 node scripts/test-premium-result-a4.mjs` **EXIT 0**. No clipped footer.
- `npm run verify:templates`: **EXIT 0**, six protected original files untouched; no fingerprint rewrite.
- Vite `npm run build`: **EXIT 0**, build in 6.23s.
- New helper/script focused ESLint: **EXIT 0**. Existing ResultCards.jsx React `set-state-in-effect` lint condition has not been resolved, so no full-file lint green claim.
- Evidence logs on VPS: `/tmp/assps-rp3-{preview,logo,premium,a4,protection,build,eslint}.log`.

## External logo asset validation and blockers
- Separate assistant-side original `Scholars Public School Crest.png` is RGBA with alpha [0,255]; an optimized transparent PNG candidate was exported at `/mnt/data/ASSPS_Transparent_Crest_Print_Ready.png` (900×830) for review. This **is not present in the VPS worktree**. ChatGPT library filesystem and VPS do not share a mount, and no approved, secure asset-transfer action is available through the connected terminal tool. Do not substitute fake vector art or claim all logos transparent.
- The school source `paperSettings.logo` remains the authority. To close branding gate, an authorized transfer must place the exact approved crest bytes on the owned asset path, confirm alpha at the actual browser URL, configure it for premium results, then test PDF/color and grayscale.
- GitHub connector source-write permission is `push=false`; issue comments work but no remote source branch publication is claimed. The local commit remains available on the VPS for a repository writer to cherry-pick/securely push.
- Real authenticated teacher/exam API acceptance, grade policy signoff, physical Urdu/English A4 printer, Core signed RLS and HTTPS upload protection, source-to-production ancestry, rollback certification remain owned release gates.
