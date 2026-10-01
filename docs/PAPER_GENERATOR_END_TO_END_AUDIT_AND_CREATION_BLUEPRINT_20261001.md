# ASSPS Paper Generator — end-to-end source audit and self-service creation blueprint
Date: 2026-10-01 | Baseline: live frontend Hotfix3 / code eb36933 | Work branch: fix/paper-workspace-restoration-and-creation-plan-20261001

## Non-negotiables
- **No modification of current Class 8 Urdu paper data or saved marks.** Undo ONLY the Hotfix3 auto-expanded control panel; keep existing Paper Workspace, normal Edit Paper and floating per-question inspector.
- Existing nine Early Years source papers, V13 official papers, archived recovery seeds, Question Bank, Daily Diary, Lesson Plans, class timetable, logos and output format remain intact.
- PaperDocument is the future source of truth. Never delete historical papers to introduce a replacement editor.
- School name/logo protected defaults. Other paper attributes, questions, marks, answer lines, typography and visual layout editable individually.
- Printer/Word/PDF use the same validated document renderer. Preview must represent print, including Urdu Jameel Noori Nastaleeq and RTL punctuation.
- No live backend/database, First Term Examination r5 or unrelated portal deployment as part of this audit.

## Observed architecture (source-level, not a mockup)
| Entry point | Today | Source | Blocker |
|---|---|---|---|
| Paper Workspace (generic) | syllabus > live class > subject > chapters > question picker > edit/preview/save/print | PaperGenerator.jsx, PTSPaperGenerator.jsx | No conspicuous manual Start Blank path; chapters/question bank can be prerequisites for a brand-new document; 2,284-line single component |
| Saved Papers | browse/search/rename/delete/open; router distinguishes recovery, Early Years, V13 | SavedPapersTab.jsx, resolvePaperRoute.js | An explicit 'Duplicate as New' / source-snapshot workflow missing; careless route can land in compatibility preview |
| Question Bank | subject/class selection, manual Add Question modal, .txt/Paste bulk importer, AI/PDF importer, type/chapter/priority filters | QuestionBank.jsx (2,480 lines) | Useful features dispersed; type-heavy first form, special Q:/ANS:/MARKS: syntax required for bulk entry, no simple Review then Commit batch |
| Paper Store | data for subjects/questions/savedPapers serialized in tenant-scoped localStorage | usePaperStore.js, tenantStorage.js | No durable multi-device paper backend persistence; writes whole store; quota and cross-tab considerations; seed merges must stay idempotent |
| Pre Classes Papers | nine immutable V2 source papers with tenant-scoped editable working overlay and print templates | EarlyYearsWorksheetEditor.jsx, earlyYearsSourceStore.js, EarlyYearsPresentationOverlay.js | fixed 9 source selector, no distinct Create Blank Pre Class paper or dynamic add/remove activity |
| Canonical V13 | guarded rich editor for approved structured papers | PaperEditorRouter.jsx, CanonicalPaperEditorMain.jsx, editorV2 | Input transformations must preserve source, explicit marks and template fidelity; no second competing editor |

## Current user workflows, verified from components
A. Reuse a bank item: Question Bank tab > choose class > subject > Add (manual) or Paste Text/AI Import > Paper Workspace > syllabus > class > subject > chapters > Question Menu > type, priority, medium, quantity > Search > select > Add to Paper > edit > Save > Print.
B. Adjust a recovered First Term paper: Saved Papers > Edit in Workspace > compact existing Paper Workspace > Edit Paper > click question > adjust content/marks in side inspector > Save > Print. Header total is already on main toolbar.
C. Edit Early Years seeded paper: Pre Classes Papers > pick one of nine > Edit Paper/Marks > change source-preserving overlay > preview > print. This is **editing**, not **new-paper creation**.

## Primary faults and risks
P0-1. Hotfix3 made recovery papers' editMode TRUE and metadata details OPEN automatically; inserted a large nine-question inline reconciliation grid. On Class 8 Urdu screenshot this pushes A4 preview off-screen even after marks were reconciled (header 70 / sum 70). REMOVE these extra defaults/grid, NOT the question marks, save workflow or original content.
P0-2. Browser on an 8GB RAM PC has previously exhausted renderer memory with parallel tabs; metadata panel must collapse by default and preview must own a stable independently scrollable area. Preserve the prior seed-idempotence / 180s print-frame hotfixes.
P1-1. Empty generic workspace goes straight to bank-dependent syllabus wizard; empty `official_section` is not a first-class authoring path. New blank drafts must save as NEW, not call updateSavedPaper on non-existent temporary IDs.
P1-2. Pre Classes has no dynamic user-owned document list; hard-coded nine sources must remain reference templates, not become the new-paper database.
P1-3. Manual bank modal exposes many type-dependent fields before a simple one-question entry; bulk importer requires tags; AI ingest needs review before persistent commit.
P1-4. Current stored-paper snapshot must not change when an underlying bank question is edited after a paper is assembled.
P1-5. Multiple overlapping rendering/routing paths and two large monolithic components invite regressions. Separate small schema/commands/presentation helpers before replacing any canonical renderer.
P2-1. localStorage cannot be the only authoritative persistence for official self-authored school documents; handle per-tenant multiuser access, versions and conflict resolution with backend API transactionally.

## Desired simple interaction architecture

### Create entry
On opening Paper Workspace show a single prominent `Create Paper` action (and `Open Saved Paper`). The New Paper chooser has three clear modes:
1. `Blank Paper — Type Myself` (NO Question Bank, syllabus/chapter or AI dependency)
2. `Build from Question Bank` (optional filters and review selection; default/current wizard remains compatible)
3. `Duplicate Existing` (creates independent draft with new paper ID, never overwrites source).
For Starter/Mover/Flyer, `Blank Paper` opens the specialized Early Years Activity Builder using same document/schema and renderer; nine first-term source papers remain available separately as `Reference Papers`.

