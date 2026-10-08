# ASSPS Grade IX–X Academic Master — Revision-bound offline reviewer queue (8 Oct 2026)

## Implementation and scope
Branch `feat/grade910-academic-master-evidence-20261008`, after `e57551ae47361ec2776fdff4090533cc3b748510`. This is an independent, reproducible **offline academic-review work queue**, not a Paper Studio provider, production import or a signed academic approval.

`ops/qbank/build-grade910-review-triage.cjs --write --strict` reads only original authoring `drafts/items` and the existing PECTAA source manifest and MCQ editorial QA report. It emits `ASSPS_GRADE910_REVIEW_TRIAGE_QUEUE_20261008.json` with stable question ID, the exact original draft's SHA-256, source file, subject, medium, edition/page **claims**, blocker tags and blank reviewer/approver state. It deliberately does not serialize questions, correct answers, options, authors' private notes or human-signature information.

## Measured queue
- 2,581 original questions / 2,581 unique IDs from 73 authoring files, **0 ID collisions**. Derivative Biology IX editorial Revision 2 is not counted as a new question; it retains its separate hash-pinned review docket.
- Medium labels from draft metadata: 1,562 English, 971 Urdu, 48 dual. These do not certify correct translation/subject applicability.
- Every item is blocked on school-specific adopted edition/exam-year evidence **and** independent human academic review; 0 source-verified/0 independently reviewed/0 approved/0 published.
- Physical source claim missing 1,188; positive page claim requiring physical image, section/exercise inspection 1,393. Book PDF/hash identity is insufficient for source-level question verification.
- Edition label non-specific or not structured as an explicit edition year: 921. Missing numerical chapter/topic identity 44 each (some may intentionally represent grammar or cross-chapter tasks; not silently assigned to a chapter).
- 743 MCQ records are in 53 files with file-level answer-key pattern editorial flags; this is triage, not 743 independently erroneous key identities. 54 items contain simultaneous English/Urdu content and need exact bilingual equivalence review.
- No original content, approved flag or database table mutated. Even a draft already containing `review.status='approved'` cannot make the offline queue approve it.

## Human reviewer next steps (strictly pending)
An authorized school academic authority must establish the adopted textbook edition and examination cohort (not merely school-wide timetable), then independent subject reviewer must inspect original source book page images and printed-page/exercise/chapter context, check the revision-bound question/MCQ/numerical answer, and record independent bilingual equivalence where applicable. Only after **a separate independent academic approval** and the SaaS Core tenant/role/RLS checks can any full versioned snapshot reach Paper Studio under issue #1.

## Reproducibility
`node ops/qbank/build-grade910-review-triage.cjs --write --strict`
`node --test ops/tests/grade910-review-triage.test.cjs`
Tests bind every queue item's hash to its exact original full question record, reject conflicting question identities, show any content/answer edit produces a new hash, and guarantee that no approval or publication state arises from untrusted authoring metadata. The output is intentionally reproducible, with no generation timestamp or guessed source-page evidence.

**Release decision:** zero independently approved revision-bound records; approved snapshot remains empty/pending. Production promotion remains reserved to SaaS Core after security certification.

## Additional isolated Mathematics X mechanical answer check
The independently authored `mathematics10OriginalReasoningBatch2026.json` contains **11** numerical questions across Chapters 1–9 and 11–12. The new `ops/qbank/audit-math10-numerical-answers.cjs` computes numerical results independently from fixed algebraic/geometry/probability models, then checks each stored answer includes the expected result expression. All **11/11** passed the actual batch; negative regression cases replacing quadratic roots, matrix inverse or circle radius are detected. The output `ASSPS_MATH10_NUMERICAL_INDEPENDENT_MECHANICAL_QA_20261008.json` stores exact per-record SHA-256 hashes and booleans, not full question/answer text. This is **machine arithmetic spot checking** only: a text result check does not prove every explanation, source chapter or school adopted edition is correct. Human reviewer, source-page verification, approved and published counts remain **0**.
