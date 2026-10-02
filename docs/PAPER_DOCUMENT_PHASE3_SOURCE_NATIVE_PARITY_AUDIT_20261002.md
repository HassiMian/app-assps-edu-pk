# Phase 3A — source-native Structured PaperDocument compatibility and exact paper pattern contract
Date: 2026-10-02
Parent commit: ec29edacc93b5bf7e347db70bca2e2dd6a7f9ffb
Isolated branch: feat/structured-paper-document-shadow-v1-20261002
Scope: non-rendering, read-only compatibility adapter and immutable repository golden fixture, NOT a new visual template or production rollout.

## Principal acceptance requirement
The previously approved paper remains the appearance authority. Identical question text, sequence, numbering, answer-space, MCQ labels/punctuation, Urdu alignment, Jameel font availability, line/paragraph spacing, tables, school header/logo, page breaks, print CSS and A4 output must survive a read/restore unchanged. An optional visual improvement may be offered only as a separately created working-copy design after comparing the native approved baseline and securing explicit selection. Never silently restyle or replace existing papers in storage.

## Architecture discovered, avoid duplicate rewrite
1. Official First Term V13 / recovered saved paper: PTSPaperGenerator and OfficialSectionRenderer remain the source-native screen/print route. Document includes original config, official_section and often a mirrored selectedQuestions. These may differ and must not be auto-reconciled. 43 official V13 source papers exist, Class 8 Urdu is instead in the separate recovery seed; the approved browser saved working copy may diverge from either original.
2. Early Years original V2: exactly nine Reference Papers; EarlyYearsWorksheetEditor and EarlyYearsPaperContainer are the visual authority. Preserve rawTeacherSource, totalMarksSource (including header-versus-list discrepancies), question presentationType/content, all QA flags, overlays and Jameel print behavior. Existing source JSON stays immutable.
3. Early Years independent new authoring: early-years-user-v1 with separate tenant-scoped user draft library and EarlyYearsActivityBuilder reusing EarlyYearsPaperContainer. No automatic reference-paper migration.
4. Existing canonical PaperDocumentV2 actually uses schemaVersion 3, with its own source-coverage, teacher authority, marks evidence and separate CanonicalDocumentRenderer. Do NOT replace this established model with a competing canonical one or call source conversion a completed print cutover.
5. Legacy Canvas V2 and generic saved/blank formats retain their existing renderers; createPaperDocumentShadow is an on-demand read-only envelope and does not enter any existing save/print path.

## Phase 3A implementation contract
- PaperDocumentShadow.js: discriminated sourceType, exact immutable-by-hash JSON snapshot, SHA-256, source identity, explicit-only metadata, source-path provenance, section/item projection, saved native appearance settings and renderer route. No fabricated placeholder question, date, marks or answer. Never assumes official free-text sections are individual parsed questions.
- Source-native presentation is locked: renderPolicy SOURCE_NATIVE_RENDER_ONLY, cutoverReady=false. The shadow is never given to the old renderer as a replacement. restoreSourcePaperUnchanged refuses modified protected source snapshots. verifySourcePaperUnchanged and assertNativePresentationContract guard any proposed renderer substitution.
- inspectPaperMarks reports source-specified header, explicit section totals or explicit item totals, unresolved marks, conflicting headers and teacher QA flags. It never changes original total or redistributes Attempt Any / internal choice marks. Zero marks is distinguishable from missing marks; unresolved/conflicted papers cannot be auto-approved by this diagnostic.
- Presentation copies editorSettings, pageSetup, printSettings, templateId, early-years design/header/each activity. The full sourceSnapshot protects every additional existing/unknown field without lossy adaptation.
- Baseline fixture paperDocumentGoldenBaselines.json pins SHA-256 of JSON.stringify(parsed paper) for each source item at the parent checkpoint: official43 (43), earlyYears9 (9), recovery6 (6), canonical43 (43), total 101 source objects. This is the REPOSITORY baseline and is not a claim that a browser-local or live saved paper has already been captured.
- Existing V13 official/class-eight, canonical, Early Years native visual tests must remain green. Before user-facing cutover, capture baseline of approved live saved working copies separately and compare screen screenshot, print screenshot, extracted PDF text, coordinates/overflow and target marks. Do not overwrite that browser store to create test fixtures.

