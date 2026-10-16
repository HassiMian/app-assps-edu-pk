# ASSPS Grade IX–X — Revision-bound source-evidence review handoff

**Observed:** 16 October 2026, Pakistan time. This is a source-only Academic Master add-on to the existing 56 protected faculty review cohorts, not a new Question Bank, a migration, or academic publication certification.

## Actual machine completion

The read-only School 1 Grade IX/X source audit now joins:

- **2,581 SHA-frozen original research question IDs**, retaining original research revision identity.
- **2,411 live provisional questions**, each with a newly independently calculated SHA-256 fingerprint of its *actual current school Question Bank content* (question text, chapter/topic, subject/grade/medium, English/Urdu alternatives, MCQ options and answer, marks and difficulty). The **original research SHA and current live content revision SHA represent different domains** and are not interchangeable.
- **170 protected original-only research IDs**, each preserved as research and linked to an existing **unsigned** revision-bound faculty form; none is forced into the live provisional bank.
- **998 numeric textbook PDF page claims** with actual PDF page-range proof only, now classified using the real content-layer result; **one Physics IX strict OCR lexical corroboration candidate** and **two protected-original near-duplicate editorial review candidates**.
- **56 existing faculty review group keys** reused, not recreated as competing faculty cohorts.

### Machine-generated, conservative review priority

| Evidence review lane | Original research IDs |
|---|---:|
| P0 — complete stem appears in OCR source page; independent edition/teacher proof still required | 1 |
| P1 — source PDF scanned/image-only; visual page check required | 767 |
| P1 — readable/short stem, exact page content or conceptual mapping still needs review | 230 |
| P1 — preserved original-only candidates not in live provisional seed | 170 |
| P2 — source chapter/general/pending page context, not exact question page | 1,318 |
| P2 — source claim references table of contents only | 95 |
| **Total** | **2,581** |

The high-priority Physics IX lexical source candidate is `IX-PHY-2025-C01-S01`, source `pectaa-catalog-011`, actual structural PDF page 5. It remains **unapproved**. Potential protected-original same-topic/editorial reuse candidates requiring review include `IX-ENG-ORIG-20261008-M017` and `X-MATH-C10-L02`. A conceptual zero-vs-positive discriminant pair is intentionally **not** treated as an automatic duplicate.

## Critical integrity protection

`ops/qbank/audit-grade910-live-question-revisions-20261016.py` computes actual live content SHA in memory and stores **only ID/hash/grade/type** in root-private `live-question-revisions.json` (0600). Changes to a reviewed option, numerical value, correct answer, marks, chapter, topic, language or wording change that SHA and thus require new revision-bound independent review. No raw question/answer or staff/student personal information is included in published artifacts.

`ops/qbank/build-grade910-live-source-review-delta-20261016.py` merges these live SHA values with the previous 2,581 frozen-original public-safe crosswalk, official source catalog claims, 170 protected faculty form IDs, PDF text, pilot OCR, current source-bound OCR progress, previous near-repeat review flags, and school-specific adoption state. It hard-fails on missing/unknown/duplicate stable IDs, source-ID/page conflicts, forged qualified review states, unsigned review form loss, invalid SHA, or fabricated final OCR completion.

Outputs remain **root-private** at `/var/lib/assps-grade910-sourceclaims/faculty-source-evidence-delta.json`. Each entry retains original **and** actual live revision identities where applicable, existing 56 faculty group key, precise missing academic checks, source evidence class, and the explicitly false values `actualSchoolEditionAdoptionVerified`, `authenticQualifiedReviewerApproved`, and `paperStudioAcademicallyVerifiedSelectable`. Neither textbook text nor raw questions/answers copied into this file.

It is attached to the **existing Sunday source-integrity service** after source SHA, exact PDF pages, OCR reference, answer-key and original-only protection checks; the existing bounded night OCR service also refreshes the evidence overlay after real source progress. The authoritative six-phase status reports **56 prepared evidence cohorts, 2,411 live revision hashes, zero independently signed teacher approvals and no approved snapshots**.

## Test evidence and release boundary

- **8 independent live-content SHA tests PASS**, ensuring edits change revision identity, JSON key order alone does not, and no raw text persists.
- **8 frozen-original/live-source review-queue tests PASS**, including malformed school adoption/qualified review, wrong PDF ID/page, unknown question ID, invalid revisions, truncated OCR and root-private storage.
- **16 six-phase tests PASS**, including forced failure on forged review approvals or mismatching source counts, correct 56-cohort/2,411-revision status and no auto-publication.
- No Question Bank insert/update/delete, academic approval, staff signature, Paper Studio import, exam marks/zeros edits, printer job, production frontend/backend deployment or Core tenant permission change occurred.

**Remaining genuine academic prerequisites** are school-issued exact textbook edition/session adoption, checked textbook question exercise/topic/page content, qualified independent subject/Urdu reviewer feedback bound to a specific source/live question revision, and Core/Paper Studio authorization for publishing only such signed revisions. The standing school institutional/Principal and physical printer acceptances have already been carried forward; do not request them again.
