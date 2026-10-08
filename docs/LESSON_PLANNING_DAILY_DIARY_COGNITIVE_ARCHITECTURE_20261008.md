# ASSPS Lesson Planning + Daily Diary Cognitive Architecture V2

Date: 2026-10-08
Scope: Paper Generator shell only — Lesson Plans + Daily Diary/Notebook Print Studio
Base: canonical production descendant 8055d39e797fcf878566ce978831a3b59fcd46ec
Principle: extend/stabilize; do not rebuild Paper Workspace core.

## Research foundation

The planner must not hard-code one timeless curriculum. Official sources show that Pakistan's National Curriculum is standards/SLO-led and concept-based, while Punjab publishes session/version-specific curriculum, compliance and textbook material. Therefore ASSPS treats curriculum as a versioned evidence source, not AI memory.

Authoritative source priority:
1. National Curriculum Council / Ministry of Federal Education current standards and SLO documents.
2. Punjab Education Curriculum Training and Assessment Authority (PECTAA) curriculum/compliance and approved session materials.
3. ASSPS approved syllabus, books, resource mappings and curriculum profile versions.
4. ASSPS academic session dates and timetable.
5. ASSPS Question Bank metadata as assessment evidence — never as the sole sequencing source.
6. Teacher instructions and approved historical plans.
7. AI suggestions only for pedagogical enrichment where source facts are missing.

Key public research used:
- NCC National Curriculum of Pakistan 2022-23 overview and SLO framework.
- NCC/MoFEPT current notifications, including later subject/scheme/rationalized curriculum updates.
- PECTAA Books & Publications for 2026-27 school resources.
- PECTAA Curriculum & Compliance, including session-specific curriculum/smart-syllabus material.

## Audit — why the legacy Lesson Plan architecture was not scalable

### Strengths retained
- Durable `lesson_plans` storage already existed.
- Revision/CAS conflict handling existed.
- Tenant/RLS boundary existed.
- Portal sharing existed.
- Existing payload JSON could preserve richer data without destructive migration.
- Daily Diary already had save/reopen, parser and basic print primitives.
- Academic setup already exposed classes/subjects/session dates.
- Timetable API already exposed day/period/subject/class/section.
- Question Bank already contained chapter/topic/type/marks/source metadata.
- Curriculum V1 already provided versioned subject/profile/scope/resource identities.

### Weaknesses removed or isolated
- One `Lesson Title` was forced on Term planning.
- One `Chapter / Unit` was forced on a whole term.
- Root-level `Period` and `Duration` were treated as relevant to a whole term.
- `Plan Range / Label` was an ambiguous free-text substitute for actual start/end capacity.
- Teacher had to think subject-by-subject instead of day/class/term-first.
- Legacy Daily Diary used gradient-heavy template families and fixed two-column print layout.
- Editing and preview were separated by vertical scrolling.
- Generic preview could expose implementation-like data and was not student-centric.
- Fixed print density classes shrank content rather than allocating the A4 page intentionally.
- Daily Diary and Lesson Plans were separate mental/data flows instead of one reusable source.

## Challenged architecture decisions

### Decision: One canonical LessonPlanDocument
Challenge: Would two separate systems be simpler?
Answer: No. A separate top-level Lesson Planner and notebook-card planner would duplicate parsing, storage, lesson content and future bug fixes. One schema is safer.

### Decision: Daily root = day + class + section, not subject
Challenge: Would subject-root forms be easier to code?
Answer: Yes, but they force repeated metadata entry and make a whole-day plan slow. Multi-subject daily planning is the teacher workflow.

### Decision: Term root = term + class + section, then many subjects/units
Challenge: Could Term planning reuse the Daily single-lesson form?
Answer: No. A term contains many subjects, chapters, periods and milestones. Reusing the single-lesson form produces incorrect information hierarchy.

### Decision: deterministic calendar/capacity first, AI second
Challenge: Why not ask AI to make the entire plan?
Answer: Dates, periods, tenant IDs, timetable capacity and source mappings are facts. They must remain deterministic and validated. AI is used only for objectives, activities, assessment, homework and resources.

### Decision: Question Bank = signal, not curriculum authority
Challenge: A large Question Bank already knows many important topics.
Answer: Question frequency can indicate assessment emphasis but cannot define curriculum sequence or teaching time by itself.

### Decision: no invented holidays/page numbers/curriculum facts
Challenge: Would generation appear more complete if AI filled gaps?
Answer: It would be less reliable. Missing evidence is explicitly marked for teacher confirmation.

### Decision: low-toner premium visual system
Challenge: Does premium require gradients and many colors?
Answer: No. Premium print comes from typography, spacing, hierarchy, crisp thin rules and restrained accent color. Large dark fills waste toner and reduce physical-print quality.

## Canonical hierarchy

Session
→ Term / Week / Day
→ Class + Section
→ Multiple Subjects
→ Chapters / Units / Learning Scopes
→ Scheduled Lessons
→ Daily Lesson Plan
→ Daily Diary / Personalized Student Notebook Card
→ Assessment suggestions / Question Bank links

Actual teaching status flows upward:
Taught / Partial / Carry Forward / Skipped / Revised / Assessed.

## Cognitive planning pipeline

