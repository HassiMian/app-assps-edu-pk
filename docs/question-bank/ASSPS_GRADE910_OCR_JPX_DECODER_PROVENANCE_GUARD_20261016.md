# ASSPS Grade IX–X English Scanned PDF Evidence — JPX Decoder Reliability Gate

**Academic Master source-only checkpoint, 16 October 2026. No production Question Bank or student data mutation.**

## Observed technical evidence

The existing 998 claimed textbook PDF page references were checked through native PDF text layers across 162 distinct pages: **0 strict, independently verified source question/exercise pages**. The separately restricted, last-resort English-only OCR covers **112 eligible unique scanned pages**. At this particular pre-decoder-fix baseline, 44 pages were completed in resumable root-private `0600` progress, covering 215 question/page claim screens. These are technical screenings only and must never authorize official source citations, answer keys, real qualified teacher signatures or Paper Studio verified-selection.

During the bounded source worker, PDF.js 5.4.296 reported that its JPX/OpenJPEG WebAssembly decoder URL had not been configured on some pages, including warnings about unloaded image components. Such warnings may make an apparent *no exact OCR phrase* unreliable. Do not automatically assume an unmatched page is an incorrect source claim.

## Change implemented

The existing `verify-grade910-scanned-source-ocr-fallback-20261016.mjs` now discovers the local existing `pdfjs-dist/wasm/` and `pdfjs-dist/standard_fonts/` directories, validates that they exist and are not symbolic-link redirections, requires the installed OpenJPEG WASM and fallback components, then passes explicit `wasmUrl` and `standardFontDataUrl` to PDF.js. Missing decoder resource paths produce a fail-closed error before new image-backed source pages are processed.

**Provenance:** new OCR page/claim receipts carry `pdfJsDecoderResourceUrlsExplicitlyConfigured=true`. Previously captured pages are **preserved as legacy technical evidence**, not silently reinterpreted or auto-certified. The private OCR evidence summary separates page counts collected before and after decoder-URL configuration. The printed evidence/page verification decision remains 0 regardless of exact-stem candidates. Raw textbook page images and raw OCR text are never persisted by this worker.

## Operational safety

- Uses the **existing** `assps-grade910-scanned-ocr-fallback.service` and its twice-nightly timer; does not create a competing service.
- Existing `CPUQuota=45%` and `MemoryMax=2500M` remain unchanged.
- Installation is SHA guarded, stages only the academic OCR worker source, checks the worker is not active, keeps a root-private rollback copy and preserves previously checkpointed pages.
- The separate canonical `assps-grade910-live-source-claims.service` remains read only; only research evidence may be refreshed.
- OCR pages that were processed before explicit resource configuration are preserved for a separate conservative rescanning decision; they are **not** deemed source-verified because of this fix.
- The new resource path helper has four independent tests (valid local asset URLs, missing decoder, symlinked directory and nonexistent asset directory). The existing OCR resume/selection/low-confidence tests are also retained.

**Academic source truth:** [PECTAA curriculum catalog](https://pectaa.edu.pk/curriculum-compliance/) and [PECTAA textbook lists](https://pectaa.edu.pk/books-and-publications/) identify public books but cannot certify the exact ASSPS school-adopted 2026–27 title, printed textbook exercise/page or independent qualified faculty review. Academic verified publication remains **HOLD**.
