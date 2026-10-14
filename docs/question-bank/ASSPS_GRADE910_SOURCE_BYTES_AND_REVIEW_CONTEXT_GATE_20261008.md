# ASSPS Grade IX–X Academic Master — Source-byte Integrity and Review Context Gate

**Execution:** 8 October 2026, isolated Academic Master `feat/grade910-academic-master-evidence-20261008` from previous clean `aafe877b1569f2399579b36f377e41c2fd80c5cc`. Scope confined to source provenance reattestation, offline tests and Grade IX–X review-context honesty. **No production deploy/DB writes, official paper changes, or approval.**

## Newly executed, full cached-source byte reattestation

- Input: the preserved 111-row official-source manifest and corresponding existing 111-row catalog SHA-256 ledger. Source cache is private VPS file data, not altered.
- Streaming, single-file-at-a-time actual SHA-256 processing read **5,408,429,581 bytes** (~5.41 GB decimal), bounded memory, 21.97 s in observed run (peak RSS ~96.5 MB).
- **110/110 present PDF asset files: exact cached bytes match manifest + ledger SHA-256 and begin with valid PDF file header**. Zero hash mismatches / corrupt header flags during this scan.
- **1 intentionally not verified**: catalog `pectaa-catalog-037` has no official PDF SHA and is quarantined. This audit does not pretend its source is downloaded or equivalent to a different textbook edition.
- **Result file:** `docs/question-bank/ASSPS_GRADE910_CACHED_PDF_BYTE_REATTESTATION_20261008.json`. Each asset has ID, expected and newly calculated SHA, bytes and header flag; metadata only, no textbook page content, no confidential credentials, no source PDF copies in Git.
- Audit prevents escaped cache paths/symlink traversal and rejects manifest↔ledger identity drift. Negative regression fixtures catch hash tampering, forged matching non-PDF bytes, missing/altered source metadata and path traversal.

**Important limits:** This is independently rerun **PDF file byte integrity**, not independent physical/printed page inspection, edition applicability, chapter/exercise identity, answer review or school adoption proof. It does not claim that the hash ledger itself establishes copyright or publication permission.

## Newly repaired misleading review-context approval signal

Previously `grade910AcademicReviewService.getAcademicReviewContext` returned `academicApprovalGranted: true` whenever the question lifecycle was `ready`, **without** querying revision-bound independent academic-review proof in that endpoint. On this isolated branch, this unsafe equivalence is now removed: `academicApprovalGranted:false` and `academicApprovalProofStatus:'NOT_EVALUATED_IN_REVIEW_CONTEXT'`. The actual independent academic approval/deployment gate remains `assertIndependentReviewReady` with server-owned school-adoption, physical-page and revision-bound evidence. Read-context is not an approval authority.

Unit tests use mocked tenant transaction (no real database) and check ready/reviewed lifecycle and author identity **cannot** turn the academic approval flag true. SaaS Core/Paper Studio owner review is mandatory before integrating any cross-owned backend route; no deployment performed.

## Unresolved academic / release blockers

1. Human school authority confirms exact grade, subject/medium, printed textbook edition and registered board/exam year per cohort; the 2026–27 school timetable is **not** an adoption certificate.
2. Physically render and inspect textbook chapter and exercise pages, record independently signed source image SHA, actual printed page vs PDF physical page; `pectaa-catalog-037` source bytes remain unavailable.
3. Independent subject/Urdu/English reviewer and a different approver sign each exact question revision. 2,581 original drafts remain provisional; **source-verified 0; academically reviewed 0; approved 0; published 0**.
4. Paper Studio approved-snapshot provider and SaaS Core's effective signed non-BYPASS RLS, role tests, certification, production release and rollback remain held by their respective Masters under issues #1 and #4.

## Commands (read-only unless --write for this report)

```sh
node ops/qbank/reattest-grade910-source-bytes.cjs --write
node --test ops/tests/grade910-source-byte-reattest.test.cjs al-siddique-backend/src/tests/grade910-review-context-proof.test.js
```

**Publication decision: HOLD.** Actual cached byte hash verification does not authorize a single question to be published as academically approved.