Planning Request
→ resolve authenticated school/tenant
→ resolve academic session
→ resolve class/section
→ resolve timetable
→ resolve selected subjects
→ retrieve versioned curriculum scopes
→ retrieve Question Bank chapter metadata only
→ calculate real timetable slots
→ apply teacher blackout dates
→ reserve configurable buffer
→ calculate per-subject capacity
→ weight curriculum units using scope complexity + approved assessment signals
→ allocate periods
→ validate collisions/capacity
→ optional constrained AI enrichment
→ canonical LessonPlanDocument
→ teacher review
→ CAS-safe save

AI is never allowed to change deterministic lesson keys, dates, subjects or periods.

## Current evidence limitation

ASSPS does not yet have a canonical school holiday/event calendar table. V2 therefore:
- uses real academic session range + real timetable;
- accepts teacher-confirmed blackout dates;
- explicitly warns that authoritative holiday/event calendar is not configured;
- does not fabricate holidays.

Future calendar integration should become another deterministic evidence adapter, not an AI prompt.

## Daily multi-subject workflow

1. Select date, class and section once.
2. Timetable/context determines available subject slots.
3. Teacher can select multiple subjects or use all relevant subjects.
4. `Analyze & Generate` produces one daily document containing all subjects.
5. Whole-day Smart Paste accepts many subjects in one paste operation.
6. Each subject remains independently editable.
7. One save persists the whole Daily Plan.
8. Notebook Print Studio can derive concise student-facing cards from the same document.

## Term workflow

1. Select class/section, term range, session and term label.
2. Select multiple subjects.
3. System retrieves curriculum profiles/scopes and timetable capacity.
4. Each subject becomes a collapsible container.
5. Each subject has multiple chapters/units.
6. Units receive estimated allocated periods.
7. Lessons are assigned only to real subject timetable slots.
8. Over-capacity subjects are shown explicitly instead of silently compressed.
9. Teacher can edit/reorder/remove units and lesson content.

Term root deliberately does not require one Lesson Title, one Chapter, one Period or one Duration.

## Smart Paste rules

Recognize when confident:
- Subject headings
- Chapter / Unit / Topic / Lesson headings
- Objectives / Learning Outcomes / SLO
- Activities
- Assessment
- Homework / Diary
- Resources / Materials
- Page Range

Unknown lines are preserved for review, never silently discarded.

## Notebook Print Studio architecture

Modes:
- Daily Diary
- Lesson Plan

Both use:
- Class + Section
- real student roster
- All / selected students
- student search and roll display
- fixed curated low-toner palettes
- 2 / 3 / 4 / 5 / 6 / 8 / 10 cards per A4 page
- automatic pagination
- live A4 preview beside the editor
- print-safe A4 CSS
- Urdu Jameel-first typography

Student-facing card projection contains only:
- school identity/logo
- date
- student name
- roll number
- class/section
- subject
- diary/lesson task
- optional footer

It must never print:
- tenant identifiers
- internal IDs
- answer keys
- teacher-only notes
- raw JSON
- `null`, `undefined`, `[object Object]`

## Dynamic A4 allocator

2 cards → 1 × 2
3 cards → 1 × 3
4 cards → 2 × 2
5 cards → 2 × 3 with intentional balanced final card span
6 cards → 2 × 3
8 cards → 2 × 4
10 cards → 2 × 5

The page engine changes row/column allocation and density; it does not simply shrink a fixed card.
When selected students exceed cards-per-page, pages are chunked automatically.

## Low-toner visual rules

- White is the dominant print surface.
- Navy/blue/red/gold are restrained accents, not large fills.
- One narrow top accent strip.
- Small solid table heading only.
- No full-card gradients.
- Thin neutral borders.
- Typography and alignment create hierarchy.
- Student identity gets a light tint band, not a dark block.
- Logo stays proportionate and crisp.

## Reliability rules

- Existing Paper Workspace internals remain untouched.
- Existing lesson plan CRUD/CAS remains the persistence boundary.
- New structured plan lives in payload schema v2; legacy single plans normalize into v2 without deletion.
- Save success is shown only after server success.
- Local tenant-scoped draft remains recovery support.
- API refresh failure must not blank already loaded useful state.
- Tenant/RLS context is established before planner context queries.
- AI unavailable → deterministic planner still works.
- Missing curriculum/timetable → visible warning, never invented data.

## Acceptance gates

Required before production:
- production safety PASS
- full ops PASS
- planner engine unit tests PASS
- cognitive planner HTTP/RLS isolation PASS
- legacy Lesson Plan CRUD/CAS/share PASS
- Daily Diary adversarial tenant isolation PASS
- new Lesson Planning Workspace browser PASS
- new Daily Diary Workspace browser PASS
- 2/3/4/5/6/8/10 A4 layout PASS
- real roster personalization PASS
- multi-page pagination PASS
- print-media A4 geometry PASS
- Official Paper Workspace PASS
- Urdu/Jameel Paper Workspace PASS
- Early Years/self-service/print regressions PASS
- protected templates unchanged
- fresh production build PASS
- source/remote/live reconciliation immediately before deploy
- backend/frontend artifact drift PASS after deploy
- authenticated production smoke PASS

## Explicit non-goals for V2

Not built yet:
- automatic live fetching of government curriculum from the internet inside production requests;
- automatic school holiday ingestion;
- unsupervised plan rewriting;
- student differentiation engine;
- substitute-teacher planner;
- parent learning summaries.

These can be added later through adapters without changing the canonical LessonPlanDocument.
