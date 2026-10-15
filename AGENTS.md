# ASSPS SaaS multi-agent release instructions

Before each production change read GitHub issue #4, the coordination handoff,
the ACTUAL live VPS frontend/backend artifact hashes, remote source heads,
and active agent worktrees. Never force push or overwrite dirty parallel work.

Ownership: Paper Studio -> Lesson Planning, Diary and paper/print.
Grade IX-X Academic -> subject-source provenance and independent review.
SaaS Core -> VPS deployment, PostgreSQL/RLS, recovery and release signing.
APEX Connect -> its separately coordinated UI/API integration.

## Lesson Planner feature preservation (mandatory for all frontend releases)

The 15 October regression happened because an unrelated frontend cutover
loaded a legacy LessonPlanModule from its entry graph even though unused
Weekly Notebook chunks remained in the assets directory.

All proposed production frontend builds must retain the integrated Term
Syllabus, all class subjects/page ranges, separate Assessment/Date table,
Weekly Notebook, Daily Student Cards, Save Week, Save Term, Save/Reopen,
bilingual font controls and A4 print.

Before promotion, regardless of which project initiated the frontend build:

1. Reconcile exact current live source; forward-port all missing protected
   improvements onto a descendant of the latest appropriate canonical source.
2. Build the exact candidate with npm run build in al-siddique-frontend.
3. Run: python3 ops/release/check-lesson-planner-ui.py --dist al-siddique-frontend/dist
4. Run: python3 -m unittest discover -s ops/release/tests -p 'test_lesson*py' -v
5. Validate ACTUAL html-index-reachable modules, not merely stale asset files.
6. Use SaaS Core signed release authority and a reviewed rollback-ready
   deployment process; optional controlled runner:
   ops/release/guarded-lesson-planner-rollout.py
7. Verify genuine actor-bound teacher/class/tenant access and no academic
   publication without institutional approval. Never fabricate evidence.

This is NOT a permanent commit lock. Legitimate new functionality or UI
redesigns are welcomed. Update the versioned UI contract and tests through
code review and demonstrate equivalently complete saving, lesson coverage,
formatting, protected modules, access controls and print parity.
Reviewed newer descendants can deploy once authentic Core security/recovery
release gates pass. Do not bypass a failing check by simply deleting it.

Existing students, examination results, numeric zero vs blank values,
official school papers, staff credentials and other agent's protected
features must never be reset, deleted, leaked or overwritten.


## Preserve the currently live Diary and Early Years improvements

The public 15-Oct build was traced to an independently dirty Result Cards
source worktree with eight unpublished modifications and a new printing module.
Those changes include working Diary font controls and Early Years print.
The 1d9291b Lesson Planner recovery branch lacks some of those live features.

Run `python3 ops/release/check-preserved-companion-features.py` before
any public frontend deployment. Until the Paper Studio owner has reconciled
the identified source differences in a CLEAN latest canonical descendant,
the policy must return HOLD. Do NOT replace the 1,732-line live-derived
Diary module with a 261-line older component solely to fix Lesson Planning;
do not overwrite any other agent's dirty original worktree.

This independent companion guard is versioned, not a fixed-SHA deployment
ban. Owners can improve or intentionally replace the Diary/printing design,
then update the reviewed feature contract and its adversarial tests.
The final built index/chunk graph, protected backend guard and genuine Core
release certificates remain separately required.

## Product design contract — Independent Diary and Planning modes V4

Read docs/coordination/ASSPS_UNIFIED_DIARY_LESSON_PLANNER_V4_20261015.md
before modifying Daily Diary, Term Planner, Weekly Planner, Daily Lesson
Planner, student roster printing or the associated layout/typography controls.

Operational Daily Diary is a separate daily-use editor/library/print surface;
Term, Weekly and Daily Lesson Planning are separate planning document types
and must have independent Save/Reopen scopes. Do not misrepresent a Weekly-
derived Daily Student Card view as completed persisted Daily Lesson Planning.
Every printed subject heading must offer size + / -, visible numeric/slider
and Bold, and preserve saved styling and actual A4 PDF/print parity. Existing
Daily Diary controllers cannot disappear after unrelated frontend release.
The v4 UI contract, live companion contract, school tenant/RLS, real printer
and Core signed rollback gates must all pass before promoting frontend.
A legitimate future redesign may update reviewed versioned contracts/tests;
never hard-freeze one Git SHA or overwrite a newer owner dirty worktree.
