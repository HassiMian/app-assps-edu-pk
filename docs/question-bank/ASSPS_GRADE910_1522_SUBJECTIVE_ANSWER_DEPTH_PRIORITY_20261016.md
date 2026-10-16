# ASSPS Grade IX–X — All 1,522 Subjective Answers: Revision-Specific Depth Triage

**Academic Master — 16 October 2026. Real School 1 read-only machine screen, not faculty subject review or approved publication.**

## Scope and new evidence

Existing live School 1 Grade IX/X Question Bank: **2,411 provisional** current question revisions. Total candidate distribution reauthenticated: 854 short; 545 long; 809 MCQ; 80 numerical; 71 grammar; 25 essay; 21 comprehension; 4 application; 2 letter. The 1,522 subjective records are all categories except MCQ and numerical. No data reseeded, overwritten, edited, approved or pushed into Paper Studio.

The existing protected full-current-content SHA256 ledger was verified against a new **fresh read-only 2,411-row PostgreSQL snapshot**, for every subject question, before the author-research answer depth screen ran. The independent \`ops/qbank/audit-grade910-subjective-answer-depth-20261016.py\` protects grade, subject, medium, type, marks and current revision ID; it stores no question/answer text, options or student data in its root-private review queue.

A heuristic, deliberately **not a correctness verdict**, counted whitespace-delimited word tokens in stored answers. It identified the following mutually exclusive review-priority categories:

| Grade IX/X type | Machine observation | Count | Triage severity |
|---|---|---:|---|
| Long, at least 4 marks | Answer at most 25 whitespace-delimited words | 332 | High |
| Essay, at least 5 marks | Answer at most 25 words | 25 | High |
| Long, at least 4 marks | Answer 26–40 words | 191 | Review |
| Short, at least 2 marks | Answer at most 6 words | 41 | Review |
| Comprehension, at least 3 marks | Answer at most 12 words | 9 | Review |
| Letter/application, at least 5 marks | Answer at most 25 words | 6 | Review |
| **Total editorial review-priority candidates** | Not individual correctness failures | **604** | **357 high** |

Additional boundaries: **523 of 545 long answers are at most 40 words**; all **25 essay answer records are at most 25 words**. This may reflect abbreviated marking keys rather than objectively wrong answers. Urdu segmentation, formulas, scientific symbols, diagrams and rubric expectations differ; machine token count is only a risk indicator. A teacher must inspect the answer's actual correctness and mark-weight suitability before academic approval. No stored answers were amended.

## Reproducibility, safety, and publication hold

- Original script: \`ops/qbank/audit-grade910-subjective-answer-depth-20261016.py\`; new corpus/answer-depth tests: \`ops/tests/test_grade910_subjective_answer_depth_20261016.py\` (11 checks).
- Main canonical six-phase script updated with optional, independently validated subjective evidence: \`ops/qbank/assps-grade910-autonomous-six-phase-receipt-20261016.py\` and \`ops/tests/test_grade910_subjective_six_phase_gate_20261016.py\` (4 adversarial tests). Existing 22 phase and 5 numeric-phase tests remain preserved.
- Protected private receipt: \`/var/lib/assps-grade910-sourceclaims/subjective-answer-depth-risk-20261016.json\` mode **0600**, with stable question IDs, exact current live SHA and priority/reason only; no raw question or answer text, no faculty data.
- Existing 80/80 live numerical machine proofs, 809/809 MCQ option tests, tenant RLS and immutable original ledgers retained. The six-phase machine gate stays 4/6, **0 independent faculty approvals**, and academically verified publication is intentionally **HOLD**.
- New additive \`84\` systemd guard is ordered *after* the existing \`80\` numerical and \`82\` MCQ choice checks and *before* authoritative \`85\` six-phase receipt in the same Sunday 03:35 PKT academic source-only audit. An old \`85\` service file is updated only if it matches the known SHA256-reviewed earlier implementation. The guarded installation is shell-syntax, test and source-cleanliness checked, nonblocking, and can restore the original binary on staging errors. It does **not** deploy SaaS Core/Next.js, touch marks or create a new competing Question Bank.

## Genuine remaining completion gates

The 2,411 current live records are **provisional**, not academically reviewed merely because machine tests passed; 2,581 frozen original research IDs, 170 unsigned original-only, 56 unapproved faculty review cohorts remain separate. Full genuine release still needs ASSPS-specific adopted 2026–27 book edition and cohort/medium, independently verified page/exercise content mapping, qualified subject and Urdu-medium exact-revision review, and SaaS Core/Paper Studio release/security acceptance.

As source applicability guard: official PECTAA's Grade IX *2026 annual exam* Revised Smart Syllabus notice (07 November 2025) is not automatically evidence for the school's 2026–27 full-syllabus assessment or a different exam year. See https://pectaa.edu.pk/curriculum-compliance/ and https://pectaa.edu.pk/uploads/Revised%20ALP%20Notification%2007.11.2025.pdf .
