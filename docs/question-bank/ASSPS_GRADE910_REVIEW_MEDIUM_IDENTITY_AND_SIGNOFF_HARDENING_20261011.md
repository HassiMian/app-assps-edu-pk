# Grade IX–X Academic Master — frozen-medium and signoff-evidence hardening

Date: 2026-10-11. Academic-only isolated branch. This evidence is NOT an independent teacher signature, school book adoption certificate, approved question bank, or release permission.

## Verified continuation
- Parent Academic HEAD: `ac541fea891034221b4766abe8558bb0b3edb4e0` (`fix/grade910-review-medium-source-bind-20261010`).
- Preserved the exact 73 SHA-frozen original authoring files, their 2,581 original question ID/revision hashes, source catalog evidence, previous chapter/page research, and existing Paper Studio/Core/Connect branches.
- No candidate question/answer/option text, school data, tenancy policy, migration, historical paper, live deployment, or production database modified.

## Specific pre-existing intake risks repaired
1. A research review packet could mislabel an English original as Urdu, or a monolingual original as dual, because earlier logic only prohibited downgrading an original dual-medium question. Review medium is now required to **exactly match the original SHA-frozen question source medium**.
2. Exactly **50/2,581** immutable originals have no original medium claim and now fail intake with `FROZEN_ORIGINAL_MEDIUM_UNRESOLVED` rather than appearing structurally review-complete. Frozen source breakdown: English 1,512; Urdu 971; dual 48; unresolved 50. These counts are research metadata; not academic approval or a curriculum inventory.
3. Dual-medium intake formerly allowed one identity to sign both the independent subject and the independent Urdu reviewer fields; they must now identify separate people, both distinct from the author.
4. Empty/whitespace/non-string identities and submitted evidence references are rejected. Eight separate review checks require a nonempty string evidence reference.
5. Review and school-approval timestamps must be valid canonical UTC timestamps with approval not predating review. No unauthenticated supplied timestamp is treated as an actual digital signature.

## Safety and actual release status
All of the above are **shape and source-consistency validation**, not actual teacher credential verification. The intake response remains `publisherSelectable=false`, `reviewerIdentityCryptographicallyAuthenticated=false`, `schoolAcademicApprovalAuthenticated=false`, authenticated approvals **0**, verified publications **0**, production import **DENY**. The next transition cannot be made by a local boolean, reference string, an AI agent impersonating a reviewer, or a Git commit.

ASSPS school-authorized 2026–27 textbook/medium adoption records, actual physical printed page or source exercise evidence, applicable board/exam-year scope, qualified independent answer/option review, two-person bilingual signoff, and genuinely authenticated approval of exact revisions remain required. PECTAA published e-book editions do not in themselves establish what ASSPS adopted. The 2025-11-07 Grade IX revised ALP explicitly covers Annual Exam 2026, not automatically Exam 2027.

Official source links:
- https://pectaa.edu.pk/books-and-publications/
- https://pectaa.edu.pk/curriculum-compliance/
- https://pectaa.edu.pk/uploads/Revised%20ALP%20Notification%2007.11.2025.pdf

## Executed scoped checks
- Dedicated strict academic reviewer intake adversarial suite: **15/15 TAP PASS**, zero failed/skipped; full TAP persisted `/tmp/grade910-review-binding-final-20261011.tap` on authorized VPS. The 50-second remote shell transport returned a timeout before its exit message was received, so a separate shell exit-code attestation was not captured; test process did finish and write the full TAP summary.
- Paper Studio curriculum adapter/approved-only audit tests: **18/18 PASS** with zero failed/skipped and complete TAP output.
- JavaScript syntax and Git diff whitespace checks: PASS.
- Previously completed 345 Grade IX–X academic TAP tests on the preceding SHA remain historical regression evidence, **not** falsely presented as rerun on this new code.

Publication remains HOLD. Production deployment belongs exclusively to SaaS Core; 43 completed legacy papers are reference/compatibility content rather than live question-approval gates.

## Read-only 50-source-language faculty handoff — new research evidence

An additional deterministic, frozen-source-backed review packet now exists at `ASSPS_GRADE910_50_UNRESOLVED_MEDIUM_SOURCE_REVIEW_20261011.json`. It exports only immutable original IDs, source/revision hashes, source catalogue identifiers, abstract language-presence metadata and explicit HUMAN REVIEW HOLD decisions; it never publishes question text, answers, original copyrighted content or impersonated signed approval. The generation command `node ops/qbank/prepare-grade910-missing-medium-review.cjs --write` is deliberate, not invoked implicitly by a production build. `node --test ops/tests/grade910-unresolved-frozen-source-medium-review.test.cjs` verifies exact JSON reproducibility and original SHA identity.

Source-shape audit found 50 originals without question-level medium metadata in exactly two frozen research files: 44 standalone English Grade IX competency items, and 6 Biology IX source research questions. Among those six Biology drafts, **two** have an Urdu-language stem and **four** have no usable Urdu stem. The presence of an Urdu research draft is NOT independent semantic equivalence or permission to mark the source `dual`. No frozen source is edited. All 50 need a qualified explicit subject/medium/provenance decision and any necessary authored revised record, with its own new revision and review. Original human approval remains zero.

Two additional read-only manifest tests: **2/2 PASS**, exit0. No new deployment or school operational dataset changes.
