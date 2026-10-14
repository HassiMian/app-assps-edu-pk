# Grade IX Urdu-medium Science/Mathematics: directly reviewed language convention (2026-10-03)

Parent Git checkpoint: `21d8fd54820eb9de9b13b5ca6de591e3e7a7775f`. Isolated uncommitted Windows worktree: `C:\Users\Imac\Desktop\ASSPS_URDU_STYLE_V2_20261003`, branch `feat/grade9-urdu-language-convention-v2-20261003`.

The goal is **to learn textbook writing conventions**, not to replace familiar scientific terms with artificial, overly pure Urdu dictionary synonyms. Use natural Urdu question syntax + recognizable Genetics, Gene, Qualitative Observation, Quantitative Observation, Hypothesis, Deduction, Plasmodium, etc. This is a style convention, not a list of claimed official textbook quotes.

Official source catalog: https://pectaa.edu.pk/curriculum-compliance/ . Directly rendered samples:

| Official Grade IX Urdu source | Inspected PDF pages | Observed convention | Integrity limit |
|---|---|---|---|
| Biology IX, PECTAA catalog-010 | 5, 15, 16 | English/Urdu paired biology headings, familiar qualitative/quantitative terms and Hypothesis/Deduction labels alongside Urdu prose | Full prior 84,697,797-byte PDF SHA-256 `7f325fd04a1291949a39d4bb18e60d9d1daef4d18535f7b2189971c514a344dd` |
| Mathematics IX, catalog-006 | 5, 15 | Bilingual Rational/Irrational Numbers and Rationalization of Denominator headings; symbols, algebraic expressions, radicals unchanged | Official PDF HTTP Range 206; source length 97,707,720 bytes; full SHA not verified |
| Chemistry IX, catalog-008 | 5, 15, 36 | Bilingual Chemistry branches, Saturated/Unsaturated/Solubility, Chemical Bond, Octet/Duplet Rule, preserved formulae | Official PDF HTTP Range 206; source length 165,433,794 bytes; full SHA not verified |
| Physics IX, catalog-012 | 15, 36 | English labels Metre Rule, Vernier Callipers, Least Count, Parallax Error, Rest and Motion, Types of Motion, symbols and SI units | Official PDF HTTP Range 206; source length 86,790,350 bytes; full SHA not verified |

**Result:** representative four-subject Urdu writing-style review achieved. This does *not* mean all four textbooks or every edition's academic content have been page-by-page reviewed. No textbook paragraphs were republished as questions.

## Revised validation separation

- `urduMediumLanguageStyle.mjs`: stylistic check, familiar scientific identity preservation, bilingual text direction isolation, editorial flags. Does not require every standard word's exact textbook-page proof.
- `urduMediumTerminologyGuard.mjs`: backward-compatible entry point for style. Original `validateTextbookTermEvidence` remains strict when making a specific source-verified terminology claim.
- `questionContract.mjs` / `releaseAudit.mjs`: unchanged academic source, answers, edition and independent-review protections. No approved-question increment or production write.
- Scoped `.gitattributes`: `*.json text eol=lf`, needed because the initial isolated Windows checkout converted pinned evidence JSONs to CRLF and temporarily broke unrelated SHA tests. Normalizing source JSON to their canonical LF bytes gave remote staging **128/128 PASS**. Do not stage original existing evidence JSONs as academic changes.

## Write blocker / continuation

Desktop Commander hit 100% monthly tool usage immediately after the final 128/128 run; the attempted `.gitattributes` write and final policy-status update were **not** applied to the Windows worktree. The Windows worktree holds the implemented v2 engine/tests/dossier and source JSONs temporarily normalized to LF, but no commit/push has been done. Apply the additional bundle files and final status to that worktree after authorized tool access resumes, verify diff only contains intended v2 changes, rerun all tests, then commit/push. No live School SaaS change or teacher academic signoff was asserted.

### Physics second-sample confirmation
Printed page 32 directly showed bilingual **Rest and Motion** / **Types of Motion** headings, Urdu explanatory prose, an English `Observer` label, vector diagrams and unchanged physical notation. This further confirms the mixed technical-language convention; it does not certify the entire Physics book.
