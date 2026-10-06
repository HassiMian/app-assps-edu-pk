# Protected Template Surgical Patch Log — 2026-10-06

## Cards Generator result-card data loading

**Protected source:** `al-siddique-frontend/src/Modules/cards/CardsGeneratorModule.jsx`

**Objective defect:** Result-card exam/result API failures were silently converted into empty arrays. Operators could not distinguish a legitimate empty dataset from a backend/provider failure, violating the project data-truth rule that missing/failed data must not be presented as empty data.

**Surgical change:** Added an on-screen load error state for the Result Cards control surface. Exam-list and exam-result request failures now preserve an explicit error message instead of being silently swallowed.

**Protected output impact:** None. No printable card template markup, template identity, card dimensions, page geometry, colors, typography, field order, print CSS, front/back positioning, or renderer logic was changed. The change is limited to data-loading state and operator feedback outside the printable template output.

**Baseline action:** The whole source file is hash-protected, so its SHA-256 baseline was deliberately refreshed after reviewing the narrow diff. This is an intentional data-fidelity exception under `TEMPLATE_PRESERVATION_AND_SURGICAL_AUDIT_POLICY_20261005.md`, not a redesign.

**Required validation:** `npm run production:safety`, `npm run verify:local`, `npm run verify:templates`, and `git diff --check` must all pass before commit.
