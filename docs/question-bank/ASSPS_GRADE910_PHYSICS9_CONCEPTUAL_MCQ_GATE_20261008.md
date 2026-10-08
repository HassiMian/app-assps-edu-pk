# ASSPS Grade IX–X Academic Master — Physics IX conceptual MCQ reference audit

**Checkpoint:** 8 October 2026, after issue #4 Academic HEAD `432b578ea4198bf360fd43443939f592a35a5bd4`, on isolated `feat/grade910-academic-master-evidence-20261008`.

## Actual newly completed academic task

An independent **AI-assisted physics conceptual reference** was explicitly authored for the **18 original English-medium Grade IX Physics MCQs**, not the previously completed Chemistry IX C10/C13 option-shuffle, 91 numerical arithmetic cases, Grade IX Biology Urdu proposals or near-stem similarity scans.

The original `physics9EnglishStarter2026.json` contains **54 original questions**, of which **18** are MCQs covering SI measurements, precision/accuracy, vectors, Newton's laws, moment and equilibrium, work and power, elasticity, pressure, temperature and heat, magnetism and scientific hypothesis. Entire original 122,011-byte parent SHA-256 is **`1a882970fc2548f50bc001691d6de990ce156690cfa252f3f5355d8d63a6dc16`**.

The new `ops/qbank/audit-physics9-conceptual-mcq-reference.cjs` supplies **18 separately explained conceptual expected answers** rather than inferring correctness from a preexisting letter. For each item it verifies original option text set is four distinct A–D options, expected response occurs exactly once, selected stored key resolves to that response, the original question-level SHA is pinned and grade/subject/source/edition metadata remains the original protected draft. This operation demonstrates **18/18 stored key vs proposed reference agreement**, not external official textbook verification, independent human subject signoff or proof of correctness of the physics explanation.

**Eight subject-scope qualifiers** are specifically marked for human reviewer attention, e.g., constant mass and classical Newtonian assumptions; nonrelativistic momentum; coplanar rotational equilibrium; constant-force work; spring proportional range; normal force in pressure; thermodynamic distinction of temperature/heat; **heat input during phase transitions can change potential rather than average particle kinetic energy**, hence the unqualified starter MCQ wording needs contextual review. No answer, stem, options, IDs, grade or marks were edited.

Metadata-only `ASSPS_PHYSICS9_CONCEPTUAL_MCQ_REFERENCE_QA_20261008.json` stores question original SHA, expected answer hash, concise AI-authored physics explanation, named caveats and `independentReviewerId:null`, with **0** source-page verification, textbook adoption, independent human review or approval. These are provisional science review notes, not fake teacher signoffs or citations.

## Integrated candidate triage

Original `ASSPS_GRADE910_REVIEW_TRIAGE_QUEUE_20261008.json` preserves its **2,581 original authored IDs** and all existing four Urdu revision candidates, 20 Chemistry MCQ editorial revisions and 15 originality-review flags. It adds exactly **18** Physics IX `PHYSICS_CONCEPT_ANSWER_HUMAN_REVIEW_REQUIRED` blockers and eight `PHYSICS_CONCEPT_SCOPE_QUALIFIER_REVIEW_REQUIRED` warnings linked to exact original question SHA and expected answer hashes. No new unique original questions and no academic approval.

## New fail-closed tests and publication hold

- 8 new cases validate full Physics IX MCQ coverage, parent SHA, deterministic metadata report, eight scientific scope warnings, negative changed source/stored key/answer/missing or duplicate options, and forged human-review/revision references.
- Academic tests are offline Node/fixture checks, **not independent teacher review, physical textbook page attestation or exam board adoption**.
- No original authoring JSON, historical official questions, teacher account, protected Paper Studio paper, production DB, tenant/RLS service, migration or deployment was changed.
- Source applicability and physical exercises/printed page evidence still need authenticated independent textbook/curriculum review; the PECTAA source listing itself does not prove ASSPS adopted that edition for its Grade IX session.

**Academically approved/published verified: 0/0.** SaaS Core alone controls restricted signed role/RLS integration, production deployment/rollback certification. Paper Studio may consume only separately approved revision-bound questions after certification.

## Reproduce

```sh
node ops/qbank/audit-physics9-conceptual-mcq-reference.cjs --write
node ops/qbank/build-grade910-review-triage.cjs --write --strict
node --test ops/tests/grade910-physics9-conceptual-mcq-reference.test.cjs
```
