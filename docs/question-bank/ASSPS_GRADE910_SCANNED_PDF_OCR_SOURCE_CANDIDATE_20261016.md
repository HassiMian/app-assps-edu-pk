# ASSPS Grade IX-X — Controlled OCR pilot finds first corroborating source-page candidate

**Observed:** 16 October 2026, Pakistan time. This is a narrowly scoped, read-only LAST-RESORT machine evidence evaluation of scanned official-source PDF pages. It does NOT imply independent qualified faculty review, school textbook-edition adoption, textbook exercise provenance, board-paper history or academic publication.

## Why this was needed

The previous 998/998 source-page **text-layer** scan across 162 actual PDF pages yielded 768 claims with insufficient/scanned native PDF text, 124 with readable text but no exact full-stem phrase, 106 short/generic stems below safe exact-match threshold, and **0** text-layer exact full-stem matches. Merely expanding an exact-text query cannot recover text absent from scanned images, so English-only OCR on explicitly image/scanned pages is a constrained last resort.

## Real six-page pilot completed

Six distinct high-priority PDFs/pages were rendered privately and OCR'd using English Tesseract; **no image/text was saved or shared**. The private evidence contains only question IDs, source catalog IDs/page numbers, confidence values and textual full-stem match booleans.

- **765 provisional claims / 112 distinct pages** are eligible for additional English-only OCR; 3 claims in catalog with unspecified medium are excluded rather than guessed English/Urdu.
- Pilot **6 distinct scanned source PDF pages**, representing **111 original numeric page claims**.
- All 111 had readable OCR, **110 with no complete exact full-stem match**, **one high-confidence exact full-stem candidate match**.
- Matched original research question `IX-PHY-2025-C01-S01`, source `pectaa-catalog-011`, actual PDF page `5`; OCR page average word confidence `90.9%`, all source PDF SHA/page-count checks previously verified.
- One exact lexical match supports **machine corroboration that the stem appears in the scanned document page**, and is stronger than author-only metadata, but OCR may be imperfect and the PDF structural page number might not correspond to printed book page. Therefore `independentQuestionContentPagesVerified=0`, `reviewerApprovals=0`, `publishedQuestions=0`.
- Private initial receipt: `/var/lib/assps-grade910-sourceclaims/ocr-pilot-20261016.json` (0600); no raw copyrighted textbook page/stem text stored.

## Mechanical safeguards

`ops/qbank/verify-grade910-scanned-source-ocr-fallback-20261016.mjs` is source-versioned; `ops/tests/grade910-scanned-source-ocr-fallback-20261016.test.mjs` has seven unit checks covering confidence thresholds, numeric changes, exact phrase matching, English-only exclusion, bounded pilot, and absent official source catalogs.

- Only pages previously classified as `TEXT_LAYER_INSUFFICIENT` are eligible.
- Never OCR Urdu or unspecified-source-language PDFs using English-only models.
- Uses genuine cached official PDF bytes that must match catalog SHA-256 and real PDF page count.
- Renders pages into an in-memory PNG buffer; Tesseract reads stdin; **no textbook images, raw OCR text, raw question text, or student data persisted**.
- Requires at least 40 recognized words, mean confidence at least 70%, 150 normalized characters, and the strict full wording threshold. Language-model paraphrases or topic similarity never become exact-page evidence.
- Even high-confidence OCR lexical matches **remain provisional source candidates**, not signed subject/Urdu academic review and not the approved Paper Studio selection lane.
- Writes only root-private JSON receipts in `/var/lib/assps-grade910-sourceclaims/`; no database writes, imports, approved status flips, print jobs or production cutover.

## Autonomous off-school-hours continuation

`assps-grade910-scanned-ocr-fallback.timer` is configured for **Sunday 04:15 Asia/Karachi**, following 02:30 full source QA and 03:35 SHA/PDF/170-question source audits. Separate isolated service has `CPUQuota=45%`, memory pressure at 1.5 GB, hard cap 2.5 GB, strict read-only filesystem except private receipts, no elevated privileges, and `Persistent=false` to avoid an unplanned intensive post-reboot run during a school day.

This timer is a **planned technical execution**, not a claim that all 112 source pages have already undergone OCR. Completion requires the actual server receipt `/var/lib/assps-grade910-sourceclaims/ocr-fallback.json` and its checked scope status `ALL_ELIGIBLE_ENGLISH_SCANNED_PAGES`; no false certificate is issued before then. Previously accepted school-level Principal and Ricoh MP C307 hardware print acceptances remain carried forward, not routine tasks.
