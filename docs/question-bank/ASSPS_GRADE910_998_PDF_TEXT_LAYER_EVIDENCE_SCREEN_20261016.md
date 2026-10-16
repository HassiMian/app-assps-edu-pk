# ASSPS Grade IX-X: Content-level Text-Layer Evidence Screen for All 998 Existing Page Claims

**Observed: 16 October 2026 (PKT).** Read-only official-source PDF byte/text-layer screen of School 1, Grades IX/X, from the existing SHA-bound textbook source cache. This is an **evidence-quality investigation**, not independent qualified teacher review, adopted textbook edition validation, or academic publication.

## Completed full scan

- **998/998** existing numeric source page claims screened across **15 distinct source catalog PDFs** and **162 unique claimed PDF page numbers**, without copying any copyrighted textbook text or raw school question text into audit receipts.
- Actual PDF SHA and structural page count matched the official source manifest for every audited file; no scanned text falsely reconstructed.
- **768** candidate claims have insufficient text layer (typically scanned/image-based PDF pages or unreadable extraction). This is a technical limitation; NOT proof that the original question is wrong.
- **124** candidate claims have readable PDF page text but their **entire exact stem** was not present.
- **106** candidate stems were below the strict safe comparison threshold of 40 normalized characters and 7 tokens, and were not treated as matches even when the PDF was readable.
- **0** high-confidence full-stem exact matches, **0** independently verified physical question-content pages, **0** teacher-verified answer keys, **0** approved or published revisions, **0** production database writes.
- A genuine conceptual/authored question often does not repeat textbook wording verbatim, so **no exact text** does not disprove curriculum alignment. Page N may be a PDF structural page rather than a printed textbook page, so bounds/evidence are not proof of page/exercise mapping.

## Subject priority / machine evidence availability

| Grade | Subject | Claims | Text insufficient | Readable, no exact stem | Stem too short |
|---|---|---:|---:|---:|---:|
| 10th | Chemistry | 65 | 0 | 43 | 22 |
| 10th | Biology | 60 | 60 | 0 | 0 |
| 10th | Mathematics | 60 | 0 | 18 | 42 |
| 10th | Physics | 60 | 60 | 0 | 0 |
| 10th | English | 50 | 50 | 0 | 0 |
| 10th | Pakistan Studies | 40 | 40 | 0 | 0 |
| 10th | Physics-Tech | 30 | 0 | 15 | 15 |
| 10th | Communication Skills & Personal Grooming-Tech | 27 | 0 | 17 | 10 |
| 10th | Health Sciences-Tech | 27 | 3 | 16 | 8 |
| 10th | Biology-Tech | 24 | 0 | 15 | 9 |
| 9th | Chemistry | 315 | 315 | 0 | 0 |
| 9th | Biology | 66 | 66 | 0 | 0 |
| 9th | Mathematics | 65 | 65 | 0 | 0 |
| 9th | English | 55 | 55 | 0 | 0 |
| 9th | Physics | 54 | 54 | 0 | 0 |

## Machine inspection rules

1. Match source ID to exact manifest SHA and its actual PDF bytes (no filename trust).
2. Load only the 162 specifically claimed pages, under read-only PostgreSQL transaction and PDF parsing; no uncapped book scraping.
3. Read text-layer strings without OCR. A page with fewer than 150 normalized characters is `TEXT_LAYER_INSUFFICIENT`.
4. For readable pages require normalized stem length at least 40 characters and at least 7 tokens, then require **full contiguous exact-stem phrase**, not generic word overlap, near-similarity or re-used answer fragments.
5. Numerical changes, opposite qualifiers, generic short stems and scanned/garbled pages never count as verified. Even an exact lexical match would remain only *candidate corroboration* pending actual page visual/exercise context and edition adoption.
6. Keep only hashed page-text fingerprints, source catalog/question IDs, page number, character counts and classification in root-private mode 0600 receipts; do not replicate copyrighted textbook pages/text or personal data.
7. If exact-match counts change or readable layers disappear in future imports, require technical reclassification; **never auto-approve** research content.

## Source code and rollout

- `ops/qbank/verify-grade910-pdf-question-text-evidence-20261016.mjs` and `ops/tests/grade910-pdf-question-text-evidence-20261016.test.mjs`.
- **7 source-unit tests** safeguard exact-match thresholds, scanned pages, numeric/qualifier distinction, punctuation, and no bogus generic matches.
- Private evidence: `/var/lib/assps-grade910-sourceclaims/question-page-textlayer.json`; SHA-256 `28c55c35af99f0d864b58d3519efea3017f3ce654a1c0d1bb14b3940be8df4c8`.
- The verified original source inventory, 170 held research questions/unsigned reviewer form crosswalk, original near-similarity precautions, 56 actual PDF page-count checks and three existing school safety monitors are preserved.
- This audit is integrated into the same hardened Sunday **3:35 AM Pakistan time** source-check service; no new independent duplicate timer or production frontend/backend cutover.
- Existing Principal institution-level acceptance and Ricoh MP C307 physical acceptance are retained; do not ask again.

**Remaining genuine evidence boundary:** textbook adoption/edition matching to the exact ASSPS session, page content/exercise classification (using appropriate human-readable, visually reviewed source material), independent scientific/language reviewer attribution and question revision approval. No AI auto-signature can provide these facts.
