# Paper Studio — 11 October 2026 isolated Early Years and inline editor checkpoint

## Source and ownership

- New isolated Paper-only branch: `test/paper-oct11-owner-safe-lint-20261011`; forked from verified latest published **Core-livebase-derived Paper integration** `test/paper-core-livebase-integration-20261010` SHA `8f569377188ab0067233adbe63a540899f0d5269`, ultimately a descendant of Core frontend First Term Marks+nine Results release candidate `2ec5ae597e9f50772cf443b0392b442b7fa037db`, which itself descends from deployed frontend `24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92`.
- The original `assps-paper-core-livebase-reconcile-20261010` worktree had THREE UNCOMMITTED, VERY RECENT (2026-10-11) PaperEditorMain, StructuredFocusContext and PaperRichTextEditor updates; **left them untouched** to avoid overwriting another owner's in-flight work. New worktree contains no copied/stashed edits from there, and no changes to Core production or source.
- Coordination handoff `docs/coordination/PAPER_STUDIO_MASTER_HANDOFF.md` from `coord/assps-four-stream-consolidation-20261008` reviewed; Core owns production role/RLS and release promotion, Academic owns Grade IX/X textbook approvals.

## Changes

1. `EarlyYearsWorksheetEditor.jsx`: change template save callback dependency from a narrowed paper ID property to **current paper object** identity. This satisfies React Compiler dependency requirements and keeps template persistence bound to the selected Starter/Mover/Flyer source rather than a potentially stale callback.
2. Early Years marks now recompute from the latest external presentation overlay on every render instead of a memo with an intentionally mutable external dependency. This avoids a misleading React hook dependency and ensures conflict totals follow current overlay updates; original immutable source/question content is unchanged.
3. `PaperInlineEditor.jsx`: set current selection handle in a React layout effect after commit rather than mutating a ref during render, preserving selection toolbar lifecycle and consistent formatting handles.
4. Added real Chromium switching regression in `earlyYearsBrowserAcceptance.test.js`: persist separate Starter English (`coral-creative`) and Mover English (`workspace-academic`) templates, navigate Starter→Mover→Starter→Mover, verify sheet styles and distinct local template mappings. No production teacher template storage altered.

## Actual evidence on isolated source

- Before edits, fresh Paper-only ESLint scan across 266 files: **93 errors, 14 warnings**, exit1 (`/tmp/assps-paper-oct11-real-lint.json`). After edits: **91 errors, 13 warnings**, exit1 (`/tmp/assps-paper-oct11-afterfix-lint.json`). **Full lint is still FAIL**, no rules disabled or errors waived.
- Early Years professional source Chromium suite (including new cross-paper template persistence): **13/13 PASS exit0** (`/tmp/assps-paper-oct11-ey-aftermarks.tap`); editor selection formatting/scope Chromium **8/8 PASS exit0** (`/tmp/assps-paper-oct11-inline-selection.tap`); Early Years creation + migration marks contracts **6/6 PASS exit0** (`/tmp/assps-paper-oct11-early-marks.tap`); Daily Diary Workspace Chromium **1/1 PASS exit0** (`/tmp/assps-paper-oct11-diary-browser.tap`).
- First Term Marks synthetic browser: saved Exam ID9, 75 paper/11-class mapping, partial class alias roster, zero/blank semantics and exact edited-only mark save PASS exit0 (`/tmp/assps-paper-oct11-marks-browser.log`); Marks empty-state/escaping **16-case PASS** (`/tmp/assps-paper-oct11-marks-zero.log`), fail-closed first-term recovery PASS (`/tmp/assps-paper-oct11-firstterm-recovery.log`). Tests use synthetic fixtures; NOT signed tenant database acceptance.
- A4/A5 paper-size + Wizard typography source tests **6/6 PASS** (`/tmp/assps-paper-oct11-a4a5-model.tap`). Optimized Vite build **PASS exit0** (`/tmp/assps-paper-oct11-final-build.log`) and **six historical result templates unchanged PASS** (`/tmp/assps-paper-oct11-final-templates.log`). `git diff --check` PASS.

## Still NOT certified, release hold

- Paper ESLint: **91 errors/13 warnings** remain. Other actor's 3 in-flight EditorMain/StructuredFocus/RichText work may fix some, but was not presumed completed and must be reconciled by commit/remote verification first.
- Live school backend database runtime still observed in issue #4 as `apexos_user` LOGIN+`BYPASSRLS`. Real least-privilege signed tenant/JWT PostgreSQL HTTP positive/negative and authorized teacher paper save/reopen/print remain Core-owned P0. No clone-only guard scripts should be run on production.
- Current live frontend/backend metadata were `24cbcae3` / `16ab8f34` at the start of this cycle; the Paper candidate is NOT live. Confirm live commits anew before Core release. RICOH basic A4 sheet exit confirmed; long physical Nastaleeq Urdu PDF/DOCX/A5 margins and generic printer model acceptance still require actual school verification.
- Historic 43 completed papers, school marks, student, academic draft, protected templates and Result Card content were NOT modified. Grade IX/X unapproved bank questions remain unpublishable.

`RELEASE_CERTIFIED=FALSE; PAPER_FULL_LINT=FAIL; APPLICATION_DEPLOYMENT=HOLD` until SaaS Core signs all outstanding gates. Preserve other owners' worktrees and forward-port only confirmed needed deltas.
