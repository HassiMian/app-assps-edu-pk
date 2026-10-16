# ASSPS Grade IX–X Academic Master — 62 Legacy OCR Page Recheck, Immutable 112-Page Source Evidence

**Execution:** 16 October 2026, school source research only. **Status:** Technical OCR resource recheck; not independent teacher approval, textbook adoption proof, or academically verified Question Bank publication.

## One authoritative source-proof continuation

The canonical 112-page OCR progress receipt already existed at `/var/lib/assps-grade910-sourceclaims/ocr-progress.json`, with exact frozen SHA-256 `f785d2a66fdc79d7f6bf2e35cac2e71e616f8dde556951b67e09bd562c34aa5b`. Its 765 question-page claim records remain authoritative as a *research history*; completion does not mean every claim is content-verified. Of these 112 scanned English source pages, 50 had an authenticated PDF.js Node filesystem OpenJPEG WASM decoder configuration, while 62 older receipts had been produced without a proven path configuration. Their renderer status should not have been represented as reliable.

Rather than mutate the original 112-page receipt, the Academic Master preserved its exact SHA and authored `ops/qbank/prepare-grade910-ocr-legacy-recheck-20261016.py`, which copies only the 50 original decoder-validated pages (and the corresponding 503 research result records) into an independent 0600 private progress receipt and requires all 62 older pages to be rescanned. A distinct recheck proof lane at `/var/lib/assps-grade910-sourceclaims/ocr-recheck-legacy-progress-20261016.json` does **not** overwrite the canonical receipt or the standard `ocr-fallback.json` export.

Three bounded isolated systemd invocations rechecked 20 + 20 + 22 pages, with CPUQuota 45%, MemoryMax 2.5 GB, `ProtectSystem=strict`, `ProtectHome=read-only`, `PrivateTmp=yes` and read/write permissions limited to the source-claims evidence directory. The existing Sunday academic audit timer and the nightly OCR source-only timer were not altered or duplicated.

## Exact end-to-end evidence

| Evidence class | Verified reading |
|---|---|
| Existing frozen research source pages | 112/112 preserved |
| Initially validated renderer evidence | 50 pages |
| Original historically questionable page receipts | 62 pages |
| Successfully rechecked with explicit PDF.js filesystem WASM decoder | **62** pages |
| Total isolated recheck ledger coverage | **112** of 112 |
| Question-page research IDs reconciled | **765** |
| Previously valid page/question evidence unchanged | 50 pages / 503 claim records |
| Legacy question-page candidate records rescanned | **262** |
| Exact-stem OCR research candidates in legacy rescan | **0** |
| Original questionable legacy OCR mean confidence | **92.22%** |
| Corrected renderer legacy OCR mean confidence | **92.29%** |
| Official ASSPS textbook edition adoption and question-specific printed page certification | **Not established** |
| Authenticated independent subject teacher sign-offs | **0** |
| Academically approved or Paper Studio published records generated | **0** |
| Question/student marks database modifications | **0** |

**Final recheck evidence receipt:** `/var/lib/assps-grade910-sourceclaims/ocr-legacy-recheck-final-assessment-20261016.json`, SHA-256 of the full isolated recheck ledger `fc73d62fb4606a9a89a41aad70fe0fce24d199cb44158e6d8aeb296e2b79c4c6`, private owner-only `0600`. The source comparison receipt stores only aggregate OCR confidence/category transitions and source fingerprints. It contains **no raw textbook page text, copied copyrighted source pages, teacher identity/approval or student records**.

Question-page keys remain tied to their unchanged source catalog/document and exact page number. Changes in OCR confidence, recognized words or a likely exact question-stem match remain `SOURCE_RESEARCH_CANDIDATE_ONLY`, not academic proof. All **262 legacy question-page records remained READABLE_OCR_NO_EXACT_STEM**, with **0 new exact-stem research candidates** from the 62 rescanned pages. Mean legacy OCR confidence was 92.22 before and 92.29 after the decoder fix; the technical rendering evidence became trustworthy, but source-to-question content attribution did not improve. The original 50 trusted pages retain 503 research claim records, including any pre-existing provisional exact-stem indicators; none is independently approved.\n\nThe final comparison specifically fails closed for missing/reordered IDs, changed previous trusted assets, altered previous 503 trusted results, non-valid PDF.js decoder paths, raw OCR text/image persistence, forged approval flags or mismatched frozen source receipt SHA.

## Auditable reproducibility

- `ops/qbank/prepare-grade910-ocr-legacy-recheck-20261016.py`: freeze canonical 112, construct a separate 50-page baseline and validate every incremental exact decoder recheck.
- `ops/qbank/verify-grade910-ocr-legacy-full-comparison-20261016.py`: require all 112 and exact 765 question-page IDs, compare the 62 older pages with new decoder evidence, seal only metadata-only aggregate report under 0600.
- `ops/tests/test_grade910_ocr_legacy_recheck_immutability_20261016.py`: 17 hermetic adversarial tests, including no fake faculty, no page publishing and no silent baseline mutation.
- `ops/tests/test_grade910_ocr_112_final_source_comparison_20261016.py`: 10 hermetic final 112-page integrity tests.
- Existing **175 academic** focused regression checks, plus **27 new OCR** focused checks, were run together and passed: **202 focused academic/OCR tests**. GitHub Actions source path watches and no-private-DB hermetic job were updated; a GitHub Actions remote green run is not claimed without actual workflow evidence.

## Genuine remaining independent academic requirements

The school-adoption desk still lacks an authenticated ASSPS-issued Grade IX/X 2026–27 adopted textbook/medium/technical stream policy with independent evidence of which school-approved books and exact editions apply. PECTAA's published catalog, existing PDF sizes/page counts, image OCR, stored chapter labels, or a match to an official source catalog cannot substitute for ASSPS adoption and question-specific source-page evidence. Authentic independent qualified Biology/Chemistry/Physics/Computer/English/Urdu reviewers must confirm question and answer accuracy for the specific content revision; the Paper Studio Master and SaaS Core & Production Master retain exclusive teacher-facing approved-only integration and production certification responsibilities.

**Academic inventory remains protected:** 2,411 provisional live questions (Grade IX 1,530; Grade X 881), 2,581 frozen research IDs, 170 original-only held IDs, 227 live questions with some separate unapproved research/exemplary answer, 604 depth flags, 387 unlinked research flags, 166 HIGH (137 stored `-Tech` subject labels requiring special stream adoption, 29 conventional subject labels likewise requiring textbook adoption). OCR work did not change these counts or promote any provisional content.

**Machine checkpoint:** 4/6 technical machine phases; academically verified publication remains safely held.
