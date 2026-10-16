# Grade IX-X: Real PDF page-count checks vs 998 existing author page claims

16 October 2026. Scope: School 1 *provisional* research source evidence, read-only cached official-source PDF bytes. This receipt **does not** make any academic question approved.

## New evidence verified independently

- Confirmed SHA-256 for **56/56** cached official-source PDF byte files against the existing official source manifest.
- Parsed the **actual structural page count** of every file with a PDF parser, separately from the manifest's claimed page counts. **56/56 matching; 0 PDF actual-vs-manifest count conflicts.**
- Rescreened all **998** existing author-provided numeric page claims against **actual**, decoded file page counts: **998 in range; 0 out of range**.
- All author/import `page N` claims remain **unverified** as the *physical location of the question's content*; neither source-page text nor copyright-bearing exercises were copied into this evidence.
- The original *table-of-contents-page*, *chapter-only*, pending-boundary and shared-authority claims are not upgraded.
- Publication, independent subject/Urdu reviews and current ASSPS edition adoption: **0 automatically certified**; production database writes, teacher signatures, saved papers, marks or printer tasks: **0**.
- A cached PDF with a matching hash is an evidence of document identity and integrity, not of ASSPS's academic-session adoption. PECTAA continues to publish multiple Grade IX and X textbook editions, including changes in the 2026-27 catalog.

## Repeatable proof

- `ops/qbank/verify-grade910-pdf-physical-page-bounds-20261016.mjs` (read-only PDF structure parser), source `/var/www/apex-backend/node_modules/pdfjs-dist/legacy/build/pdf.mjs` on VPS.
- `ops/tests/grade910-physical-pdf-page-bounds-20261016.test.mjs`: seven isolated regression tests, including actual-count > manifest trust, negative/zero/fractional page claims, missing PDF assets, TOC claims, and no false independently verified/teacher-approved status.
- Root-private, non-question-text receipt `/var/lib/assps-grade910-sourceclaims/physical-page-count.json`, restricted to mode 0600.
- The existing hardened Sunday 3:35 AM PKT source-claim systemd job now does an additional `ExecStartPost` PDF page-count run after 2,411 original-identity checks, the 170 held-original/unsigned-teacher-form crosswalk and 170 near-stem advisory screening. The installed service fails closed if any cached PDF SHA/page count conflicts or an author claim exceeds the actual PDF length.
- No uncontrolled production seed/release. Retain Paper Studio approved-only boundary, per-revision independent faculty and review rights restrictions.

**Next accuracy milestone:** question text/exercise location validation requires actual visual/OCR-checked textbook page *content* and adopted edition evidence; the 998 range checks alone cannot satisfy it. Do not invent these facts or accept metadata-author claims as content evidence.
