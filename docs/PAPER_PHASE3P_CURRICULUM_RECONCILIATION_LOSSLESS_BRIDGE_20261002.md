# ASSPS Phase 3P — Curriculum ownership reconciliation and lossless Paper Composer projection
Date: 2026-10-02. Based strictly on Paper Phase3O c0b9118; never a production deploy.
New development branch: feat/paper-curriculum-lossless-projection-phase3p-20261002.

## Verified parallel checkpoint (READ ONLY)
Other worktree: C:\Users\Imac\Desktop\ASSPS_GRADE9_10_BANK_20261002
Observed branch: feat/grade9-10-curriculum-bank-foundation-20261002;
initial HEAD 3f2bf5e. Concurrent curriculum work then independently committed
485d788 (Full textbook default / optional verified ALP), leaving its worktree clean.
Live uncommitted changes initially observed in
TopicWiseCurriculumWorkspace.jsx, topicWorkspaceEngine.mjs, questionContract.mjs,
questionContract.test.mjs, releaseAudit.mjs, releaseAudit.test.mjs,
curriculumSupervisedAdapter.mjs and curriculumSupervisedAdapter.test.mjs;
new untracked syllabusPolicy.mjs and syllabusPolicy.test.mjs.
Those files were never modified, staged, committed, reset, checked out or copied by Phase3P.
59/59 selected curriculum source/contract/staging/ALP tests passed in read-only execution.

## Ownership and overlap reconciliation
Curriculum workstream alone owns official textbook ingestion and edition policy;
chapter/topic identity, original topic-authored questions, separate exercise mapping,
academic answers, provenance, review, ALP year evidence, board evidence, staging,
versioning and publication approval. Keep its existing topicDraftLibrary,
topicWorkspaceEngine, questionContract, releaseAudit and supervised adapter.
Paper Generator owns existing Phase3O visual question-type menu, independent
Attempt Any blocks, per-question marks, paper composition and the future paper
editor/format/RTL/print path. These are UI/composition responsibilities, not
a competing new textbook Question Bank.
Legacy free-text grouping and data/questionBank.js are presentation/legacy registry
only, not authoritative source for 2025/26 or 2026/27 academic facts.

## Actual schema gaps discovered
1. Curriculum q: q.chapter.id / q.topicId / q.content.{en,ur}.{stem,answer,options},
   original ID, curriculum edition, source.languages checksums/pages, review,
   importance/difficulty/origin, ALP, verified boardEvidence.
   Phase3O q: {id,subjectId,chapterId,topicId,text,textUrdu,marks,options[]}.
   Direct flattening loses the complete record and Urdu answer.
2. Phase3O registered chapter also REQUIRES school subjectId and en/ur titles.
   The curriculum manuscript's chapter index does not own school subject IDs.
   The Phase3P projection now binds them explicitly; no fuzzy free-text matching.
3. curriculumSupervisedAdapter has an approved, structured, review-only candidate,
   and explicitly declares the legacy supervised writer LOSSY. Do NOT use that writer.
4. Canonical PaperDocumentV2 currently validates sourceIdentity as a migrated
   official v13 dataset with sourcePaperId, v13 manifest/hash provenance.
   A newly authored curriculum paper is NOT a migrated original v13 paper.
   Phase3P must not forge those fields or call it a valid print-ready PaperDocument.
5. Grade X Biology chapter/topic hierarchy is absent from the audited old bank.
   Official manifest lists Grade X Biology EN/UR catalog anchors but PDF/indices
   remain PENDING: no invented chapter or fabricated selectable question.
6. Current Grade IX Biology source ledgers have real English/Urdu PDF hashes;
   specific topic physical page ranges have been visually audited, but source
   manifest edition correspondence, complete indices and review remain PENDING.
   Actual approved live candidate count is ZERO at this checkpoint.
7. KLP still lacks an authoritative definition/policy; do not implement guessed
   filtering. Full textbook is DEFAULT. ALP is opt-in, year-specific, checked
   by the curriculum-owned syllabusSelectionErrors before projection.

## New isolated contract: curriculumPhase3PBridge.js
Input: {review,manifest,schoolSubject,identity,auditPublicationCandidate,syllabusMode,examYear}.
The authoritative provider must invoke buildCurriculumSupervisedReview (its own
curriculumSupervisedAdapter) and supply its releaseAudit.auditPublicationCandidate
as an independent audit callback. Phase3P does NOT import from a sibling worktree;
wire this provider via normal versioned repository integration AFTER both changes
are independently reviewed. Callback must be trusted code, not a client-supplied
approval bit; the preview is not a server authorization scheme.
School subject curriculumBinding explicitly includes:
{authority,grade,subjectId,textbookId,edition,syllabusVersion}.
Books must be an unambiguous verified EN/UR pair from the SAME cohort, separate
SHA-256, verified chapter/exercise indices and aligned chapter/topic IDs.
Only independently audited approved records are projected; permanent q.id stays
unchanged. q.academicRecord is an independent full structured JSON snapshot.
Projection output includes Phase3O-compatible {subjects,chapters,questions},
academic source book IDs/hashes, full-versus-ALP selection and no-write status.
Unsupported types or incompatible marks are explicitly refused, not rewritten.
Only EN/UR paper composition is allowed; Hindi research rendition stays separate.
No live route, database write, bank seed, network call, localStorage or deployment.

## Paper handoff contract
composeCurriculumPhase3PPreview(projection,blocks,medium) calls the existing,
unmodified Phase3O composeTopicPaperBlocks. Result carries BOTH:
(a) unchanged operational composition (question text, option labels, marks,
    per-block Attempt Any and total); and
(b) sourceLedger, with a full independent academicRecord for each selected ID,
    curriculumIdentity, sourceBookIds, sourceChecksums and syllabus selection.
Status: UNSAVED_PREVIEW_AWAITING_NEW_AUTHORING_PAPERDOCUMENT_ADAPTER.
This is a source-preserving intermediate contract, NOT a canonical v13 migration,
saved paper, live editor mount or print authorization.

## Verification / protected systems
Phase3P+Phase3O 16/16 focused tests PASS.
Selected Paper Editor regression sweep 65/65 PASS (includes original source,
43-paper semantic parity, marks, RTL, Daily Diary, Early Years and blank creation).
Parallel curriculum worktree current selected tests 59/59 PASS (read-only).
No dependency install, no Vite production build, no PostgreSQL cluster, no
live deployment. The only Phase3P tracked additions are bridge, tests and report.
An earlier broader regression selection held a test process after numerous
passing tests; THAT TEST SESSION ONLY was terminated to avoid PC memory pressure.
A separate deterministic 65-test suite completed successfully with exit code 0.

## Remaining integration gates (not silently claimed completed)
A. Curriculum workstream finishes, audits and commits a reproducible official
   bilingual manifest per grade/subject/edition, with authorized approval data.
B. Merge/rebase independently against current protected production lineage
   (which includes deployed Class 6 Urdu commit 1e14ad9...), preserving release.
C. Add authenticated tenant-scoped approved-bank storage or read API which
   serializes full academic records and invokes curriculum publication audit
   on the SERVER. Never direct-commit to legacy q_* schema.
D. Version a NEW-AUTHORING canonical PaperDocument sourceIdentity variant/schema
   without weakening migrated official v13 validator; separately test editing,
   sourceLedger persistence, RTL/print parity and reversible import/export.
E. Only then optionally mount Phase3O/3P selector to Paper Editor behind scoped
   feature gate, after browser acceptance and original paper regression.
F. Resolve KLP from verified curriculum policy before adding its toggle.
G. Grade X Biology displays pending verified index until official book is audited.
