# Phase 3Q — Isolated Curriculum Paper Studio (2026-10-02)

## Boundary
Continues Phase 3O `topicQuestionComposerPhase3O.js` and Phase 3P `curriculumPhase3PBridge.js` without changing either tracked source.
- Current feature branch: `feat/paper-curriculum-preparation-ui-phase3q-20261002` (parent at implementation start `7ef898b`).
- The production Paper Editor route, PTS generator, Question Bank store, V13 official papers, Early Years and backend have NOT been wired or modified by this phase.
- Curriculum agent retains ownership of official sources, bilingual identity, authoring, approval and publication. Coordination: https://github.com/HassiMian/app-assps-edu-pk/issues/1.

## New files
1. `al-siddique-frontend/src/Modules/Paper-Generator/PaperEditor/editorV2/curriculumPreparationPhase3Q.js` — pure, read-only local selection engine.
2. `al-siddique-frontend/src/Modules/Paper-Generator/PaperEditor/editorV2/CurriculumPaperStudioPhase3Q.jsx` — dormant teacher UI (approved chapter/topic, type tabs, paper preview).
3. `al-siddique-frontend/src/Modules/Paper-Generator/PaperEditor/tests/curriculumPreparationPhase3Q.test.js` — 10 focused regression cases.

## User workflow
An upstream APPROVED Phase 3P projection binds grade, subject, bilingual official-source textbooks and full/verified-ALP selection before this UI is mounted.
Teacher browses verified chapters/topics, switches MCQ/Short/Long/other Phase3O types without discarding selected questions, one-click adds questions into independently editable choice blocks, and sees an instant unsaved paper and auto-total. Selected questions can also be reordered or removed from the live paper side. Attempt Any is validated per block. English and Urdu are individually rendered from the approved source projection. Optional Blank Paper stays a separate independent route.
The `onPreview` callback receives the existing Phase 3P unsaved source-preserving handoff including every original `academicRecord`/sourceLedger item. Nothing writes into legacy Question Bank, production PaperDocument, localStorage, a server or printer.

## Fail-closed guards
- Null or zero-approved snapshot shows readiness state; no demo/draft data masquerades as published.
- Invalid/incomplete approved projection, unknown topic/type/question, mixed marks in one block, duplicate question across blocks, invalid Attempt Any, unsupported medium and exceeding block limits are rejected.
- Open session is invalidated if revision (when available), school-bound curriculum identity, source book/checksums, selection, hierarchy, original display stem/options or publication/source status drift.
- Client projection flags are NOT authorization. Authenticated server must independently check tenant/school, role, revision, per-language source evidence and publication approval before production integration.

## Verification on CYBERSPACE worktree
- Node 24 Phase 3O + Phase 3P + Phase 3Q test sweep: **26 passed / 0 failed**.
- Babel JSX parser: **pass**; new JS `node --check`: **pass**.
- Additional selected historical Canonical / Workspace / self-service regression run: **22 passed / 1 failed**. Failure is in tracked, unmodified `canonicalCutoverReadiness.test.js` line 86: it expects `LEGACY_CANVAS_V2` on academic mutation but current route yields `CANONICAL_V2`. This test and its imported production router are not modified or referenced by Phase 3Q. `canonicalRouteCanary` also emits an anticipated dual-mirror conflict diagnostic during a passing negative case. Do not hide or modify these separate historical behaviours just to obtain a green suite.
- PC free physical memory during verification ~1.77GB, so memory-intensive full Vite build, browser and production tests intentionally deferred.

## Unlock criteria for actual release
1. Curriculum owner publishes real approved, independently audited academic records and a versioned bilingual canonical mapping (source IDs remain unchanged).
2. Authenticated, server-resolved tenant/subject-specific approved snapshot/provider with monotonic revision and explicit pending state; no trust in client callback.
3. Implement separate NEW-AUTHORING PaperDocument sourceIdentity / adapter; never forge migrated official V13.
4. Integrate studio via reviewable, flag-controlled route, run live browser/Urdu print parity, choices/marks checks, tenant cross-contamination, resource usage, full regressions and rollback acceptance; deploy only through current production baseline.
