# ASSPS Grade IX–X Academic Master — Full 2,581-candidate school-adoption source reconciliation (9 October 2026)

## Recovery and provenance

Continued exactly from the latest four-master GitHub issue #4 coordination and clean branch `feat/grade910-academic-master-evidence-20261008` at `2b0506e3c6646184ac2cfb9429e5988443ba9cad` (local HEAD and origin remote matched, worktree clean before this round). The previous read-only 55-source `Starter2026` 2,096-question adoption evidence docket and all earlier academic review, curriculum mapping, duplicate, signed identity, immutable hash, page/answer/MCQ/Urdu gates were **preserved**, not rebuilt, repeated or weakened.

## NEW independently verifiable coverage gap closed

The previous school book-adoption evidence queue audited only 55 `*Starter2026.json` draft files (2,096 questions). The existing independent audit reported **2,581 authored research question candidates**, leaving **485 authored questions** from the larger dataset outside a unified per-source book-adoption intake docket.

A read-only scan of every JSON file in the existing Grade9/10 staging directory found **18 additional authored-question files with 485 actual original drafts**. Two more `items` files with **33 authoring-queue entries and 25 exercise-evidence-map entries** contain no actual question stem and **must not inflate the bank count**. `english9CompetencyOriginals2026.json` contains **44 genuinely authored question items** in an alternate schema, correctly counted; the Chapter1 original bilingual Biology drafts and original Physics/Mathematics/Chemistry addition batches are also included.

New `ops/qbank/reconcile-grade910-full-candidate-evidence.cjs` consumes the actual versioned source JSONs and existing `build-grade910-adoption-evidence-docket.cjs` validator to preserve the exact previous 55-source rules, while safely normalizing authored `items` and authentic dual-language `source.languages.en/ur` claims for the supplemental corpus. Only two new `docs/question-bank` metadata-only reports are written; no original question or approval is modified.

## Actually measured NEW complete corpus result

- **2,581 existing distinct authored question IDs**: 2,096 previous starter records in 55 files + 485 non-starter authored records in 18 files = **73 authored files**, no ID collision.
- **56 canonical primary source registry IDs** used, sourced from the previously recorded server-owned **110** source registry entries. Every draft primary claimed source ID and declared PDF SHA matches the existing source registry. This is a ledger-identity consistency check, NOT a fresh physical PDF rehash or actual school-approved textbook.
- **48 dual-medium Biology IX authored drafts** carry **96 separate en/ur source-language claims**. Every declared language-specific source ID and PDF SHA matches its corresponding server registry entry; no independent bilingual **semantic** equivalence or independent school adoption has been asserted.
- **58 non-question metadata/map entries intentionally EXCLUDED**: 33 authoring queues + 25 exercise-page evidence-map records. The prior 2,581 count is preserved exactly and not inflated.
- **877 draft questions** associated with ineligible/non-explicit canonical source edition labels; **477 draft↔source edition label mismatches**; **114 unresolved catalog source grade associations**, including shared grade 0 grammar source or missing draft grade in alternate schemas; **408 unresolved/mismatched source medium associations**, including dual-medium and unspecific source medium. These four failure categories OVERLAP. No automatic grade, subject, medium, edition, exercise or textbook identity correction applied.
- **0** independent human source/book printed+PDF page verified, **0** academically independently reviewed, **0** approved, **0** academically verified published. Adoption and physical page registries remain empty/uncertified; all drafts provisional. An apparently syntactically explicit edition label is NOT actual ASSPS-approved curriculum applicability.

## Read-only evidence / reproducibility

- `docs/question-bank/ASSPS_GRADE910_FULL_2581_CANDIDATE_EVIDENCE_20261009.json`: deterministic complete corpus totals, source-level blocker counts, additional-file SHA-256 identities, canonical PDF source identity, secondary bilingual source-claim counts, excluded research queue metadata, and no signed approvals. Does not contain original copyrighted question stems.
- `docs/question-bank/ASSPS_GRADE910_FULL_2581_CANDIDATE_EVIDENCE_20261009.md`: human-readable full-corpus findings and 485 supplemental source-specific review gaps, together with remaining human academic and school textbook adoption workflow.
- Reproduce using `node ops/qbank/reconcile-grade910-full-candidate-evidence.cjs` and `node --test ops/tests/grade910-full-candidate-evidence.test.cjs`. Existing `ASSPS_GRADE910_SCHOOL_ADOPTION_EVIDENCE_DOCKET_20261009.*` are retained unchanged.

