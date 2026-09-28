# ASSPS Universal Paper System — Resume Checkpoint
Date: 27 Sep 2026

## Current branch
`feature/universal-paper-system-20260927`

## Objective
Stop paper-by-paper formatting repairs. All official papers use one rules-driven Paper Workspace:
Source Paper -> Working Draft -> Rule Engine -> Shared Renderer -> Validation -> Save -> Print.

## Locked vs editable
Locked globally: school name and logo.
Editable per paper: title, exam type, session, class, subject, paper code, time, date, language, total marks, campus/address.
Editable per question: number, marks, instruction/heading, content, semantic type, section/item answer lines.
Question actions: add, delete, duplicate, move/resequence.

## Source policy
Teacher/source records are not silently rewritten for layout.
User-approved content corrections may update authoritative seed content.
Saved edits are stamped as protected working copies and later seed refreshes must not overwrite them.

## Marks policy
Formula totals override legacy multiplier fields when explicit (3x5=15 -> 15).
Then trailing explicit total, then manual operational marks, then legacy fallback.
Header total is independently editable.
Header/question mismatch is surfaced by audit; no silent mark invention.
## Language/layout policy
English: Times New Roman, LTR, question heading left, marks right.
Urdu-script subjects: Jameel Noori stack, RTL, question heading right, marks left.
Urdu MCQ labels: الف، ب، ج، د… with closing bracket between label and option text: الف) جواب.
Screen and print use the same semantic renderer/rules.

## Visible Paper Generator navigation
Paper Workspace
Saved Papers
Question Bank
Pre Classes Papers
Daily Diary
Lesson Plans

Legacy generators remain hidden compatibility routes only until regression coverage allows physical removal.

## Class 7 Social Studies approved correction
MCQ1: قشر الارض کی کتنی بڑی پلیٹیں ہیں؟ — الف) 6، ب) 7، ج) 8
MCQ8: فصلوں کی کتنی اقسام ہیں؟
MCQ9: بین الاقوامی تجارت کن راستوں سے ہوتی ہے؟ — ہوائی، بحری، زمینی
Marks: 10 + 15 + 15 + 10 = 50.

## Verification completed
paperSystemRules.test.js: 9/9 PASS.
Production build: PASS.
Representative controls: Class 4 Science PASS; Class 4 Islamiyat PASS.
Working-copy persistence: PASS (userEdited=true, workingCopy=true, edits survive reopen).
Class 7 Social Studies: 4 sections, 10 MCQs, marks ledger 50/50, Urdu bracket geometry PASS, no unexpected console errors in focused QA.


## Phase 2 hardening — resumed
- Added a live Paper Quality Gate in the Paper Workspace. It reports structural errors/warnings before print.
- Print now blocks only on structural errors (for example unparsable MCQ sections or duplicate internal section IDs); warnings remain visible without inventing academic content.
- Added **Apply ASSPS Rules**: reapplies safe presentation rules (font, page border, MCQ table, one-column short questions, line heights, marker-safe numbering) without rewriting teacher question content or marks.
- Section-marker-aware resequencing now keeps `Section A`, `Subjective Part`, etc. as banners and numbers only real questions.
- Add/duplicate/delete/move question actions now preserve canonical question numbering across marker sections.
- Focused local acceptance: Universal Workspace PASS; Class 7 Social Studies 10/10 MCQs and Urdu bracket geometry PASS; representative Class 4 Science/Islamiyat controls PASS; working-copy persistence PASS.
- Rule tests: 12/12 PASS; production build PASS.

## Phase 3 cleanup — completed locally
- Replaced the old 700+ line PaperGenerator shell with a small router focused only on the six supported modules.
- Removed dead Paper Generator source modules that had no remaining callers: AI Generator, Manual Draft, Handwritten Scanner, Notes Maker, legacy Paper Preview engines, old Build Paper Wizard, and Unified Paper Generator.
- `/paper-generator/unified` now redirects safely to the new Paper Workspace instead of loading a second generator.
- Kept Question Bank, Pre Classes Papers, Daily Diary and Lesson Plans intact.
- Kept only `word_editor` and `board_pattern` as hidden compatibility routes for saved-document safety.
- Build and 12/12 rule tests PASS after physical cleanup; focused Universal Workspace and representative controls QA PASS.


