# ASSPS Grade IX–X Academic Master — Biology IX Urdu Editorial Revision 2

**Date:** 2026-10-08. **Branch:** `feat/grade910-academic-master-evidence-20261008`. This is an isolated **editorial proposal**, not a school-adopted translation, independently reviewed answer key, a new unique question bank, or a production import.

## New tangible editorial content
Four **original Grade IX Biology Chapter 1 short questions** identified as missing Urdu content in the previous 54-record bilingual structural QA now have newly authored Urdu **stem and answer proposals**, in an isolated derived revision file:

- `IX-BIO-EM-RESEARCH-C01-T0101-S01` — microbiology and zoology (also **requires expert clarification of microbiology versus mycology** for the microscopic-fungi example)
- `IX-BIO-EM-RESEARCH-C01-T0101-S02` — cytology and physiology
- `IX-BIO-EM-RESEARCH-C01-T0101-S03` — morphology and anatomy
- `IX-BIO-EM-RESEARCH-C01-T0101-S04` — taxonomy, similarity/difference and relationships

Parent original `biology9TopicResearchDrafts.json` SHA-256: `d7afb8f8feda76162600ff7b8e3c09cb38e4dc51d9862dd321898f8e5749372a`. The build script **rejects source drift before generating any candidate**, and preserves the original ID, English stem, answer, grades, chapter/topic, question type, marks, source and review data. No pre-existing draft changes, no automatic translation approval, and **zero new unique original questions**.

Derived candidate `ASSPS_BIO9_RESEARCH_URDU_EDITORIAL_REV2_20261008.json` SHA-256: `5959f96b95ec2918a1b942d55b724fef7e96f936b23788777cd4761a92718b3c`.
Independent reviewer docket `ASSPS_BIO9_RESEARCH_URDU_EDITORIAL_REV2_DOCKET_20261008.json` SHA-256: `2a9444f67727bdc16a19d52769812d06b9116b440d2a0d892adc5f1c6e71a376`.

Each proposed Urdu revision has **per-question** parent and proposed SHA-256 identity, independent reviewer null, Urdu/subject terminology review pending, independent source-page proof false, adoption false, approved false, published false. Review attention: Urdu idiom, technical terminology and English/Urdu conceptual equivalence for each question, with explicit expert check of S01's fungi specialty claim. No AI-generated translation is a human verification.

## Integrated, still fail-closed reviewer queue
`ops/qbank/verify-bio9-editorial-translation-proposals.cjs` verifies the original file bytes, derived revision bytes, individual parent and proposal SHA, unmodified English source, pending review, empty reviewer identity, and nonpublication constraints. It rejects forged document approvals, altered parent, changed Urdu revision, or forged docket fields.

The existing metadata-only `ASSPS_GRADE910_REVIEW_TRIAGE_QUEUE_20261008.json` remains **2,581 stable authored items / 73 original files**, with **4 missing-original-Urdu blockers active** and `4` explicitly linked, unapproved editorial translation candidates. It adds SHA and file pointer only; it does **not** copy text/answers or treat the proposed translations as complete original Urdu questions. No derivative counts are added to the original 2,581.

## Verification and release decision
- New test cases protect exact four identity, full English and academic metadata preservation, nonempty Urdu proposal, no forged academic/reviewer flags, deterministic bytes/hashes, S01 reviewer science flag, tamper rejection and stale-queue parent revision rejection.
- Original school textbook edition/examination cohort and physical exercise/page verification remain unconfirmed. Independent human scientific review, language specialist and separate academic approver remain essential.
- Source-verified question **0**, human-reviewed **0**, approved **0**, published academically verified **0**.
- Paper Studio academically verified selector **HOLD**; SaaS Core alone owns role/RLS review and eventual production release certification. No live DB queries/writes, seed, authorized role changes, official paper modifications or production deployment.

### Reproduce
```sh
node ops/qbank/build-bio9-research-urdu-editorial-rev2.cjs --write
node ops/qbank/build-grade910-review-triage.cjs --write --strict
node --test ops/tests/bio9-research-urdu-editorial-rev2.test.cjs ops/tests/bio9-editorial-review-queue-bridge.test.cjs ops/tests/grade910-review-triage.test.cjs ops/tests/grade910-bilingual-structural-parity.test.cjs
```
