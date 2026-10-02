# ASSPS Grade IX–X Question Bank | Audited foundation | 2026-10-02
Status: PHASE 0 FOUNDATION ONLY. NOT SEEDED INTO LIVE BANK. Production and existing reference objects untouched.
Base: HassiMian/app-assps-edu-pk, b9d7f17a9ab4b9256d94cb5dcf489dca8c02853d (Phase 2).
Local isolated branch: feat/grade9-10-curriculum-bank-foundation-20261002.
Authoritative catalog: https://pectaa.edu.pk/curriculum-compliance/
Official board notification index: https://biselahore.com/notifications

## Non-negotiable version separation
- Grade IX target: PECTAA 2025-26 approved edition; 2026 annual exam context needs official ALP/smart-syllabus status.
- Grade X target: PECTAA 2026-27 revised edition; 2026 historical board questions are PREVIOUS-EDITION evidence unless mapped afresh.
- Do not infer one grade or book revision from the other. Assign immutable textbook/edition/syllabus IDs.
- E-book catalog includes OLD and NEW editions on the same page. Never choose a PDF by subject title alone.
- Online government-hosted textbooks are not automatically free to redistribute wholesale; retain source links, pages and exercise references and author original question statements.

## Completed audit observations (source-verified versus pending)
A. Repository audit: COMPLETE for questionBank.js, QuestionBank.jsx, QuickQuestionEntry.jsx, quickQuestionRecord.js, usePaperStore.js.
B. Official catalog: PECTAA listings VERIFIED for new IX and X; individual PDF byte download/hash/page audit PENDING.
C. Board paper research: official Lahore notifications and PECTAA ALP location VERIFIED; ALL-board, subject-by-subject pattern matrix PENDING.
D. Original question drafting/academic checking: NOT STARTED; zero approved claims.
E. Live seed and user data migration: NOT PERFORMED; never run against production before approval and tests.

## Confirmed legacy weaknesses; do not blindly reuse
- questionBank.js embeds static sample IX chapter data and mixed old editions; not the revised edition source of truth.
- QuestionBank.jsx conflates provenance into one priority enum: all/exercise/past/additional.
- usePaperStore.js withAsspsQuestionBankSeed assigns exercise to every ingested row, regardless of actual origin.
- seedQuestionMedium infers Urdu from Unicode/subject and cannot construct a linked Dual bilingual record.
- addQuestion destructures a limited set of fields, losing source evidence, board history and difficulty.
- bulkAddQuestions appends without complete schema, review gates or robust duplicate validation.
- getQuestionsForPaper currently admits missing chapter/priority into restricted chapter/priority selections.
- quickQuestionRecord.js validates dual text, but has no provenance or curricular-evidence contract.
- Question Bank persists in tenant-scoped browser storage; bulk curriculum delivery needs versioned durability and migration.
- Existing official papers, Early Years references and PaperDocument V2 remain immutable in this project.

## Source and subject inventory requirements
- Build official PECTAA manifest: Grade IX, Grade X, and joint IX–X; compulsory, Science, Humanities/Arts, Matric-Tech, religious alternatives, practical books.
- Each school-offered subject: subject ID + grade + edition + textbook ID + stream + medium + official URL + SHA-256 + download date.
- Preliminary IX compulsory scope: Urdu, English, Islamiat, Tarjuma-tul-Quran, Mathematics; science options Biology, Chemistry, Physics, Computer/Entrepreneurship.
- Preliminary X compulsory scope: Urdu, English, Mathematics, Pakistan Studies, Tarjuma-tul-Quran; science options Biology, Chemistry, Physics, Computer.
- General Science, Ethics/approved alternative religion, humanities electives and Matric-Tech must be separately inventoried rather than silently ignored.
- Verify grade-specific scheme of studies; never import IX Pakistan Studies from obsolete demo data as current compulsory scope.
- PDF source records need access verification, language, publication year, chapter index, page map, exercise index and QA state.
- Maintain full textbook coverage AND exam-scope/ALP status separately: deleted exam content can remain book content but cannot enter board-ready papers for that year.