## Independent adversarial tests and gates

- **11 NEW scoped tests** covering 2,581 unique real research IDs, 73 authored files, 58 non-question exclusions, exact overlapping edition/grade/medium counts, two actual Biology en/ur source hashes, deliberately corrupted secondary PDF SHA detection, forged/unknown en/ur language key, corrupted primary textbook SHA detection, duplicate stable ID detection across starter/supplemental files, authoring queue injection into question count, forbidden live-import flags, reproducible input order and no question stem copied into the output. Existing 8 source-docket tests are also run together.
- **19/19 combined evidence-docket tests PASS, exit 0**, no fail/skip/cancel. Full existing Academic source/review/provenance/MCQ/numerical/bilingual focused suite and Grade IX/X staging suite are rerun on exact current source with separate saved TAP and explicit process exit markers, and final results are recorded below after completion.
- No actual human signed adoption, school textbook physical pages, board examination year verification or live restricted PostgreSQL/RLS actor test was completed by this synthetic/metadata research batch.

## Genuine next bottlenecks and release boundary

1. ASSPS academic school authority must adopt **actual printed textbook titles/editions, relevant approved grades, mediums and academic/examination year** per intended cohort. Unresolved catalog edition labels and 114 source-grade/408 medium cases cannot be silently normalized into approval.
2. Obtain actual **printed book page and exercise reference** plus physical PDF page mapping, page-image SHA, original source hash and independently identified human page-verifier—not just inferred offsets/claims.
3. Independently validate question/answer correctness, MCQ distractors, Urdu and English equivalence, origin/copyright, difficulty and subject-specific mapping; record qualified human academic signatures on the exact immutable question revision.
4. ONLY subsequently stage actual approved Grade IX/X snapshots for Paper Studio. **Paper Studio must keep the academically verified selector empty**. SaaS Core owns real tenant/RLS and production release certification and any future deployment.

**No uncontrolled seeding, teacher/student/tenant database mutation, original official paper overwrite, source PDF modification, approval/publication status flip, security role change or production deployment.**

## FINAL executed test evidence, exact new full corpus source

- Combined existing+new evidence-docket tests **19/19 PASS** (the original 8 source/adoption docket tests plus new 11 complete 2,581 corpus/dual-language/anti-collision/adversarial cases). Failed 0, skipped 0, cancelled 0; `/tmp/assps-grade910-full-corpus-docket-targeted-20261009.tap`.
- Full existing GradeIX/X Academic source/curriculum/independent reviewer/MCQ/Urdu/numerical/provenance focused regression **178/178 PASS**, failed/skipped/cancelled 0, process **exit 0**, 52.04 seconds; `/tmp/assps-grade910-full-corpus-focused-20261009.tap` and separate `.exit`.
- Original full Grade IX/X staged authored question/academic contract regression **510/510 PASS**, failed/skipped/cancelled 0, process **exit 0**, 77.25 seconds; `/tmp/assps-grade910-full-corpus-staging-20261009.tap` and separate `.exit`.
- Reproducible exact report artifact SHA-256s: JSON `192ebc19e8d6c9e817bbd30c56c2134abcec756504dbbe8e3e6c3d3d6cb901f0`, Markdown `fa8a1f1ffe7ab7b923b6e3146d7fafac0def63ad74d49d0d2593b28779444554` (regenerated twice with identical inputs). Syntax, staged whitespace, Git remote and clean worktree rechecked before final coordination.

No production deployment, no externally sourced human signoffs; record-level source SHA match does NOT mean physically confirmed textbook page or approved scientific answer.
