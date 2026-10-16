# ASSPS Grade IX-X — Exact live Question Bank collision/contrast screening

**16 October 2026, Pakistan time.** This is a live **read-only** School 1 machine-level QA result, independent of but supplementary to the previously source-controlled original 2,581-question scholarly similarity audit. It does not grant teaching approval or replace any authenticated qualified subject/Urdu teacher review.

## Verified results

- **2,411 current Grade IX and X provisional questions** screened across **1,690 grade/subject/chapter/type/medium buckets**.
- **0 exact normalized same-context question-stem collision groups**; **0 identical-stem/different-answer conflict groups**.
- **0 probable near-stem pairs within the same narrowly defined grade, subject, chapter, type and medium bucket** at the conservative token-similarity threshold. This does NOT establish zero cross-chapter template reuse or no hidden semantic duplicate. Those remain in the separate 2,581-original source-level similarity review, which identified cross-chapter editorial candidates.
- No questions were deleted, corrected, imported, academically approved or published by this audit. Technical duplicate safety does not prove answer correctness or exact book/exercise provenance.
- English/Urdu medium buckets are deliberately separate, and digits, arithmetic operators, chemical charge indicators, and positive-vs-zero scientific qualifiers are treated as *meaningful potential differences*, not automatically collapsed into duplicates.

## Repeatable machine verification

- `ops/qbank/audit-grade910-live-question-collisions-20261016.py`: read-only transaction against the actual School 1 PostgreSQL bank, stable ID/provenance checks, conservative near-stem comparison, root-private ID-only evidence. No original question prose/answers are copied into source-controlled reports.
- `ops/tests/test_grade910_live_question_collisions_20261016.py`: **9 PASS**, including normalized duplicates, contradictory answer/text collision, numerical/charge/qualifier distinction, suspected paraphrase merely advisory, duplicate ID rejection and private 0600 evidence file.
- Private, current ID-only receipt: `/var/lib/assps-grade910-sourceclaims/live-stem-collisions.json` (mode 0600).
- Included in the existing hardened Sunday 03:35 PKT source-integrity systemd service, installer preflight, GitHub CI and the one authoritative six-phase machine-readiness checkpoint; any unexpected newly introduced exact collision or unauthenticated approval triggers a technical hold rather than auto-delete or answer rewrite.

The earlier source identity, PDF SHA+page-count, author page claims, native PDF text-layer evidence, capped/resumable scanned-page OCR, 170 original-only unsigned faculty form protection and 809 MCQ answer-versus-selected-option integrity checks remain preserved. The absence of real adopted textbook-edition evidence and per-revision qualified independent review means **academically verified publication remains on hold**, correctly.
