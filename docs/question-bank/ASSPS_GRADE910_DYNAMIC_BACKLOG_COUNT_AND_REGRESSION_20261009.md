# Grade IX-X Academic Master — reconciliation report-count defect and isolated regression

Date: 2026-10-09. Authority: Grade IX-X Academic Master only. Production: HOLD.

## Verified starting point
- Issue #4 latest inspected: 160 comments; latest Academic owner reference: 00b4a65d7f5a93576a39e92dc40e8b51269f062b.
- Source worktree/remote matched exactly and were clean before isolation.
- New isolated branch: fix/grade910-dynamic-backlog-report-20261009.
- Existing 2,581 original research question candidates and 166 rubric-only long-answer source fields were untouched; 130 distinct external English research answer proposals remain unapproved, with 36 remaining original rubric-only IDs.

## Independently reproduced regression
- Before correction: actual 130-ID reconciliation JSON and output said 36 outstanding, but Markdown generated from the same source falsely said 82.
- Prepatch source-exact assertion: REPORT_MISMATCH, numeric exit 1.
- Fix: derive the Markdown companion backlog count from d.originalRubricOnlyIdsWithoutNewAnswerDraft; add automated equality assertion against the reconciled value.
- Historical JSON content remains unchanged, latest Markdown accurately says 36. Do not add the 130 explanatory drafts to the original 2,581 questions.

## Executed exact isolated gates
- node --test ops/tests/grade910-authored-answer-coverage.test.cjs: 13/13 PASS; process exit 0.
- node --test ops/tests/grade910-*.test.cjs: 114/114 PASS; process exit 0; evidence /tmp/assps-academic-backlog-report-grade910-20261009.tap.
- node --test al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/*.test.mjs: 510/510 PASS; process exit 0; evidence /tmp/assps-academic-backlog-report-staging-20261009.tap.
- git diff --check: PASS. No new authored answer packet was added in this branch.

## Strict blockers and boundary
- Academic applicability to actual ASSPS 2026-27 adopted textbooks, language, edition, printed exercise/PDF page, independent subject/Urdu review and question-revision-specific signature still unverified.
- Human school-source verified 0, independently academically reviewed 0, academically approved 0, verified published 0. Paper Studio verified IX/X selectable bank remains EMPTY/HOLD.
- The test results are source/static unit and staging checks, not authenticated tenant PostgreSQL RLS, real production signed persistence or physical Urdu print/PDF/DOCX certification.
- No production deploy, seed, migrations, official paper editing, tenant database writes or other owners' branches changed. SaaS Core exclusively certifies/releases production.
