# ASSPS Grade 9–10: live source-evidence audit and teacher-review handoff

**Verified 8 October 2026 UTC.** Live PostgreSQL inspected read-only under restricted tenant role apex_app_runtime. **Academic approval remains HOLD.**

## Different populations must not be confused

The earlier 4,253-question academic readiness snapshot covered a narrower set of source-linked candidates. This later audit covers *all* live question_bank records whose class level is 9th or 10th. The difference does **not** mean more questions were approved.

| School tenant | Grade 9 rows | Grade 10 rows | Total live rows | Approved rows |
|---|---:|---:|---:|---:|
| assps (ID 1) | 1,530 | 773 | 2,303 | 0 |
| al-siddique (ID 5) | 1,650 | 1,070 | 2,720 | 0 |
| Total | 3,180 | 1,843 | **5,023** | **0** |

These school tenants must never be merged or given each other's approvals.

## Source and editorial blockers (overlapping counts)

| Observation | Flagged |
|---|---:|
| Missing structured source-page number | **5,023** |
| Source catalog ID not in independently verified registry | **2,502** |
| Missing/unstructured source claim | **1,141** |
| Source grade/subject/medium mismatch | **168** |
| Edition/session clarification needed | **618** |
| Possible same-school duplicate requiring review | **114** |
| Questions approved by this audit | **0** |

No source page numbers were inferred or written into the database. The source-catalog mismatches are review flags, not proof the question is false. These numbers overlap; do not sum them.

## Chemistry 9 priority

Each tenant has 354 Chemistry 9 questions. 315 in each tenant contain page-number claims numerically plausible against a **candidate scanned table-of-contents map**. That map has not been independently checked against every book image. Thirty-nine source identity/scope claims per tenant require attention. The local Chemistry 9 English PDF matches the exact SHA-256 recorded for PECTAA catalog entry 007. **Cryptographic PDF identity is not academic proof of a question, answer, exercise, medium, page or license.** The current course edition and session must still be verified.

## Human-review gate, no shortcuts

1. Confirm tenant, class, subject, medium, curriculum session and edition.
2. Compare each source claim with the exact textbook page image and chapter/exercise.
3. Independently check options, correct answer, marks, Urdu/English wording, applicable deleted topics and originality/use rights.
4. Resolve unregistered sources, ambiguous page numbering and possible duplicates.
5. Record reviewer identity, seven explicit academic attestations and reviewed question revision. Author cannot independently review own draft.
6. Approve only that governed, source-verified revision, then recalculate subject/chapter coverage.
7. Keep manual Paper Workspace, saved papers, Word/PDF and native printer dialog functioning regardless of incomplete automatic Question Bank coverage.

## Curriculum-year warning

PECTAA's Smart Syllabus for **2026 annual examinations** must not be silently used as the syllabus for the **2026–27 teaching session or 2027 examinations**. A session-specific official notification must be selected before deleting or excluding material.

Official references:
- https://pectaa.edu.pk/books-and-publications/
- https://pectaa.edu.pk/curriculum-compliance/
- https://pectaa.edu.pk/uploads/Revised%20ALP%20Notification%2007.11.2025.pdf
- https://ncc.gov.pk/Detail/YmFhODM2NTQtMmI1Mi00MGE5LWE3YTUtNTM4Y2U3ZGY4OGJi

## Private review package and tests

Code: ops/qbank/live-source-evidence-audit.cjs
Regression tests: ops/qbank/live-source-evidence-audit.test.cjs

Private VPS folder: /root/secure-archive/assps-academic-review-20261008/

Files:
- grade910-readonly-evidence-summary.json
- assps-question-review-queue.csv
- al-siddique-question-review-queue.csv

These export question IDs, school scope, source references, page claims and QA flags but **not copyrighted question text**. Folder mode 0700 and file mode 0600; not committed to public Git. Audit ran within repeatable-read read-only transactions under restricted application role. No production Question Bank rows or other school data were changed.

**Decision:** The source QA and triage queues are complete, but automated Grade 9–10 question eligibility cannot be certified until an authorized independent academic reviewer checks actual source pages and signs the exact question revisions.
