# Urdu-medium Science & Mathematics terminology policy — 2026-10-03

## Locked rule
Urdu-medium paper language is **textbook-faithful, not dictionary-faithful**. Technical English terms must not be converted word-by-word into newly invented “pure Urdu”. If the official Urdu-medium textbook retains a Latin-script English term, uses an Urdu transliteration, an established Urdu equivalent, or a mixed form, the paper must preserve that exact textbook convention.

This directly addresses student confusion: a technically elegant Urdu synonym is wrong for assessment if students never saw that term in their prescribed book.

## Enforcement added
- `urduMediumTechnicalLanguagePolicy.json` defines the source hierarchy and forbids invented/dictionary translations.
- `urduMediumTerminologyGuard.mjs` requires catalog record, PDF SHA-256, physical page, anchor, exact textbook form, rendering mode and visual-review status.
- A question containing technical vocabulary cannot pass the terminology guard with an empty term list.
- The Urdu stem must literally contain the verified textbook form.
- “Reversible reaction / irreversible reaction” are retained only as methodology examples here; they are **not marked verified** until the Chemistry Urdu source is inspected.

## Source-analysis workflow
Before Urdu question authoring for a subject/grade:
1. inspect its official Urdu-medium textbook;
2. build a subject/cohort term bank from exact textbook usage;
3. classify each term as Latin retained, textbook transliteration, textbook Urdu equivalent or textbook mixed form;
4. attach page/anchor/hash evidence;
5. author/review questions using only verified forms;
6. block unresolved terminology instead of translating by intuition.

Biology IX Urdu (`pectaa-catalog-010`) is already part of the evidence base. Official Grade IX Urdu Math, Chemistry and Physics catalog assets are being brought into the source-analysis queue so this becomes a cross-subject rule, not a Biology-only convention.

No terminology record or academic question is approved merely by this policy.
