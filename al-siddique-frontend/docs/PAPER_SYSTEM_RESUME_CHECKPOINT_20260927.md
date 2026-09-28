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
