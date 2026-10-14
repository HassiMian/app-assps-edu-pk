# Grade IX–X Academic Master — Complete original numerical draft arithmetic QA (2026-10-08)

## Scope and actual new academic execution

Previous source integrity/review checkpoint: `4ef99a7311706a83bb0a2d325d7c5100754dd5e6` on isolated `feat/grade910-academic-master-evidence-20261008`.

This continuation independently recomputes the **full 91 numerical questions** in the original 2,581-question, 73-file authoring corpus, rather than claiming all draft answers source verified. No existing question text/options, authoring original file, backend schema, production tenant, Paper Studio, approved record or deployed service was changed.

### New batches

- **43** new calculation checks, mapped exactly to 5 original files: Grade IX Physics English (7), Grade IX Physics Urdu (7), Grade IX Mathematics English (11), Grade IX Mathematics Urdu (11), Grade X Physics English (7). Independent JS calculators cover scientific notation, motion, Newtonian force, torque, pressure, density, heat, electrical resistance, echo/waves, algebra, sets, trigonometry, coordinate slope, means and probability. Each result is compared with the saved answer using numerically bounded markers.
- **37** more checks, mapped exactly to 7 original files: Physics-Tech IX dual (12), Physics-Tech X English (6), Mathematics X starter (10), Chemistry IX chapter 4 (5), Chemistry IX chapter 2 (2), Biology IX Urdu (1), Chemistry IX Urdu (1). Includes independently calculated empirical formula, stoichiometric water yield, isotope-weighted mass, molecular count, heat/echo, matrix determinant and complex addition.
- **11** Mathematics X original reasoning numericals were already independently mechanically checked and revision-SHA-pinned in the previous checkpoint. These were *reexecuted* and reconciled, not counted as newly authored questions.

**Consolidated strict result: 91 unique numerical draft IDs / 91 independently recomputed numeric results matching the stored answer tokens / 0 observed numeric discrepancies.** Grade IX **57**, Grade X **34**, across **13** original authoring files. All 91 IDs are compared to the complete authoring inventory, not simply the subset selected by a script, to prevent silent omission. Existing Grade X 11 identities and new 80 identities are disjoint.

### Revision and quality gates

- Per-question original content SHA-256 baselines are frozen in:
  - `ops/qbank/grade910-core-numerical-golden-sha-20261008.json` (43)
  - `ops/qbank/grade910-other-numerical-golden-sha-20261008.json` (37)
  - previously committed Mathematics X SHA evidence (11)
- Changed question stem, changed saved answer, unrecognized additional numerical question or duplicate ID invalidates existing mechanical evidence. Only `--create-initial-baseline` on a nonexistent file creates an initial draft-hash snapshot; the baseline cannot be silently overwritten on reruns. A changed revision must be reviewed anew.
- Deliberately erroneous negative fixtures include a changed Physics Urdu numerical result, a changed chemical Avogadro calculation, a changed Grade IX Maths Urdu hypotenuse, a changed question stem, and false positive markers like `13` inside `113` or `=2` inside `=20`. All are rejected, rather than rewritten.
- Independent *arithmetic recomputation* is one automated verification dimension, not a human independent reviewer or endorsement of full explanation/units/academic wording/Urdu-English equivalence. Mathematical result markers are a narrow spot check, not a formal CAS proof.
- **Source page verified 0 / independently human-reviewed 0 / academically approved 0 / published 0.** There is no ASSPS textbook adoption certificate, real human source-image exercise review, or independent signed answer review in this candidate.

### Reproducible offline reports and commands

- `node ops/qbank/audit-core-grade910-numerical-answers.cjs --write` — 43 checks.
- `node ops/qbank/audit-additional-grade910-numericals.cjs --write` — 37 checks.
- `node ops/qbank/audit-math10-numerical-answers.cjs --write` — 11 earlier checks.
- `node ops/qbank/consolidate-grade910-numerical-qa.cjs --write` — strict 91/91 union, original authoring-set completeness, revision hashes and metadata-only output.
- Relevant tests: `ops/tests/grade910-core-numerical-answers.test.cjs`, `ops/tests/grade910-all-numerical-coverage.test.cjs`, `ops/tests/grade910-consolidated-numerical-qa.test.cjs` together with existing Grade X/academic review/source checks.

Academic evidence output `docs/question-bank/ASSPS_GRADE910_ALL_NUMERICAL_QA_CERTIFICATE_CANDIDATE_20261008.json` is **metadata only** (stable question ID/file/content SHA, calculation/test booleans); it contains no copied problem paragraphs, no commercial guide stems, and no real reviewer signatures.

### Remaining work and release authority

1. Review and certify the ASSPS-adopted Grade IX/X textbook edition and actual examination board/year for each subject/medium; the school 2026–27 timetable is not a per-book adoption document.
2. Inspect actual textbook physical/printed chapter pages and exercise references, fill approved source evidence registries with independently verified human records.
3. Independently review factual scientific answers and complete Urdu/English equivalence, especially editorial MCQ option-key concentration (previously 785 of 875 authored MCQs keyed A), then have another qualified academic approver sign each exact immutable revision.
4. Paper Studio receives approved snapshots only after academic + SaaS Core authenticated tenant/RLS and safe release/rollback certification, coordinated in GitHub issues #1 and #4.

**Release status: HOLD.** Recalculation does not make any candidate eligible to seed production or claim independently academic approval.