### Document metadata (1 small step)
Class (live class and free-text fallback), subject (live and free-text), term/exam title, date, duration, language (en/ur/dual), optional paper code, target total, A4/half-A4, template. Logo/school name supplied from school settings, protected. No compulsory chapter selection.

### Question composer
Left: `+ Add Question` palette:
- MCQ, True/False, Fill blanks, Short/Long, Matching/table, Urdu grammar, Math operations, passage and custom block.
- Pre Classes: Trace letters/numbers, alphabet writing, picture identification, circle choice, colouring/sketch, matching, handwriting lines, before/after, missing letters/numbers.
Centre: live A4 canvas, natural scroll ONLY inside the page work area. Each question has stable ID, selectable independent marks, content, optional answer area/presentation, drag reorder, duplicate, remove with undo, and optional `Attempt any N` choice.
Right: collapsed by default; inspector of selected block with Content, Marks, Answer Lines, Layout/Visual tabs.
Top: compact title / class / subject and Save Draft / Review / Print; metadata and advanced style in collapsible drawers. No 400px-tall always-open forms.

### Question Bank — effortless workflows
- Quick Add (required only: class/subject once, type, question text, marks; answer, medium, chapter, topic, priority, options and image optional under Advanced).
- Add Another keeps class/subject/type and focuses question text.
- Paste Many: accepts ordinary numbered questions and structured Q:/ANS:/MARKS: tags, shows parsed row previews, flags ambiguity/duplicates, allows per-row correction, explicit Commit N (no direct unreviewed write).
- PDF/image/AI: extract -> editable preview -> principal confirms source/class/subject/medium/answers -> dedupe -> commit; no blind auto-save.
- Every bank item can be selected in a side drawer while editing a paper; `Insert Copy` snapshots text/marks into paper and retains optional bank source ID/version. Bank edits do not silently rewrite printed assessments.

## Core future structured document (schema direction)
```text
PaperDocument {
 id, tenantId, schemaVersion, status:'draft'|'review'|'approved',
 metadata:{schoolId, classLevel, subjectId?, subjectName, session, examType,
           title, date, duration, medium, paperCode, targetMarks?, pageMode},
 sections:[{id, order, title?, instruction?, attemptAny?, layout?,
   questions:[{id, kind, content, medium, marks, options?, answerKey?,
               answerLines?, presentation?, sourceBankRef?, sourceVersion?}]}],
 design:{templateId, pageBorder, fontProfiles, spacing, watermark?},
 validation:{currentMarks, issues, acknowledgedWarnings?},
 revision, createdAt, updatedAt, authorId
}
```
Conversion adapters accept legacy selectedQuestions, pts-native-v13 official_section, saved recovery and Early Years V2 but NEVER mutate source during read.

## Marks/validation/print contract
- Computed sum visible; header target optional and independently editable.
- Mismatch must NOT impede editing, saving drafts or PDF of a conspicuously marked review copy. Never silently alter marks, assign unspecified 5 marks or mark a mismatched paper Approved.
- Errors: no content, unsupported block with no editable fallback, invalid required options, negative marks. Warnings: target total mismatch, empty optional response areas, overlong page.
- Final/Approved print demands explicit reconciliation and preserved print = preview. Draft print includes visible REVIEW/DRAFT warning and does not substitute for signed official paper.
- Urdu fonts and RTL labels tested for screen/PDF parity. Multiple-choice table and option punctuation remain canonical.

## Storage / security / performance
- Stage 1 existing tenant-scoped local drafts with export/import and versioned backups; migration later into school-authenticated backend `paper_documents`, `paper_revisions`, `question_bank_items` (or compatible existing tables after DB schema audit).
- Explicit owner/teacher/principal permissions; uniqueness constraints for IDs; optimistic revision checks on Save.
- Debounce writes; don't serialize/reseed entire giant store on each keystroke, don't store multi-MB base64 visuals inside primary record; virtualize large bank lists; lazy-load rich editors; tests on 8 GB system.
- Disallow destructive reset of archive/current papers; no synthetic marks or student data.

## Execution order and gates
P0 (NOW): revert recovery auto-edit and auto-open metadata, remove inline reconciliation grid while retaining native per-question inspector. Assert Class 8 70/70 paper viewport and unchanged saved marks; focused tests + existing Urdu V13 regressions; deliver narrow frontend-only patch.
P1: implement explicit New Paper entry/Blank vs Bank vs Duplicate and Quick Add Bank, with no-op on existing papers, separate draft ID semantics, browser interaction and save-reopen tests.
P2: add independent Early Years activity composer and user-owned Pre Class papers. Keep existing nine teacher-source reference papers locked.
P3: factor structured PaperDocument + adapters + single marks/rules/RTL/template/print engine; backend persistence after safe schema/permission audit and backup.
P4: complete E2E matrix for Starter, Mover, Flyer, Classes One–Eight, Urdu/English/Dual, bank import, empty QB, source preservation, browser reload, print preview/PDF; ship gradually with rollback and live validation.

## Release safety gates
- Run existing Paper Editor V13 visual/print parity tests and Early Years source fidelity tests after each narrow patch.
- Fresh release metadata and verifiable artifact hash, backup, staging and no deletion of historical hashed assets.
- Production DB and Examination First Term r5 are outside this release. No paper content/marks mutation as a side effect of upgrading.
