# ASSPS Grade IX–X Academic Master — 80/80 Numericals Reconciled Against Current School 1 Revisions

**16 October 2026 | Completed machine arithmetic evidence | NOT school academic approval or production publication**

## Why this was necessary

The historical 21-item numerical prioritization receipt still labels 21 live revisions as `LEGACY_MACHINE_QA_ONLY_LIVE_REVISION_NEEDS_DEEP_RECOMPUTATION`. That was the **historical reason the items entered the queue**, not evidence they remain unchecked today. An existing separate `numerical-deep-recomputation-21.json` source proof already separately recomputed all **21/21** source questions, rechecked their live question/answer strings, and authenticated their current full-question content revisions, and at the same time re-authenticated the **59/59** older deep-reference numerical questions.

The Academic Master reran the existing `recompute-grade910-21-original-numericals-20261016.py --live-readonly` directly against the School 1 protected, read-only 2,411-question live bank. Result:

- **80 actual School 1 numericals** remain identifiable and versioned.
- **59** numericals from older, deeper original reference computations independently reauthenticated against the current live question stem, answer and content revision.
- **21** historic machine-only-priority numericals independently recomputed against their frozen original source and authenticated against live full question revision, stem and answer; **0 mismatches**.
- **80 of 80 current numerical revisions** now have **machine-computation/read-only evidence coverage**, and the earlier “21 need machine recomputation” label is **superseded in the NEW receipt**, not rewritten or deleted in its historic source.
- **0 authenticated independent faculty numerical answer reviews**, **0 ASSPS 2026–27 adopted-book edition certifications**, **0 question-specific printed textbook exercise/page certifications**, **0 academically approved Paper Studio selections**.
- **0 live school database writes**; no student results, marks or paper content changes.

**This does NOT mean all 80 numericals are independently academically approved or that every numeral's source textbook, measurement units, significant figures or examination-year relevance has been signed off by a qualified teacher.** A machine recomputation is a separate preliminary verification lane from genuine academic approval.

## Authoritative exact-revision, private evidence

The new `/var/lib/assps-grade910-sourceclaims/grade910-80-live-numericals-current-machine-arithmetic-20261016.json` is root-private `0600`, and stores only **80 distinct exact live full-content revision hashes**, frozen original research revision hashes, stable question IDs, grade, subject, machine-evidence lineage and explicit **false** flags for source adoption, faculty approval, original printed exercise verification and Paper Studio publication. It contains **no numerical stems, answers, textbook OCR excerpts or student records**.

The evidence join independently rejects inconsistent or stale references across:

1. The protected live 2,411-question full revision ledger.
2. The original 80-item live numerical evidence map, with **59** previously deeply source-recomputed vs **21** legacy machine-QA-only *at the time* labels.
3. The original 21 numerical priority queue (preserved verbatim as historical evidence).
4. The newer 21-source independent numerical recomputation certificate, whose full read-only computation is executed anew.
5. The previous 21-source proof receipt with 59 prior deep current-revision reauthentication.

**No double-counting:** the 59 previously verified IDs and the 21 source-recomputed IDs are disjoint and together exactly equal the original 80 School 1 numerical IDs. A changed approved question revision fails the evidence gate and must not inherit a prior review.

## Durable code, audit and evidence checks

- `ops/qbank/reconcile-grade910-80-live-numerical-machine-proof-20261016.py` recomputes actual current source/live numerical evidence before constructing the root-only immutable metadata-only 80-item receipt; `--check` reauthenticates all live SHA rows and refuses a stale receipt. It does not mutate historical priority receipts, questions, answer keys, school databases, roles or permissions.
- `ops/tests/test_grade910_all_80_numerical_machine_vs_review_20261016.py` has **15 fail-closed checks**, including original 59+21 scope, wrong live revision SHA, wrong frozen source SHA, duplicated/missing item, fabricated teacher approval, Paper Studio selection and production-write failures.
- The existing Grade IX/X academic-only source-claim one-shot service can install the new read-only machine-coverage receipt check as a guarded additive postcheck; no new timer, application migration or production deployment is created.
- GitHub CI's offline hermetic checks guard the proof model, while VPS-only live database checks and root-private receipts remain local and unauthorized users do not receive numerical answers or student data.

## Overall Academic Master position

The existing **2,411 live provisional Grade IX/X question records**, **2,581 frozen original source records**, **170 held original-only questions**, **227 live questions with separate unapproved explanatory drafts**, **998 source-page claims**, and separate **387 unlinked subjective answer-depth editorial flags (166 HIGH)** are preserved. The 998 claimed textbook exercise-page evidence items and 80 numericals are *overlapping review dimensions*, not additional question rows.

**Real remaining blockers:** authenticated ASSPS-selected 2026–27 textbook editions/mediums and Matric-Tech subject adoption, actual corresponding exercise/page context, independent qualified subject/Urdu reviewer sign-off for the precise current question/answer revision, approved-only Paper Studio integration, and SaaS Core tenant-security + production cutover certification.

**Authoritative machine readiness remains 4/6. Academic publication HOLD remains mandatory.**
