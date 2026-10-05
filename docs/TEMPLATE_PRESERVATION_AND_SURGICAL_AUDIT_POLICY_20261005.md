# APEX OS — Template Preservation & Surgical Audit Policy
Date: 2026-10-05
Status: LOCKED BASELINE

## Directive
Existing designed templates are protected assets. They must not be redesigned merely to make the wider SaaS visually consistent.

This protection applies to, including but not limited to:
- Result/report card templates
- Fee voucher / challan templates
- Receipt templates
- ID/card templates
- Certificate templates
- Paper templates and official paper renderers
- Any other approved school printable/presentation template

## Default action
**Do not change the template.**

A template may be modified only when a specific, evidenced improvement exists and the change is demonstrably better without damaging data fidelity, print fidelity, visual identity or approved layout.

## Allowed review categories
A protected template may be audited for:
1. Grammar/spelling mistakes
2. Incorrect labels or wording
3. Font-family mismatch or fallback failure
4. Font-size inconsistency
5. Baseline/vertical alignment
6. Grid/table alignment
7. Uneven spacing/padding/margins
8. Print clipping/overflow
9. RTL/LTR defects
10. Wrong punctuation/bracket direction
11. Contrast/readability defects
12. Logo distortion or opacity/background issues
13. Color consistency where a color is objectively broken or inconsistent
14. Data field mapping errors
15. A4/page geometry problems
16. Mobile preview issues that do not alter print output
17. Accessibility of on-screen template controls

## Prohibited changes without explicit dedicated approval
- Replacing an existing approved template with a new visual concept
- Changing template identity because the SaaS shell palette changed
- Recoloring official documents to match light/dark app mode
- Reordering fields for aesthetics alone
- Changing marks, data, labels, calculations or source values for visual reasons
- Changing print geometry without before/after page comparison
- Removing a template because another template looks newer
- Merging visually distinct templates into one generic design

## Better-than-existing rule
A proposed improvement is accepted only if all are true:
- specific current defect is documented;
- proposed change solves that defect;
- exact business data remains identical;
- print/page geometry passes regression;
- font and language rules still pass;
- before/after visual comparison shows a meaningful improvement;
- no protected template variant is lost;
- rollback is trivial.

If improvement is subjective or marginal, keep the existing template unchanged.

## Review workflow
Protected Template
  -> Baseline screenshot/PDF + source hash
  -> Structural audit
  -> Data mapping audit
  -> Typography audit
  -> Alignment/spacing audit
  -> Language/grammar audit
  -> Color/contrast audit
  -> Print geometry audit
  -> Proposed surgical patch (if needed)
  -> Before/after comparison
  -> Data equality assertion
  -> Regression test
  -> Accept or reject

## Data fidelity requirement
Template presentation must mirror canonical business data exactly.

The following must be byte/value-equivalent before and after a cosmetic patch where applicable:
- student names and IDs
- father/guardian names
- class/section
- subjects
- marks/grades/percentages
- attendance values
- fee amounts/discounts/payments/balances
- dates and voucher/challan numbers
- exam metadata
- school name/contact metadata

Formatting differences are allowed only when explicitly intended and semantically equivalent.

## Theme isolation
Protected printable templates are document surfaces, not application surfaces.

`App light/dark mode != document template theme`

The SaaS shell may become light, dark, vibrant or tenant-branded without automatically changing approved printable template colors.

## Baseline inventory found in current repo
- `src/Modules/examination/resultCardTemplates.jsx`
  - 10 result-card template variants currently registered.
- `src/services/canonicalDocumentTemplates.js`
  - canonical document/voucher rendering utilities.
- `src/Modules/Paper-Generator/PaperEditor/templates/paperTemplates.js`
  - multiple paper visual templates including Academic Navy, Modern Cyan, Emerald Fresh, Royal Gold, Coral Studio, Violet Scholar, Minimal Monochrome and Editorial Slate.
- Fee/challan rendering paths in `CreateChallan.jsx` and `ViewChallans.jsx`.
- Card-generation templates in `CardsGeneratorModule.jsx`.

These sources are now treated as protected baseline assets during the wider SaaS redesign.

## Baseline integrity
Current protected-source SHA-256 hashes are stored in:
`docs/template-baseline/TEMPLATE_BASELINE_SHA256_20261005.txt`

The hashes do not prevent intentional patches. They make accidental broad changes immediately detectable during review.

## Architecture recommendation
Long term, templates should be registered through a Template Registry containing:
- immutable template ID
- human label
- document type
- version
- supported languages
- page size/orientation
- renderer
- required data contract
- print stylesheet
- preview renderer
- status: draft/approved/archived
- baseline snapshot/hash

Approved template versions should never be silently mutated. Material changes should create a new version while keeping the prior approved version available for rollback/reference.

## Definition of Done for a template patch
A patch is complete only when:
1. Baseline preserved.
2. Exact defect documented.
3. Change is minimal.
4. Data equality passes.
5. Visual comparison passes.
6. Print/PDF comparison passes.
7. RTL/LTR passes where relevant.
8. Font loading/fallback passes.
9. No clipping at target page size.
10. Existing template ID remains stable unless deliberately versioned.