## Phase 4 — structured in-place editing V3 (28 Sep 2026)
- Resumed from deployed V2 commit `d148a96`; no restart/rewrite of the paper system.
- Fixed a real focus-loss bug: the selected paper template component was being recreated on every state change, which could unmount the contentEditable node immediately after a click. Template resolution now uses one stable `PremiumPaperTemplate` component with a variant prop, so click-to-type editing keeps focus and selection.
- MCQ rows are now first-class in-place editable structures in Table, Classic and Grid layouts:
  - MCQ item number
  - MCQ question/prompt
  - each option text
- Editing an MCQ writes only to the working copy. The renderer serializes the edited MCQ block deterministically and preserves row count/order.
- Urdu MCQ labels remain rule-driven (الف) ب) ج) د)) with the bracket between label and option text. The user edits option text only; layout punctuation is not corrupted by typing.
- Advanced raw content remains available as a fallback for every semantic section.
- Local acceptance: 10/10 Class 7 Social Studies MCQs preserved after edit, Urdu label geometry preserved, edited prompt/option reflected in raw working content, zero console errors.
- Existing V2 in-place QA still PASS; paperSystemRules.test.js 12/12 PASS; production build PASS.


## Phase 5 — Canonical Authority Reconciliation / V4 Foundation (28 Sep 2026)
- Branch: `feature/paper-system-v4-canonical-convergence-20260928`; production remains unchanged on deployed V3 `999f9ce`.
- Current operational V13 authority: 43 papers, source commit `16764ca8551ab0b76165c5b437ba09915581944b`, SHA-256 `870dea760ff40585f37cc9c3d919ed3b2041d2bffc2366d66fbe73c35a1a7b7f`.
- Added deterministic `scripts/reconcile_canonical_v13.mjs`: current V13 -> normalization manifest -> canonical PaperDocument corpus -> reviewed reference-corpus lock.
- Added `referenceCorpusLock.json` so historical sources, operational authority and derived artifacts have explicit roles instead of stale hard-coded freeze hashes.
- Early Years source locking is LF-normalized to avoid false Windows CRLF/LF integrity failures while keeping academic content immutable.
- Reconciled approved Class 6 Mathematics scheme: 5 MCQs, 10 compulsory shorts, and attempt any 2 of 3 long questions at 10 marks each.
- Fixed a real Class 1 English authority bug: current principal-approved source is 50 marks (five 10-mark sections), replacing the obsolete 36-mark provenance override.
- Regenerated manifest SHA-256: `51e6a42582d08e300778071d3f04900f7faa57b2b2de56bddf24df4f576d86d2`.
- Regenerated canonical corpus SHA-256: `ab178edad6933cc7968c9f69c2be7fdb8e9f54305a82bc7e81c068d3cd777a5b`.
- Reconciled obsolete emergency-routing and Early Years pre-duplex test contracts against current production architecture and Git lineage.
- Full PaperEditor regression: 274/274 PASS; focused Canonical browser/structured acceptance: 20/20 PASS.
- Removed duplicate Tiptap Underline registration; StarterKit remains the single Underline provider and the warning is gone.
- Deterministic reconciliation check PASS and production frontend build PASS.
- No production route switch in this phase. Official First Term papers remain on stable Paper Workspace (`build`) until Canonical shadow parity passes.
- Next phase: all-43 shadow parity between live Paper Workspace and Canonical V2; do not duplicate more structured editor logic inside `OfficialSectionRenderer`.

## Phase 6 — V5 Shadow Parity / RTL Canonicalization (28 Sep 2026)
- Branch: `feature/paper-system-v5-shadow-parity-20260928`; production route remains unchanged.
- Canonical migration now delegates section classification to the same `inferOfficialSectionKind` used by the live Paper Workspace, removing classifier drift.
- Hardened MCQ migration so numeric/checkbox option rows are not mistaken for question boundaries and source option labels up to the supported Urdu/numeric set are preserved.
- Fixed the Class 6 English source case `W. F. Holmes`: the option parser no longer splits the author name at `F.`; all live-vs-canonical MCQ sections now report 0 mismatches.
- Added shared `CanonicalOptionLabel` renderer so canonical Table, Classic, Grid and static MCQ presentations use the same label/separator/text model.
- Urdu option punctuation is rendered semantically as label + closing bracket + option text, preventing bidi bracket movement and eliminating renderer-specific `(label)` formatting.
- Reconciled the 43-paper canonical corpus and reference lock deterministically; repeated reconciliation is byte-stable.
- Updated editor invariant fixtures to select genuinely text-editable canonical nodes instead of assuming the first node is a rich-text stem.
- Focused canonical/migration/Urdu/normalization regression: 52/52 PASS.
- Paper-system rule regression: 12/12 PASS.
- Live-vs-canonical MCQ shadow probe: 0 mismatched sections.
- Production frontend build: PASS.
- No source paper, Question Bank, Daily Diary, Lesson Plans or Early Years authority was deleted or rewritten.
- Next: expand shadow parity beyond MCQs to all semantic section kinds and only consider a route switch after the all-43 parity gate is clean.