## Board pattern evidence matrix: one row per exam context
- Dimensions: board, academic cohort, exam year/session, grade, subject, stream, medium, edition match.
- Fields: marks, duration, MCQ count/options, short blocks/choice rules, long blocks, grammar/composition categories, practical/theory split, evidence link/page/date.
- Prioritize official PECTAA pairing/model papers and board notifications.
- Analyze historical formats without wholesale republication of third-party papers; retain pattern facts, original exam-style wording and verifiable provenance.
- A 2025 IX paper is not automatically revised-syllabus evidence; a 2026 X paper is not automatically 2026-27 textbook evidence.
- Previously appeared tag requires exact verified BOARD + YEAR + SESSION + PAPER + QUESTION/SECTION and exact/conceptual match level.
- Board style or online popularity is NOT Previously appeared. Never attach unsupported student-facing tags.

## Canonical question record
- Identity: stable source-qualified ID, grade, subject, textbook edition, chapter ID/number, topic ID, learning outcome and type.
- Origin is mutually exclusive: exercise OR additional OR conceptual; store exercise number/topic reference.
- Importance is orthogonal, with written rationale. Verified board appearances are a separate evidence array, never an origin.
- Difficulty: easy/medium/hard based on answer depth, prerequisites, reasoning and distractor complexity, not chapter number.
- Syllabus scope: full-book inclusion + exam year + applicable ALP status + source evidence.
- Text: separate proofread English and Urdu stems/options/answers sharing one academic question ID and one MCQ answer identity.
- No double counting of bilingual translations. Each language has independent validation and scientific/semantic parity.
- Subject-specific MCQ, short, long, numerical, diagram, Urdu grammar, English grammar/composition validators.
- Staged draft -> source-checked -> academic-checked -> translation-checked -> approved. Unapproved records are never selectable.
- Never fabricate page numbers, answers, question source, board history, translations, hashes or chapter mappings.

## Generation and classification
- Create chapter/topic/page/exercise ledger before writing questions.
- Exercise lane: map each approved exercise item and author a faithful original stem, preserving exercise mapping.
- Additional lane: author strictly book-grounded non-exercise questions linked to a precise chapter/topic/page.
- Conceptual lane: typically three or four original short questions per chapter subject to chapter scope and learning outcomes.
- Important is a separate badge that may accompany Exercise/Additional/Conceptual; allow multiple small tags.
- Long questions can have subparts, but complexity must fit marks. Numericals require correct formula, units and worked key.
- MCQ needs one defensibly correct option, plausible distractors and stable bilingual labels/answer mapping.
- Urdu: audit lesson/prose/poetry, grammar, language usage and composition by current subject pattern.
- English: audit lessons/poetry, comprehension, translation, grammar and composition by current subject pattern.
- Religious studies: validate exact references and language-specific terms; never manufacture citations.

## Paper Generator and release gates
- Modes: English LTR, Urdu RTL with Jameel Noori, Dual with deliberate aligned columns; print=preview.
- Strict filters: grade, subject, edition, chapter, type, origin, importance, difficulty, exam scope and approval status.
- Question labels, marks, total, section choice and language must never be silently inferred from old defaults.
- PaperDocument retains source question ID and version; local editing of a paper must not mutate approved bank source.
- Idempotent seed: stable IDs + hashes, dry-run diff, conflict report, approved staged merge, rollback point.
- Test edition leakage, excluded syllabus, semantic duplicates, missing translation, wrong keys, ambiguous MCQs and broken RTL/print.
- Run existing official paper and Early Years regression suite and A4 print snapshots for three media before release.
- Do not change main, live hotfix, exams/marks modules, official paper dataset, original source files or live database in foundation phase.

## Acceptance criteria before actual seed
1. Official book manifest is verified with URL, hashes and accurate chapter/exercise mapping for each target.
2. Board matrix contains cited model/past evidence for each required grade/subject/relevant cohort.
3. All question statements are original, source-grounded, correctly keyed and linguistically reviewed.
4. Validator passes; coverage report checks every exercise, chapter and separately classified conceptual budget.
5. Dry-run gives exact insert/skip/conflict counts without modifying tenant or immutable paper records.
6. Teacher-review signoff recorded; only then execute tenant-safe versioned migration and verify backup/rollback.
7. English/Urdu/Dual print acceptance, correct total marks, no unapproved or wrong-edition question selectable.
