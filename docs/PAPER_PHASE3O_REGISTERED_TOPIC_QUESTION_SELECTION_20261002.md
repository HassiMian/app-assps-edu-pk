# ASSPS Paper Generator — Phase 3O registered curriculum topic and question-type paper blocks
Date: 2026-10-02. Exact Phase3N parent: 24a155e0840530bc20f9fd285e1ee8b90005fa1f.
Isolated branch: feat/paper-topic-question-pool-blocks-phase3o-20261002.

## Existing-source audit, NOT invented textbook content
Existing data/questionBank.js contains SYLLABI, CLASSES, SUBJECTS, CHAPTERS,
registered chapter.topics with en/ur titles. The actual QuestionBank.jsx already
visually groups questions by free-text q.topic, with q.chapter and q.topic inputs.
Its legacy seedData.js also stores chapter as a free-text title; topic often absent.
Grade 9 Biology registered chapters/topics exist in the audited bank; Grade 10
Biology subject exists BUT its registered chapter/topic data is currently absent.
The Phase3O module explicitly marks missingVerifiedChapterCatalog=true for such
subjects; it does NOT fabricate a Grade 10 textbook contents index or assign
free-text questions to a guessed topic. Actual government textbook versions,
source page references and human review are separate required ingestion gates.

## New dormant standalone pure composition engine
al-siddique-frontend/src/Modules/Paper-Generator/PaperEditor/editorV2/topicQuestionComposerPhase3O.js
- Registry-bound subject -> class and syllabus, chapter -> registered topics.
- Question menu filters MCQ, short, long and other supported types BEFORE
  grouping questions by their verified registered topic, in original topic order.
- Legacy q.chapter/q.topic text maps ONLY by exact unique matching chapter/topic
  ID or original English/Urdu/Hindi names; otherwise reported separately as
  UNMAPPED_CHAPTER / UNMAPPED_TOPIC, never silently inserted into wrong topic.
- Multiple independent block IDs allow Attempt All / Attempt Any X with automatic
  within-block numbering, exact source marks per question and total calculator.
- Prevents duplicate question IDs across blocks, mixing question types, taking
  another subject/class question, invalid choices or silently changing marks.
- Strict source-fidelity for en/ur/hi: refuses missing authored question text,
  and MCQs missing 4 original authored options in the selected language. The
  engine DOES NOT translate answers or create questions, paragraphs or book data.
- Returns only a detached status=UNSAVED_COMPOSITION_ONLY draft, with explicit
  sourcePaperUpdated=false, existingQuestionBankMutated=false and production
  printer approval=false. No server calls or storage mutation.

## New standalone (not wired to production) visual selector
al-siddique-frontend/src/Modules/Paper-Generator/PaperEditor/editorV2/TopicQuestionSelectorPhase3O.jsx
- Question-type menu above chapter -> topic -> source question checkbox listing.
- Add/switch multiple block tabs, per-block Attempt Any number and explicit
  Preview selected blocks (no save) via parent onDraft callback. This is a
  deliberate optional integration preview; NOT imported by the live PaperEditor.
- Shows legacy-mapping counts and warns for missing verified chapters.
- Urdu RTL direction in the preview; no modifications to native Print CSS,
  school logo/name or original PaperDocument canonical/teacher papers.

## Acceptance / remaining work
10/10 new source/registry/adversarial tests PASS with real registered Grade 9
and missing Grade 10 chapter dataset included. Standalone JSX compiled by
installed Vite/Oxc; no new dependency installed. Run selected original/editor
regressions separately and verify exact allowlist + protected source tree before
commit/push. Source bank is NOT auto-edited, school identity/tenant privileges
have NOT been mounted, no rollout/DB migration and no release approval.

Next Phase3P: principal review of exact public question authoring workflow;
source-backed verified textbook TOC ingestion for missing 9/10 subjects;
then guarded read-only UI mounting with authentication/tenant isolation and
PaperDocument/schema adapter + actual original visual evidence before any
production editor/paper write. Carry forward deployed Class 6 Urdu emergency
release separately (production candidate 1e14ad9 on previous live dee749c);
do NOT accidentally regress or overwrite it by deploying this older isolated
Phase3N-based development branch to the live server.