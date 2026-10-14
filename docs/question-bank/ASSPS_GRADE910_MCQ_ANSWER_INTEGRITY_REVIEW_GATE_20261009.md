# ASSPS Grade IX–X Academic Master — MCQ answer/key fail-closed review gate (9 October 2026)

**Scope:** Isolated Academic Master branch `feat/grade910-academic-master-evidence-20261008`, resumed directly from source checkpoint `3147afc58293cb8bbf7c15a86d1ce855977b1efa`. GitHub issues #4 and #1 coordinate Paper Studio and Core interfaces.

## Newly reproduced defect (negative controls first)

Previously `grade910AcademicReviewGate.approvedSourceMatchesRevision()` compared canonical legacy source and versioned question revision for exact equality. If the legacy and revision **both contained the same internally contradictory MCQ key and answer**, they passed this comparison, even though answer A actually referenced another option. Four distinct options/labels were also not required. Two **new synthetic negative tests failed before source changes (9/11 old targeted tests passed)**, proving the weakness in source/revision comparison, not claiming a production-approved bad question existed.

## New engineering

- `grade910McqIntegrityIssues()` normalizes candidate MCQ options and stored answers with Unicode NFKC, whitespace/case and terminal punctuation, **preserving scientific `+`, `-`, numerical and formula symbols**. Requires nonempty question stem; exactly four nonempty, uniquely lettered A–D options; four distinct text values; valid A–D correct key; nonempty stored answer exactly matching the unique selected option after benign normalization.
- `requireGrade910McqIntegrity()` fails closed with stable **`ACADEMIC_MCQ_ANSWER_OPTION_INCONSISTENT` (HTTP 422)**; other question types (short/long) are unaffected by this MCQ-specific check.
- Gate added during **recording of independent Grade IX–X academic review**, before evidence persistence; and on `normalizeEvidence()` before adopting server-owned school/page certificates. Final publication eligibility also re-checks MCQ validity via `approvedSourceMatchesRevision()` on both exact legacy source and current immutable revision.
- No option order, question answer, human review, certified source or original authoring JSON was edited. No fake attestations or examiner signatures. Existing editorial candidate MCQ queue remains provisional.

## Negative / positive evidence

- Identical legacy/revision with deliberately wrong stored MCQ answer: **prepatch accepted; postpatch rejected**.
- Same malformed options on both source/revision: duplicate distractors, fewer than four options, illegal key, blank answer and selected-answer mismatch now all reject.
- Direct certification helper rejects empty stem, invalid A–D option labels/order, duplicate choices including casefolding, wrong selected option and missing or ambiguous stored answer. Positive synthetic MCQ passes.
- Ionic `1+` and `1-` are kept distinct. Non-MCQ content remains compatible.

This is **technical selected-option integrity**, not independent scientific truth of the answer, distractor plausibility, translation accuracy or adoption/physical textbook page evidence.

## Mandatory release gates

2,581 original research/draft questions; 0 independently human source-verified questions, 0 human-academically reviewed, 0 approved, 0 published verified. School-adopted edition/medium/examination session, physical book printed/PDF page evidence, original reviewer distinct from author and publisher, independent human answer verification and Core signed non-BYPASS tenant RLS are all required. No production seeding, migration, official paper modification or deployment. SaaS Core exclusively owns eventual production certification and rollout; Paper Studio approved selector remains unavailable for unreviewed Grade IX–X items.
