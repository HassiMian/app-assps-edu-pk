# ASSPS Grade IX–X — Closed Three-Claim Unknown-Medium OCR Gap (Research Only)

**Date:** 16 October 2026. **Technical result:** 3/3 formerly unscanned original Grade X technical-stream question-page claims independently OCR screened without a single textbook-page approval.

## Source identity, scope, and reason for exclusion

The previous full English-only source OCR run accepted 765/998 question-page claims. The remaining three unscanned claims all refer to **one claimed PDF page 102** in public PECTAA catalogue `pectaa-catalog-054`, Grade X `Health Sciences-Tech`, track `Matric-Tech`, **official catalog medium not specified**. Thus they were correctly excluded from the strict English-only OCR cohort rather than inaccurately treated as English, Urdu or a verified ASSPS-adopted textbook.

The original cached PDF is SHA256 `f69e2553dc39f30fc2f76bda87934cd927c45a5b12e7c8e6305f6ccc6e3aa906`, **123 physical pages**, frozen Grade X technical-stream research file `healthSciences10TechStarter2026.json` SHA256 `544e7b9b1dfc157e9b1199606bf5a84d52120534d993b1249f9064c403244a74`. Every source claim and unchanged original question stem was matched against actual read-only School 1 live question data. All three private question content revision SHA pins were preserved.

| Previously unreadable claim (unverified page 102) | New result |
|---|---|
| `X-HS-TECH-C17-L01` | English-readable OCR, **no exact stem match** |
| `X-HS-TECH-C17-M01` | English-readable OCR, **no exact stem match** |
| `X-HS-TECH-C17-S01` | English-readable OCR, **no exact stem match** |

### Actual OCR study (one page, twice)

- Isolated, resource-limited, read-only transient systemd service `assps-grade910-health-tech-page102-ocr-20261016`, terminal `Result=success`, `ExecMainStatus=0`. The local PDF SHA256, manifest grade and track, precise page and version-pinned original/live question stems were checked before rendering. Correct Node PDF.js OpenJPEG WASM and fonts were explicitly resolved.
- English `eng`: **261 detected words, average OCR confidence 85.6**. This proves the cached page rendered and English character recognition produced readable research text; it does **not** certify the book's official medium, the content of an exercise or a correct candidate answer.
- Urdu `urd`: **309 detected words, average OCR confidence 32.1**, insufficient for reliable text attribution. The public catalogue still marks medium unknown; never assume Urdu applies from the OCR result.
- **0/3 exact original question-stem candidates**; no authentic school textbook adoption, printed exercise/page match, independent teacher approval or verified-paper publication.
- PDF page image and actual copyrighted OCR text were kept in ephemeral memory only; persisted private receipt `/var/lib/assps-grade910-sourceclaims/health-sciences10-tech-c17-page102-bilingual-ocr-20261016.json`, mode `0600`, contains only fingerprints, revision SHA pins, page/candidate IDs and confidence counters, with no original text or student marks.

## Revised 998-item evidence gap routing (separate from supplemental answer research)

| Evidence category | Previous audit | Newly reconciled |
|---|---:|---:|
| OCR high-confidence exact-stem research candidate, **not verified** | 1 | **1** |
| Original English-only OCR readable, no exact stem | 764 | **764** |
| Additional unknown-medium bilingual OCR English-readable, no exact stem | 0 | **3** |
| Readable text layer without exact stem | 124 | **124** |
| Short/ambiguous stems requiring context review | 106 | **106** |
| Still missing any independent OCR screening | 3 | **0** |
| **All current live question/source claims** | **998** | **998** |

Technically **768 of 998** claims now have a validated-decoder OCR attempt, including all **768 records whose original PDF text layer was inadequate**. The other 230 have an existing native text-layer assessment, without verified exact question-page matches. One historic original exact OCR candidate remains **only a research candidate**.

The previous 112-page, 765-claim English-only OCR source ledger stays immutable, and the new one-page supplemental receipt is separate. The final 998-record private current-SHA crosswalk now also distinguishes the three newly readable unknown-medium OCR items from its original English-only skip decision; it does not rewrite that historical evidence. **True independently confirmed printed exercise question-page claims = 0.**

## Technical controls and approval boundary

- Isolated bounded single-page bilingual OCR source: `ops/qbank/verify-grade10-health-tech-one-excluded-page-bilingual-ocr-20261016.mjs`.
- Strictly validated non-publishing source overlay: `ops/qbank/triage-grade910-998-unverified-source-page-claims-20261016.py`.
- Offline Node.js adversarial and source privacy tests: `ops/tests/grade10-health-tech-page102-ocr-nonapproval.test.mjs`.
- Offline Python exact live-revision, school/medium and fake-review tests: `ops/tests/test_grade910_3_unknown_medium_page102_bilingual_proof_20261016.py`.
- The existing school-protected `86` audit hook regenerates the source-only 998-item queue; the existing weekly timer is reused without a second competing timer or a production deployment.
- **No actual textbook adoption, qualified review, independently verified source-page claim or Paper Studio academically verified publication can be inferred from any OCR confidence.** No original question or student marks modified.

The separate **387-item answer-depth research queue / 166 HIGH**, 2,411 live provisional questions and 2,581 frozen research source IDs remain unchanged; they must not be confused with the 998 source-page evidence claims.
