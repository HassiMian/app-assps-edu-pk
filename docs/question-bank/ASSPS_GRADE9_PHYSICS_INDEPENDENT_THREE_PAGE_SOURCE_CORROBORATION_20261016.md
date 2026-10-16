# ASSPS Grade IX–X — Independent Three-Page Physics Source OCR Corroboration

**Execution date:** 16 October 2026. **Status:** independent source-text research evidence only; not authenticated ASSPS textbook adoption, official exercise-page proof, independently reviewed answer, or publication.

## What was actually investigated

Across the current **998 source-page claims**, the previous independent OCR audit had **one** high-confidence exact original-stem research candidate:

- Frozen original research ID: `IX-PHY-2025-C01-S01` (Grade IX, English Physics; short answer, 2 marks, authored `additional` question rather than a verified textbook exercise).
- Original authoring research file: `physics9EnglishStarter2026.json`, frozen SHA256 `1a882970fc2548f50bc001691d6de990ce156690cfa252f3f5355d8d63a6dc16`.
- Immutable original source PDF catalog ID: `pectaa-catalog-011`, English Physics IX, physical PDF with **204** pages, SHA256 `a77c9b5fd12e35de2a08390c2b93d10a59fa94fb4603e3349908e75c6b189794`.
- Its original research *claimed* physical PDF page: **5**. Whether this printed textbook edition applies to ASSPS in 2026–27 is **not authenticated**.
- The actual current School 1 read-only full-question revision is SHA256 `984bbf1c16bdd63808168f248da3ad7bc35181a56bd90594c63d8872ba0eeade`. Its live stem was independently compared to the frozen original text and matched exactly.

A **new independent source-only analysis** rendered physical PDF pages **4, 5 and 6** using the correct local PDF.js OpenJPEG WASM decoder; English Tesseract OCR was executed in transient memory. Source PDF bytes, catalog ID/page count, original authoring file and current School 1 question identity were checked. No textbook page image or raw copyrighted OCR text was persisted.

| Physical PDF page | OCR words | Mean confidence | Full normalized exact stem phrase occurrences |
|---|---:|---:|---:|
| 4 (preceding page) | 158 | 88.5 | **0** |
| **5 (original claimed research page)** | **254** | **90.9** | **1** |
| 6 (following page) | 327 | 90.9 | **0** |

**Supported factual conclusion:** the one existing Physics question stem occurs on claimed **physical PDF page 5** in this independently repeated local OCR process and was not seen on its immediately adjacent scanned pages. The original high-confidence OCR *research candidate* is reproducible. The neighboring-page comparison is bounded to pages 4–6; it is **not** a uniqueness search across the entire 204-page PDF.

**Not supported:** that PDF page 5 is the corresponding **printed textbook exercise page**, that the **additional** question is a copyrighted textbook exercise, that ASSPS adopted this English Physics edition/session, that the stored answer/marks are reviewed by an independently qualified Physics/English teacher, or that the paper generator may select it as academically verified. No one has authenticated those facts, so their status remains **false**.

## Complete current 998-item evidence status

The independent Physics corroboration is **metadata on the existing single original OCR candidate**, not an extra source claim or additional approved question. The latest source-only queue remains:

| Independent source review category | Question/source claim IDs |
|---|---:|
| One existing Physics exact-stem OCR research candidate, now repeat-corroborated over three pages | 1 |
| Readable English OCR without exact stem | 764 |
| Additional medium-unspecified technical-stream English-readable OCR without exact stem | 3 |
| Original readable PDF text layer without exact stem | 124 |
| Short/ambiguous stems requiring contextual manual exercise review | 106 |
| No eligible text-layer or OCR screen | 0 |
| **Total existing current School 1 claim IDs** | **998** |

All 998 claims are still pinned to the actual **current School 1 full-question revision SHA256**. All **768 eligible original inadequate native-text source claims** received a trusted-decoder OCR attempt. There are still **0** independently authenticated exact printed exercise-question page links.

## Durable implementation and security

- New source-only analyzer `ops/qbank/verify-grade9-physics-single-ocr-stem-adjacent-pages-20261016.mjs` explicitly refuses changing the frozen PDF SHA, original authoring question file, original/live identical stem, known source catalog, teacher review and source-adoption approval. Entire PDF text and rendered images are processed in memory and never published.
- Root-private metadata-only evidence `/var/lib/assps-grade910-sourceclaims/physics9-c01-s01-three-page-independent-text-proof-20261016.json` is `0600` and contains only immutable source fingerprints, current School 1 SHA, page numbers, OCR word counts/confidence, three-page exact phrase match counts and strictly false academic approval booleans.
- `ops/qbank/triage-grade910-998-unverified-source-page-claims-20261016.py` was extended with a one-candidate, exact-SHA-bound independent three-page research corroboration. It **does not** increase the 998 count or set `specificTextbookQuestionPageVerified=true`.
- Offline adversarial tests `ops/tests/grade9-physics-ocr-three-page-source-reconfirmation-20261016.test.mjs` include a word-boundary false-positive detector, fake adoption/teacher approvals, duplicate pages and unpermitted copyrighted-text storage.
- Independent revision/source-integrity tests `ops/tests/test_grade910_one_independent_physics_source_candidate_20261016.py` verify the joined Physics candidate cannot be promoted, that prior source ID/catalog/page/draft-origin metadata remains intact and that source evidence cannot silently change the current live question SHA.
- No new timer, migrations, production question imports, student mark modifications, academic staff signatures or Paper Studio verified-publication path are included in this change.

The separate **387 unlinked answer-depth research flags (166 HIGH)**, **227 live questions with any supplemental unapproved original explanatory research**, **2,411 provisional School 1 questions**, **2,581 original source research IDs** and **170 original-only held IDs** are unchanged.

**Academic machine readiness remains 4/6, verified-publication hold is mandatory until authentic ASSPS textbook adoption, source/page exercise context, revision-specific qualified independent reviewers and Paper Studio/SaaS Core acceptance are evidenced.**
