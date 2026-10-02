# Phase 3R — Isolated NEW-AUTHORING PaperDocument contract (2 October 2026)

## Decision
PaperDocumentV2 schema 3 and its validator require original V13 dataset/manifest identity.
New curriculum-authored papers cannot reuse or fabricate that historical migration identity.
Phase3R therefore introduces a separate discriminator: `assps-new-authoring-paper` /
`PaperDocumentNewAuthoring` / `schemaVersion: 1` / `UNSAVED_LOCAL_DRAFT`.

## Files and ownership
- `editorV2/newAuthoringPaperDocumentPhase3R.js`: pure handoff validator, factory, editable copy,
  recalculation, protected metadata, source-ledger preservation, student preview.
- `tests/newAuthoringPaperDocumentPhase3R.test.js`: synthetic fixtures, no real approved bank import.
- Existing Phase3O/3P/3Q, official V13/Canonical validators and live routes are not modified.
- Curriculum agent remains the owner of original question approval/source/revision and publishing.

## End-to-end workflow
`phase3QPreview(workspace, approvedProjection)` generates unsaved Phase3P handoff;
`createNewAuthoringPaperDocument({handoff,draftId,metadata})` or the direct pure helper
`createNewAuthoringPaperFromWorkspace({workspace,projection,draftId,metadata})` generates draft.
Draft contains distinct school-independent teacher metadata, local editable sections/items,
complete separate per-question bilingual sourceLedger, source-book checksums and FULL/verified ALP selection.
Original academic record is never replaced by a flat display projection.

## Editing, assessment and print boundaries
Question stem/options/marks/answer-line patches and section Attempt Any/marks updates are validated.
Options retain original IDs; edits flag `NEEDS_TEACHER_REVIEW` and never claim original answer remains checked.
Attempt Any sections with mixed marks refuse ambiguous totals. Totals recalculate deterministically.
Student preview omits answers, raw academic record, PDF hashes and reviewer information.
Branding remains unbound until the authenticated institution resolves it.
New-authored draft has `authorizationState: UNVERIFIED_CLIENT_ONLY`,
`serverPublicationApproved:false`, `printApproved:false`, and no saved ID or legacy bank write.
No server call, browser storage, production routing or deployment occurs in this milestone.

## Release gate / unresolved work
Wait for Curriculum owner to publish a reviewed canonical EN/UR source/topic mapping and
versioned approved provider with server-verified tenant/role, edition, publication audit and revision.
Then add authenticated persistence, review controls for teacher-edited answers, configurable rendering,
Urdu/English print parity, rollback, tenant isolation and live E2E checks; do NOT treat client-side
status or source snapshots as authorization. See GitHub coordination Issue #1.

## Verification
12 focused Phase3R tests passed on the development PC, including Phase3Q to Phase3R.
Prior Phase3O/3P/3Q sweep: 26/26 passed. One unrelated older Canonical canary expectation
in `canonicalCutoverReadiness.test.js:86` was observed failing (expected legacy route, got canonical);
leave the protected historical path untouched pending independent review.
