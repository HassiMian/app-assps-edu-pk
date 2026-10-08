# ASSPS Grade 9–10 Question Bank — safe intake, evidence and release gates

Date: 8 October 2026 UTC. Scope: controlled forward-only work based on the current canonical source commit `68a158e067e8bbcb0f35514abaff8d580a6435be`.

## Root cause and remediation

The legacy JSON seed helper searched schools by **display name**, with a fallback that could select a different school having the same name, and inserted questions as `is_approved=true`, confidence 100, regardless of source review. The live data contains two distinct, same-name tenant records: operational school **ID 1**, exact code `assps`, and staging-only school **ID 5**, exact code `al-siddique`.

The forward correction:

1. Rejects display-name selection; requires one exact `--school-code`, and rejects duplicate/missing/invalid codes.
2. Disallows JSON-seed automatic academic approval and requires `--provisional` for any `--apply`. All inserted records have `is_approved=false`, confidence 60 and `metadata.review_state=provisional_internal`.
3. Requires a verified **actual** PostgreSQL current database name matching `--expected-db` for write mode; preview always uses `BEGIN READ ONLY`.
4. Preserves deterministic candidate IDs, seed input-file SHA-256 (explicitly distinct from verified source-PDF SHA-256) and per-question SHA-256, flags MCQ answer-key skew, and does not claim preview rows were inserted.
5. Keeps all existing original staging rows untouched; does not transfer them between tenants or silently approve academic material.
6. Restricts the forward backend-only release guard to the offline importer and its policy, source audits, regression tests and documentation; no frontend or unrelated backend source may be shipped under this scope.

## Real disposable-clone verification

The current production PostgreSQL database was copied into disposable `assps_qbank_intake_stage_20261008`. A three-question original test fixture was imported solely into **school ID 1** in this clone. All records remained unapproved provisional candidates. Re-import skipped all three duplicates, and invalid school-name, missing provisional designation and mismatched DB identity were rejected before writes. The live school DB was not modified by these tests.

An independent tenant-scoped RLS audit in the clone found **2,337** staging Grade 9–10 candidates in school ID 5 and **zero** academically ready questions. Blocking dimensions:

- 2,337 missing independently verified source pages.
- 2,337 unapproved/provisional and missing academic review attestation.
- 2,133 with no fully verified exercise index or approved question-generation status.
- 1,248 with incomplete chapter-index verification.
- 264 medium mismatches, 70 grade mismatches, 70 subject mismatches, and 204 without a structured catalog link. These are audit flags; they are not claims that all corresponding questions are factually false.

Source hash evidence is recorded in the versioned 111-row catalog ledger. Two **actual official PDF binaries** downloaded from the referenced catalog were checked for PDF signature and exact SHA-256: Grade 9 Chemistry English `pectaa-catalog-007`, SHA `05e0fcca2e1762cc8d9122546d4ff4a612f18f8f061db1a5c04f17d99315b518`; Grade 9 Biology English `pectaa-catalog-009`, SHA `f6e3181561856359e77749f8f684f87c04c9c0a05bd2f0f60f60b4338c4284c5`. Both match the existing catalog. **Matching PDF bytes establishes source authenticity, not reviewed answers or exercise-level approval.** Neither is automatically published.

## Technical use

Preview with explicit tenant:
```sh
DB_NAME=<disposable-db> node al-siddique-backend/src/scripts/seedQuestionBankFromJson.js \
  --file /path/to/owned-candidate-data.json --school-code assps --dry-run
```

A provisional import requires both `--apply --provisional --expected-db <disposable-db>`. Never invoke the old name-based script for a live release. Candidate progression to the operational school must subsequently use versioned Question Bank governance and independent academic approval, not arbitrary SQL updates or JSON-seed autoapproval.

For operational auditing, `ops/qbank/audit-tenant-evidence.cjs` uses the exact school identity, restricted `apex_app_runtime` role and `BEGIN READ ONLY` on a disposable clone. It publishes *counts and flags*, not full private school question content. `ops/check-school-exam-readiness.cjs` fails closed until an approved, nonduplicate, correct-tenant, source-grounded chapter-level mix exists.

## Remaining substantive academic blocker

The staging bank is a draft inventory, not an approved examination Question Bank. Verifying authoritative curriculum edition, chapter/exercise/page location and accuracy of question answers/MCQ keys across all subjects is still required. An inflated count cannot substitute for that work. Keep the independently functional manual PaperDocument authoring path available while the academic review queue is processed.