## Phase 7 — Heading-Only Academic Node Recovery (28 Sep 2026)
- The all-semantic shadow matrix exposed 33 official sections whose complete academic prompt lived in the source heading while content was empty.
- Previous canonical migration treated empty content as metadata-only and produced zero editable nodes for those sections.
- Migration now detects heading-only academic sections and parses the authoritative heading into canonical question nodes while preserving empty content as a separate metadata-only coverage segment.
- Heading-based node provenance points to the exact heading source segment; raw source remains unchanged and auditable.
- Presentation-only question numbering and trailing marks are removed from the editable stem without changing the stored raw source snapshot.
- Promoted heading-only questions no longer duplicate themselves as both a section heading and a question node.
- Verified representative types: English essay -> `essay`; English leave prompt -> `application`; Urdu essay -> `essay`; maths table prompt -> editable question node.
- Empty academic canonical sections reduced from 33 to 0 across the 43-paper corpus.
- Focused migration/editor/rules regression: 36/36 PASS.
- Production frontend build: PASS.
- Production routing remains unchanged; Canonical V2 is still under shadow-parity validation.

## Phase 8 — Permanent All-43 Semantic Shadow-Parity Gate (28 Sep 2026)
- Added reusable `auditCanonicalSemanticParity` instead of relying on temporary diagnostic commands.
- Added CLI audit `scripts/audit_canonical_semantic_parity.mjs` for repeatable release/convergence checks.
- Added `canonicalSemanticParity.test.js` so parity failures block regression runs.
- Gate validates paper/section mapping, heading/content source coverage, academic-node presence, strict semantic node families, marker isolation, and exact MCQ prompt/option parity.
- Current gate result: 43 papers, 242 source sections, 242 canonical sections, 35 MCQ sections, 33 heading-only academic sections.
- Current hard issues: 0. Warnings: 0. Unknown-preserved nodes: 0.
- Heading-only regression fixtures explicitly cover Class 2 English essay and Class 2 Urdu essay provenance/stems.
- MCQ regression verifies live-parser versus canonical row/prompt/options equivalence.
- Canonical routing is still not switched to production; this gate is a prerequisite, not a deployment authorization.

## Phase 9 — Granular Header / Marks / Number Editing (28 Sep 2026)
- Extended the canonical working-document overlay instead of creating another editor or mutating canonical source.
- School name/logo remain protected identity; paper metadata fields are independently editable in-place.
- Editable header metadata now includes class, subject, paper code, exam type, session, time allowed, date, school address, student/roll placeholders and user-defined custom fields.
- Header fields can be hidden/restored; custom fields can be added, renamed, edited and removed without changing the canonical baseline.
- Added scoped question-number overrides so one question number can be edited without renumbering or reformatting the whole page.
- Added working marks engine for question, section and paper totals. Source authority remains immutable; working-copy marks can be manual or automatically recalculated.
- Question-mark changes recalculate AUTO section totals; section totals recalculate AUTO paper totals. Explicit manual paper totals remain manual until changed.
- Marks/metadata/number overlays are included in compact draft persistence, validation and atomic reopen/apply.
- Revert-to-baseline now recreates the working overlay cleanly, including metadata, marks, structured changes and presentation state.
- Added CanonicalInlineField for isolated in-place metadata/number/marks editing without whole-page formatting side effects.
- Core metadata/marks/draft/semantic tests: 15/15 PASS.
- Browser acceptance: header metadata + total marks, question number + question marks, section marks + protected school identity: 3/3 PASS.
- Final focused migration/invariants/rules/parity/working-model regression: 51/51 PASS.
- Production frontend build: PASS.
- Production route remains unchanged; this phase is committed only after regression and build gates pass.

