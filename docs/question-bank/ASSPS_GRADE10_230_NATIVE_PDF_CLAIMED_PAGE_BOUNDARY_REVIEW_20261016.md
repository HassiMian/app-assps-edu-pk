# ASSPS Grade IX–X Academic Master — 230 Grade X Unresolved Native PDF Source Claims

**16 October 2026 | Evidence-only technical batch | No source adoption, academic approval or production publication claimed.**

## Core finding

After the 112-page English OCR work, the three unknown-medium Grade X technical-stream page-102 cases, and the independent Physics IX three-page confirmation, the one authoritative Grade IX–X source-review queue contained **998 unique existing School 1 current-revision SHA-linked question/page claims**. Of them, **230 Grade X claims** had not been addressed by full-stem trustworthy readable OCR:

- **124:** existing PDF native text had been readable, but original question stem did not exactly match on its originally claimed physical page.
- **106:** originally authored question stems were too short or ambiguous for safe phrase-based source proof. These must not be automatically promoted even if a different string-length threshold could accept a phrase.

All 230 claims are **existing original IDs**, not 230 new questions, and the individual 106 ambiguous questions are strictly held from exact-stem certification.

## Genuine independent source research performed

A protected read-only process actually:

1. Loaded the existing 998-item source-provenance queue, 2,581 frozen original metadata and actual current School 1 live question stems in a **read-only PostgreSQL transaction**, matching every source stem before looking at any source PDF.
2. Validated the issuing source catalog ID, original cached PDF SHA256, physical PDF page count, original frozen research file SHA256, assigned grade and actual current full-question revision SHA.
3. Independently extracted native text from the originally claimed PDF physical page and the immediate preceding/following page where available using the existing supported Node PDF.js renderer. **All inspected physical pages had readable native PDF text**.
4. Performed conservative full normalized original-stem phrase matching with word boundaries. It kept all 106 originally short/ambiguous items as **non-verifiable** regardless of phrase-length heuristic.
5. Persisted **only** immutable source IDs/hashes, exact current-revision pins, physical page numbers, aggregate evidence categories and false academic approval flags under root-private `0600`. No copyrighted PDF page text/images, unredacted student data, or question/answer text was saved or pushed to GitHub.

### Confirmed scope: six source PDFs, 147 unique physical pages

| Originally catalogued source (not necessarily ASSPS adopted) | Existing Grade X claims | Unique physical pages scanned in bounded window |
|---|---:|---:|
| Recovered Chemistry X English research PDF | 65 | 39 |
| PECTAA catalog-017 | 60 | 3 |
| PECTAA catalog-057 | 30 | 30 |
| PECTAA catalog-049 | 27 | 27 |
| PECTAA catalog-054 | 24 | 24 |
| PECTAA catalog-062 | 24 | 24 |
| **Total** | **230** | **147** |

Official catalog labels for `pectaa-catalog-049` and `pectaa-catalog-054` do not establish a definite English/Urdu medium. The text extraction was a technical check only; it does not infer a valid ASSPS adopted language, subject/technical-stream programme, textbook session or examination scheme.

### Evidence dispositions (newly screened, still unapproved)

| Classification | Existing question/page IDs |
|---|---:|
| Originally short or ambiguous: needs contextual exercise review, **not proven** | **106** |
| Native text readable but **no full exact original stem** on claimed page or adjacent ±1 physical pages | **124** |
| New full exact-stem source research matches in this cohort | **0** |
| Genuinely certified actual school textbook exercise source-page links | **0** |

This bounded test cannot rule out a match elsewhere in a full textbook and is **not** proof that a question is academically incorrect. The correct interpretation is that existing *research page claims* must remain unverified until an authenticated adopted edition, true printed exercise/question context, and qualified academic review substantiate them.

## Preserved full-source and academic figures

The original authoritative **998 unique question-page source claims** remain unchanged: 768 claims had prior trusted-decoder OCR screening (765 original English cohort plus three supplementary unknown-medium Grade X cases); the other 230 have now undergone the additional native text claimed-page ±1 screen described above. The one independently repeated Grade IX Physics stem on physical PDF page 5 remains a **research-only source candidate**, not independently authenticated school-exercise or answer approval. This is **998 research-screened IDs**, **zero verified textbook exercise links**.

All **2,411 provisional live Grade IX/X questions**, **2,581 frozen original research IDs**, **170 original-only HELD**, and **227 distinct live questions with separate unapproved supplemental explanatory research** remain untouched. The **387 unlinked answer-depth advisory items**, including **166 HIGH**, are a separate dimension from the 998 source provenance claims and were not automatically cleared by this work.

## Executable, source-controlled controls

- `ops/qbank/verify-grade10-230-short-native-source-page-window-20261016.mjs`: six-source, 230-live-stem, 49 claimed source page locations, 147 unique bounded physical pages, immutable SHA guarding, no raw text persistence, no source certification.
- `ops/qbank/triage-grade910-998-unverified-source-page-claims-20261016.py`: exact-current-revision and six official PDF SHA256 crosswalk join; stores the 230 newly classified items as an **annotation on existing 998 IDs**, never as new question IDs or approved links.
- `ops/tests/grade10-230-native-text-bounded-source-research-20261016.test.mjs` and `ops/tests/test_grade910_230_native_short_source_revision_hold_20261016.py`: adversarial QA for changed live question revisions, altered official original PDF hashes, fabricated qualified reviewer/adoption flags, wrong claimed source page, duplicate scope counts, unauthorized source text, and automatic promotion of short/ambiguous questions.
- Protected source-only private receipt: `/var/lib/assps-grade910-sourceclaims/grade10-230-native-text-source-page-neighborhood-review-20261016.json` (`0600`). The existing weekly academic one-shot service and `86` reviewer metadata postcheck continue as the sole academic source audit schedule.

**Academic publication remains HOLD.** A PDF file being officially listed by PECTAA is not evidence that ASSPS adopted that exact edition. No qualified independent school subject/Urdu reviewer, institutional adoption certificate, verified printed exercise location or secure Paper Studio/SaaS Core certification has been fabricated or bypassed. No student marks, exam results, tenant settings, existing papers, or production question data were modified.
