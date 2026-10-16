# ASSPS Grade IX–X — 998 Live Question-to-Printed-Page Evidence Gap Routing

**Academic Master source-reconciliation checkpoint — 16 October 2026.**

This is a **research-only, exact-revision-bound review queue**, not an answer key, textbook adoption certification, examination-board paper analysis, or approval for Paper Studio. It is derived entirely from existing frozen candidate claims and completed read-only source evidence; no new textbook passages, original question text, or student details are copied to the report.

## Complete actual evidence intersection

| Evidence ledger | Real observations | Academic interpretation |
|---|---:|---|
| Frozen original Grade IX/X research records | 2,581 | Immutable research archive; not automatically adopted or approved |
| School 1 provisional live full-question revisions | 2,411 | No production question modifications made |
| Text-layer attempted exact original question-page claims | **998** | All 998 also present in School 1 current revision SHA ledger |
| Text-layer strict exact-stem matches | **0** | None supports full question-to-page certification |
| Scanned OCR claims with fully corrected local PDF.js WASM decoder | **765** | 112 source PDF pages with 765 claim records |
| OCR exact-stem **research** candidates | **1** | **Not yet independent page proof, textbook adoption or teacher review** |
| OCR-readable, no exact stem | **764** | Claimed page cannot be independently established from present OCR |
| Readable PDF text-layer, no exact stem, outside OCR | **124** | Exact reference/content needs reassessment |
| Stem too short for trustworthy phrase-matching | **106** | Human/contextual exercise matching needed |
| Insufficient PDF text-layer, not in OCR page cohort | **3** | Needs alternative trusted page evidence |

The exact source-to-question join is constrained to identical **question ID + original source catalog ID + original research PDF page** with the current live School 1 question's content revision SHA256. All 998 unique tuples were checked; 765 OCR tuples are a strict subset and preserve the exact 112-page immutable source audit. Each item is routed using distinct reason codes, contains no textbook OCR text, and has all academic approval/publication booleans **false**.

### Specific highest-priority human-verifiable evidence cases

| Provisional original ID | Claimed catalog/page | Reason | Action (unapproved) |
|---|---|---|---|
| `IX-PHY-2025-C01-S01` | `pectaa-catalog-011`, page 5 | One high-confidence OCR exact-stem research candidate | Independently corroborate printed text, exercise context, edition, board/session/medium applicability and answer with a qualified Physics reviewer |
| `X-HS-TECH-C17-L01` | `pectaa-catalog-054`, page 102 | Text layer insufficient; not in eligible OCR cohort | Require authentic technical-stream school adoption and independent source-page inspection |
| `X-HS-TECH-C17-M01` | Same catalog and page | Same missing printed-page proof | Preserve provisional status until real source evidence |
| `X-HS-TECH-C17-S01` | Same catalog and page | Same missing printed-page proof | Preserve provisional status until real source evidence |

**Important:** These are citations previously **claimed** by research candidate metadata, not textbook citations certified correct by this audit. We do not assert that the claimed PDF page contains the question or that the specific school adopted this edition.

## Routing across all 998 claims

| Original research grade | Evidence items |
|---|---:|
| Grade IX | 555 |
| Grade X | 443 |
| **Total** | **998** |

| School applicability gate | Evidence items |
|---|---:|
| Stored `-Tech` subject names: adoption and exact exercise proof required | 108 |
| Other subject names: exact adopted school edition/medium and exercise proof required | 890 |
| **School-adopted or independently verified as a direct question-page match** | **0** |

Of the 998 original textbook-page claims, 768 had insufficient text layer, 124 readable text without exact question stem, and 106 stems were too short for safe exact matching. After final full PDF.js OCR recovery, the 768 insufficient group contains 765 additionally OCR-screened claims and **3 still ineligible**. An OCR-scanned page with readable text is not evidence the claimed question is on that page.

The root-only protected `/var/lib/assps-grade910-sourceclaims/998-text-and-ocr-question-page-review-routing-20261016.json` stores **998 source identity/revision/evidence records** with no raw copyrighted page text or student records. Stored file permission is **0600**. The two OCR research receipts remain separate and unchanged:
- Original 112-page receipt SHA256 `f785d2a66fdc79d7f6bf2e35cac2e71e616f8dde556951b67e09bd562c34aa5b`.
- Independently rescanned 112-page research receipt SHA256 `fc73d62fb4606a9a89a41aad70fe0fce24d199cb44158e6d8aeb296e2b79c4c6`.
- Rescan compared all 765 research IDs, retained 503 old trusted records exactly and found zero **new** exact stems in the 262 rechecked legacy claim records.

## Implementation and independent validation

- `ops/qbank/triage-grade910-998-unverified-source-page-claims-20261016.py`: no-DB writes, joins frozen 2581 original research metadata + 998 text-layer + 765 OCR + 2411 current live revision hashes + frozen 112-page receipt. Requires the full actual scope, exact source identity, mandatory decoder, nonapproved candidate status, and output protection.
- `ops/tests/test_grade910_998_source_gap_review_queue_20261016.py`: 17 hermetic+VPS revision tests for duplicate/missing original question IDs, wrong catalog, wrong grade, missing current live SHA, fake source verification, fake school adoption, fake independent staff approval and unsupported OCR evidence categories.
- Existing previous **202** Python-focused academic/OCR regression tests and **25** Node.js OCR tests remain separate; changes here do not diminish past tests.
- Source code and small public-safe report can be reviewed on GitHub; the root-only queue remains on protected VPS evidence storage. No source page images/text and no private school student records are committed or sent to GitHub.

## Publication and school approval decision

**Academic verification and publication remain ON HOLD.** Public PECTAA catalogs, scanned PDF pages, correct PDF file hashes, good OCR confidence, and an original authoring file's claimed page do not establish ASSPS 2026–27 textbook adoption, the exact grade/subject/medium/exercise printed question provenance or staff approval. Qualified independent subject/Urdu reviewer signatures must be attached to the **current** question/answer revision. Paper Studio and SaaS Core retain their distinct approved-only selection and production deployment responsibilities.

This research controls questions rather than treating a larger research-record count as academic quality. It cannot autonomously fabricate institutional source adoption, qualified teacher judgement or production tenant security acceptance.