## Phase 10 — Granular Section Title / Instruction Editing (28 Sep 2026)
- Converted section title and section instructions from read-only renderer text into independent working-copy overlays.
- Existing section titles are edited in place; sections without a title expose an edit-only add-title field that does not print while empty.
- Existing instructions are edited in place; sections without instructions expose an edit-only add-instruction field that does not print while empty.
- Section title edits update the working title/heading consistently; RTL sections keep the working Urdu title aligned with the same section overlay.
- Added dedicated `sectionPatch` draft payload instead of mixing section text with marks, metadata or presentation state.
- Section patches are strictly validated against canonical section IDs and the allowed fields: title, titleUrdu, heading, instructions.
- Draft reopen/apply restores section text atomically; canonical source/provenance remains immutable.
- Section text dirty state participates in document dirty/revert behavior without affecting neighboring questions.
- Focused section/draft/browser regression: 12/12 PASS.
- Final migration/invariants/rules/parity/working-model regression: 52/52 PASS.
- Production frontend build: PASS.
- Production route remains unchanged.

## Phase 11 — General Instructions + Granular Text Spacing (28 Sep 2026)
- Added paper-level General Instructions as an independently editable multiline metadata field; empty helper UI is edit-only and does not print.
- General Instructions persist through compact working drafts and reopen without mutating canonical source.
- Extended CanonicalInlineField with multiline-safe editing and newline-preserving commit behavior.
- Added safe paragraph-level line-height values: 1, 1.15, 1.25, 1.5, 1.75, 2.
- Added safe paragraph-after spacing values: 0pt, 2pt, 4pt, 6pt, 8pt, 10pt, 12pt.
- Spacing attributes are schema-aware Tiptap paragraph/heading attributes, pass through strict sanitizer, and are classified as FORMATTING_ONLY when academic text is unchanged.
- Invalid spacing values are removed by sanitization rather than persisted.
- Ribbon controls now apply line height and paragraph spacing only to the active rich-text block/question instead of the whole paper.
- Canonical static renderer consumes the same spacing attributes, preserving editor -> static/print geometry parity.
- Browser acceptance confirms line-height 1.5 and paragraph spacing 6pt survive Done Editing/static rendering without changing question text.
- General-instructions + spacing unit regression: 11/11 PASS.
- Browser metadata/marks/section/spacing acceptance: 5/5 PASS.
- Final focused migration/invariants/rules/parity/working-model regression: 54/54 PASS.
- Production frontend build: PASS.
- Production route remains unchanged.

## Phase 12 — Scoped MCQ Option Formatting + Edit-Mode RTL Parity (28 Sep 2026)
- Preserved the B4 rule that structured MCQ options remain semantic plain-text fields; no nested Tiptap editor was introduced per option.
- Added presentation-level `structuredFieldStyles` keyed by the existing structured control key, keeping academic option text separate from formatting.
- MCQ option styles support whitelisted font family, font size, bold/italic, underline/strike, text color, highlight, alignment, direction, line height and paragraph spacing.
- Arbitrary CSS/style keys and unsupported values are dropped by the working store and rejected by compact-draft validation.
- Structured field styles persist through draft export/reopen while canonical source text and provenance remain immutable.
- Ribbon formatting now routes to the active structured MCQ option instead of accidentally formatting the last Tiptap field.
- Superscript/subscript and stale Tiptap Undo/Redo are disabled while a structured option is the active formatting target.
- Structural toolbar controls derive section/node targeting from the active structured key when applicable.
- Edit-mode MCQ option labels now use the same CanonicalOptionLabel renderer as static mode, eliminating legacy `(label)` divergence.
- Urdu edit-mode option geometry is verified as semantic label followed by closing bracket: `الف)`.
- MCQ table/grid/classic static rendering consumes the same structured option-style map, preserving Done Editing / print presentation parity.
- MCQ style/draft validation unit suite: 10/10 PASS.
- Browser acceptance including scoped option styling and Urdu bracket geometry: 7/7 PASS.
- Final focused migration/invariants/rules/parity/working-model regression: 55/55 PASS.
- Production frontend build: PASS.
- Production route remains unchanged.
