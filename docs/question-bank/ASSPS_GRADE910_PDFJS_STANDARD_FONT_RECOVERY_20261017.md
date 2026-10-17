# ASSPS Grade IX–X — PDF.js Native Font Asset Recovery Without Academic Promotion

**17 October 2026 | Independent Academic Master source-only technical quality repair**

The existing read-only PDF text-layer audit `ops/qbank/verify-grade910-pdf-question-text-evidence-20261016.mjs` logged repeated PDF.js Node warnings that `standardFontDataUrl` was not provided. No school textbook-source page, student score, school approval, or question key was modified as a consequence.

### Source-only correction

- Resolve `standard_fonts` only relative to the installed local PDF.js module, not an external URL or untrusted user-specified asset.
- Refuse symlinked/missing directory and absent `FoxitSerif.pfb` / `FoxitDingbats.pfb` assets *before* processing an official cached PDF.
- Pass the **actual absolute filesystem directory with a trailing separator** to PDF.js `getDocument({standardFontDataUrl})`. This follows the existing PDF.js local decoder/asset-path implementation used by the separate OCR fallback.
- Preserve the original PDF SHA256 byte checks, exact academic original stem-matching threshold, 998 original author-page research claims, and root-private technical evidence receipts.
- Three new focused Node tests validate correct asset resolution, missing-font fail-closed denial and symlink rejection; seven existing exact-stem/number mismatch tests still pass.
- An isolated pilot processed a real previously cached PDF `pectaa-catalog-035` page 1 with installed PDF.js Node and the new local font path without a missing standard-font-path warning; only the page count/token count was displayed, not the textbook content.

**Limits:** Repairing native font availability can improve extraction reliability; it does not prove the source is ASSPS-adopted, that any exercise question appears on a claimed page, or that translations/model answers have independent qualified academic signoff. Differences in source corroboration must be classified as research and independently reconciled before any academic promotion.

**Deployment boundary:** A separate rollback-safe guarded academic *script-only* installer must verify clean pushed Git head, exact old installed source SHA, current test pass, existing academic one-shot service inactive, weekly timer active, and real non-critical Core security health evidence. It may update only the copy of this read-only Node source audit installed under `/usr/local/libexec/assps-grade910-sourceclaims`, preserving a backup in a 0700 academic research directory. It must not touch Nginx, frontend/backend production releases, school DB, student marks, Paper Studio papers or approved question controls.

**Release state:** 0 new teacher signatures, 0 approved source exercise pages, 0 verified selectable question imports. The academic six-phase machine status remains 4/6 until authentic school adoption and independent peer/faculty review.