## Known print fidelity danger areas
- Original PTSPaperGenerator + OfficialSectionRenderer has its own editorSettings/template and print sections; new adapter must not collapse official_section into its mirrored selectedQuestions or normalize whitespace/punctuation.
- Canonical schema 3 has teacher-authority and unknown/raw-preserved nodes, marks provenance and existing source coverage. Preserve its exact source even where operational marks differ.
- The older PaperDocument.js schema 2 factory supplies demo MCQs/default 50 marks. NEVER apply that factory to an imported teacher source or blank paper, because doing so fabricates questions, fonts and totals.
- Early Years source totalMarksSource can contain intentional 50-versus-listed-item conflicts; these are evidence, not bugs to autocorrect. Native activity type remains visual selection.
- Urdu/Jameel, LTR/RTL per question, mixed language, MCQ option bracket, print/PDF font and page geometry require browser verification, not just JSON SHA checks.

## Backend persistence audit (SOURCE LEVEL ONLY — no DB access/write/migration)
- al-siddique-backend/src/config/migrate.js defines existing question_bank and question_bank_imports, keyed by school_id, with question_bank.marks INTEGER DEFAULT 1 and approval flags. This default is incompatible with the no-invented-marks paper approval contract: a new transactional adapter must validate explicit marks before using that legacy table.
- Existing questionBankRoutes.js has authenticated school-scoped CRUD and /import/approve transaction. Existing paperRoute.js currently provides AI paper generation/import/job operations, not durable paper_documents/revision CRUD.
- Prisma schema is explicitly a future reference; the running Express/Postgres uses SQL migrations directly. No paper_documents/paper_revisions schema was located in checked-in code. This is not a claim about the uninspected live DB state.
- tenant.js tenantClause may OR school_id/tenant_id predicates when both exist; new paper persistence must use a strictly verified school ownership constraint, never trust request-supplied tenant headers/IDs for a teacher/principal. Owner/author role enforcement must be server-side, not a frontend flag.
- Before a backend migration: read-only production DB schema inventory through an authorized connection, permission review, tested encrypted backup and restore, RLS matrix (two distinct schools and roles), optimistic revision checks, immutable source hash/version and audit log, transaction on paper+revision save, conflict on stale version, prohibit source paper overwrite.
- Suggested versioned storage after audit: paper_documents (school_id, id, source_family, native_document JSONB, source_sha256, presentation_sha256, revision, status, created_by, updated_by, timestamps); paper_revisions (school_id, document_id, revision, full native payload or verified diff, previous_revision hash, editor user/time), plus optional dedup-aware bank linking. No live schema migration in this phase.

## Release / acceptance gates
1. Static 101 SHA fixtures remain unchanged and lossless read/restore/renderer-cutover guards pass.
2. Canonical all43 screen versus print text structural/placement tests pass with browser.
3. EarlyYears 9 native source geometry/print and Jameel font checks pass with browser.
4. Class 8 Urdu live saved workspace compact print and original marks remain unchanged.
5. For each actual approved saved paper, capture a protected user-approved copy/appearance baseline and compare exact before/after; do not claim live parity only from bundled source fixtures.
6. Add future opt-in improvements to new copies only; visually compare with native baseline and require teacher/principal approval.
7. No deploy, no automatic migration, no source overwrite and no First Term marks backend change until all gates are explicitly accepted.

## Actual executed parity evidence, including resolved regression
- The initial pre-fix 43-document canonical browser loop rendered and compared all 43; 42 passed, and Class 7 Social Studies failed because blank item-marks badges showed the literal '( Marks)' ONLY in print-media text. This regression was not caused by the shadow adapter (no renderer/corpus modification); the existing CanonicalPaperEditorMain native printSurface cleanup already removed empty badges.
- Narrow print-only canonicalEditor.css change hides canonical-question-marks-empty and canonical-section-marks-empty to match that established cleanup. It leaves all explicit valid marks visible and does not modify official contents, renderer markup, source JSON or teacher decisions.
- Focused phase3Class7PrintGhostMarks.test.js passed, asserting exact screen/print text, original Urdu question, visible legitimate (10 Marks) and no ghost badges.
- Second complete canonicalAll43RenderPrintAcceptance.test.js run: all 43/43 paper iteration checks PASS (one aggregate browser test, 43 individual paper prints/screens) and process exit 0, 2026-10-02. This verifies source static screen versus print text and overflow for the repository canonical set, not pixel identity of the principal's unseen local custom saved revisions.
- paperDocumentShadowPhase3.test.js: 13/13 PASS with 101 pinned source-object hashes and source-native render policy. Final independent combined acceptance: 23/23 PASS (Class 8 Urdu compact workspace 1, eight Early Years source/A4/geometry/PDF/route cases, source adapter 13, targeted ghost marks 1). Scoped ESLint PASS (no warnings/errors), fresh Vite frontend build PASS. The 43 canonical source iteration test independently PASS (43/43) after narrow print fix.
