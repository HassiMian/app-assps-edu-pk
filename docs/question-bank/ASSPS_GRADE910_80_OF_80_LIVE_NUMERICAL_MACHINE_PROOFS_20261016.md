# ASSPS Grade IX–X — 80/80 Live Numerical Machine-Evidence Reconciliation

**Academic Master — 16 October 2026. Technical arithmetic QA only; NOT independently faculty-approved or published.**

## Executed work

Isolated academic branch is descended from audit/grade910-live-source-claim-ledger-20261016@67e2cbedd86b5b881da8ae8365f10efe1fe3cd2a. Existing academic data, research and branches are preserved.

New reusable script: ops/qbank/recompute-grade910-21-original-numericals-20261016.py

- Independently recalculates 21 original stem-based numerical questions from explicit manually transcribed inputs and Decimal/Fraction methods, and checks the original final answer from source text (not from expected answer guesses).
- Checks all eight immutable original candidate source files against exact Git blob SHA evidence; fails closed on any changed file, duplicate or missing ID, incorrect answer, changed faculty/revision crosswalk or untrusted old QA.
- Optional --live-readonly uses the already reviewed READ ONLY full 2,411-question revision auditor. **All 21 new calculations match the actual current live stem, answer AND pinned full revision SHA256**, including marks, English/Urdu variants, chapter/topic, options and difficulty. Zero mismatch.
- The same fresh read-only database snapshot reauthenticates the **59 previously independently machine-recomputed original questions** to the current live stem, answer, and pinned full content revision SHA256; two deeper-computed original-only research records remain non-live and protected.
- **Combined 80/80 School 1 Grade IX/X live numericals have applicable independent machine calculation evidence matching their current full content revision.** This is NOT 80 faculty approvals or verified textbook exercise mappings.

## Recomputed missing 21: by grade and subject

| Grade | Subject | New independently recalculated |
|---|---|---:|
| IX | Chemistry | 7 |
| IX | Mathematics (English/Urdu) | 5 |
| IX | Physics | 2 |
| X | Mathematics | 1 |
| X | Physics | 4 |
| X | Physics-Tech | 2 |
| **Total** | | **21** |

The 21 methods span atom composition, isotope weighted mean, molecular/empirical formula arithmetic, mole/molecule quantity, stoichiometry, geometric similarity, simultaneous equations, probability, trigonometry, uniformly accelerated motion, moment, echo, refractive index, transformers and half-lives. Question text is not duplicated into this report.

## Actual verification and privacy

- Root-private receipt: /var/lib/assps-grade910-sourceclaims/numerical-deep-recomputation-21.json (0600), with IDs/hashes/boolean evidence only and no school question text, answer, student score or staff data.
- Source-only tests: ops/tests/test_grade910_numerical_deep_recompute_20261016.py, eleven test methods, exercising all 21 correct calculations and all 21 deliberately incorrect answer mutations. Additional failures checked: source blob tamper, bad original QA, duplicate/missing ID, wrong revision hash, false publication category, and unsafe receipt permissions.
- CI source-only suite added to .github/workflows/grade910-live-source-claim-contract-20261016.yml. CI does not require real school DB credentials.
- No INSERT, UPDATE, DELETE, school dataset seeding, student result edit, paper import, teacher signature fabrication, or SaaS Core deployment. Existing 1,763 genuine student result rows including 213 legitimate numeric zeros were previously independently certified preserved; this change never touched them.

## Separate academic release blockers

The bank still has 2,411 live **provisional** IX/X candidate questions, 2,581 frozen original research candidates, 170 original-only held candidates and 56 unsigned faculty review cohorts. These are different categories and must not be added together as approved questions. **This mission creates zero qualified academic reviewer approvals, zero textbook-edition institutional adoption attestations and zero academically approved/selectable questions.**

Before release: actual ASSPS-adopted 2026–27 textbook edition and medium/session linkage; exact PDF/page/exercise content evidence and rights; genuine qualified independent subject/Urdu teacher review per immutable revision; approved-only snapshot/provider contract; and SaaS Core tenant/role/security certification. Principal's existing general institutional permission does not replace qualified subject verification. Production cutover is owned solely by SaaS Core, and Paper Studio owns its selection and print integration.

A changed question must be re-reviewed; do not interpret arithmetic QA as textbook verification or independently signed academic publication.
