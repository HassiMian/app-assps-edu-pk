# ASSPS Grade IX–X OCR Decoder Reliability and Provenance Checkpoint

**16 October 2026.** This is academic source-only technical QA, not textbook-page, school-adoption or qualified staff approval.

## What the live audit revealed

The read-only corpus has 998 claimed PDF source-page references. Native PDF text-layer verification established **zero** independently approved question-specific source pages. Of 112 eligible English scanned pages, 44 were initially processed with default PDF.js Node decoder settings. Those 44 receipts covered 215 provisional question/page comparisons, but missing WebAssembly decoder resources could make negative OCR results unreliable.

A first attempt to configure resource URLs as file URIs resulted in an actual PDF.js 5.4.296 NodeWasmFactory failure loading OpenJPEG WebAssembly. The worker was deliberately stopped, with **62 previously completed page receipts preserved**: 44 default-renderer pages and 18 unsuccessful file-URI resource pages. None is qualified source-proof.

## Corrected implementation

PDF.js NodeWasmFactory reads decoder bytes from local filesystem paths. The source-only worker now checks for an existing, non-symlinked PDF.js WASM and standard-font resource directory, requires the local OpenJPEG WASM and JavaScript fallback assets, and supplies **absolute filesystem directory paths with trailing separators** to PDF.js rather than file-URI strings.

A read-only representative cached PECTAA Grade IX textbook PDF page was successfully rendered in memory at 504 by 666 pixels using these corrected paths, with no OpenJPEG warning. No page image, copyrighted text or OCR transcripts were persisted.

## Exact machine provenance

New OCR page/claim receipts are marked both as explicit decoder-resource configuration and as confirmed filesystem-path configuration. The old 44 plus 18 attempted file-URI pages remain preserved separately, **not upgraded** to reliable source matches merely because later pages rendered correctly. The root-private summary counts the reliably configured cohort separately from legacy pages conservatively requiring review or rescan.

All question-specific exercise/content-page verification, qualified reviewer approvals, Paper Studio academically verified selection and academic publication remain **zero**.

## Isolated deployment safeguards

The installer only replaces the existing academic scanned-source OCR worker after its exact prior SHA is authenticated and the worker is inactive. It preserves prior progress, backs up the previous executable for rollback, keeps the existing bounded CPU/memory limits and off-hours timer, and does not touch Next.js, Nginx, school marks, student records, question answers, school adoption or production databases.

Independent unit tests cover correct local decoder paths, missing OpenJPEG, missing resource directories and symlinked resource directories, plus existing OCR parser, source scope, confidence and resumability tests.

Official PECTAA textbook catalog listings are only external publications and **do not** prove the adopted ASSPS 2026–27 textbook edition or particular exercise page. Publication remains on strict academic HOLD.
