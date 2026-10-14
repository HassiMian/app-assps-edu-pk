# ASSPS Grade IX–X Academic Master — Chemistry IX MCQ option-order editorial pilot

**Checkpoint:** 2026-10-08. Isolated Grade IX–X candidate branch `feat/grade910-academic-master-evidence-20261008`. This work starts after completed 91-numerical mechanical QA, 110 cached-PDF byte hash confirmations, and Biology IX Urdu editorial proposal checkpoint. **No production deployment, no database seeding, no original authoring file edits.**

## Actual new batch

Ten authored **English-medium Grade IX Chemistry Chapter 10** MCQs from `chemistry9Chapter10EnglishDrafts2026.json`, and ten **Chapter 13** MCQs from `chemistry9Chapter13EnglishDrafts2026.json`, previously all with position **A** as the correct key, were revised **only by rotating the four original option texts** and adjusting the correct letter to follow the unchanged correct answer.

Original file SHA-256:
- Chapter 10 `c61a997c4da221578b2e3a0c38ac2c02aeab7d72a615be97ccd6250f10a52655`.
- Chapter 13 `c328c074b6caa9632712fa3007a7e457eac87a62e9bd5085114f35842463dc69`.

The derivative packet `ASSPS_CHEMISTRY9_C10_C13_MCQ_EDITORIAL_REV2_20261008.json` and its `ASSPS_CHEMISTRY9_C10_C13_MCQ_REV2_REVIEW_DOCKET_20261008.json` contain precisely **20 existing stable question identities; 0 newly authored questions**. Original stems, stored answers, multiset of all four option texts, question grades, chapter, topic, marks, declared textbook source evidence and answer explanations are unchanged. Each original question SHA and proposed revision SHA is pinned. Original drafts continue to be the authoritative research candidates.

**Option position distribution across this bounded pilot:** old A20/B0/C0/D0; candidate **A5/B5/C5/D5**. The existing MCQ sequence detector initially rejected a proposed sequence due to a run with period 4; it was corrected. Final pattern audit reports zero periodic-pattern flags **for these twenty proposals only**. This is editorial quality control of option placement, **not a scientific confirmation that the stored correct answer is in fact correct**, nor an assertion that balancing options guarantees a good question.

No approval is inherited from the old record: reviewer/approver IDs remain null, every academic and source check remains false, importer/publication disabled. **No automatic bulk option shuffling of the other 855 original MCQs was attempted**: the prior 875-original-MCQ count and 743 rows in periodically patterned files are risk signals requiring human editorial judgment.

## Review queue and safety evidence

A separate verifier checks exact source-file SHA, expected original answer, unchanged stem/source/marks, same four distinct option texts, correct selected option, per-question source/proposal SHA, pending reviewer state, and zero approval/publication flags. Forged approval, modified answer, stale original SHA or duplicate editorial candidate fails closed.

The existing immutable metadata-only 2,581-original-question reviewer queue now links **20 pending Chemistry MCQ revision candidates** alongside the **four pending Urdu Biology editorial candidates**; they are derivatives of the same 2,581 originals and must **not** be added as new question counts. The prior 4 unresolved original-Urdu blockers and other source/edition/review blockers remain active.

**Unresolved:** actual ASSPS adopted edition/exam year, physical printed PDF chapter/page and exercise evidence, actual Chemistry subject answer review, confusing distractors, English/Urdu equivalence where applicable, true independent reviewer with revision-bound academic approver. This pilot does not create board past-paper claims.

## Validation
- `node ops/qbank/build-chemistry9-mcq-editorial-rev2.cjs --write`
- `node ops/qbank/build-grade910-review-triage.cjs --write --strict`
- `node --test ops/tests/chemistry9-mcq-editorial-rev2.test.cjs`
- Existing original source files and school/tenant data remain untouched.

**Release decision:** **HOLD**. Question-level independently source-verified **0**, academically human-reviewed **0**, approved **0**, published verified **0**. Paper Studio may not select these as verified questions. SaaS Core solely owns production authorization, integration, signed tenant/RLS and release/rollback certification.
