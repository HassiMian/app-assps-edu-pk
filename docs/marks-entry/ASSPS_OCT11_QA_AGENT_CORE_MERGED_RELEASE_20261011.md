# ASSPS Monday First Term Marks — QA Agent + Core integrated release checkpoint

**Production status: `RELEASE_CERTIFIED=FALSE; PUBLIC_DEPLOYMENT=HOLD`.** Prepared RC does not prove real signed-in school Principal/teacher browser acceptance on the *public* site. No live student results or academic subject rows were modified by this integration. No task scheduled.

## Independent QA source reconciliation
- Agent report token `ASSPS_MARKS_BROWSER_QA_BLOCKED`; exact remote QA branch SHA **`cd4c0bb76744b8285d08df683e0e8892c23fbe40`**, not the similar-but-incorrect pasted `cd4c0bb757...` ID. Verified QA branch changes were 3 artifacts only: standalone report and two privacy-redacted synthetic Chromium screenshot capture scripts. Core cherry-picked the complete QA commit onto the clean combined Core release via `cb10597c...`, with no edits to agent's worktree.
- Agent confirmed old live frontend (`24cbcae3`) lacks saved First Term exam selector, uses unsorted class names, uses empty academic setup subject catalog, and queries students with invalid prefixed class names. Staged source had candidate recovery; tests with synthetic actors passed but **not** actual public login.

## Actual live school catalog (read-only evidence)
- Saved `First Term Exam` id9, school1, TE, All Classes, session `2026-2027` exists. Never create a duplicate.
- **81 active** `exam_subjects` rows (section-scoped): Starter7, Mover7, Flyer7, One Blue6+One Yellow6, Two6, Three7, Four7, Five7, Six7, Seven7, Eight7.
- Current student enrollment aggregate: Starter45, Mover42, Flyer24, One38, Two31, Three29, Four17, Five23, Six20, Seven22, Eight0, Pre Nine11, Nine16. `Eight` has 7 exam subjects but no students; `Pre Nine` and `Nine` have 27 students but no corresponding exam9 offerings. This is a **real academic data gap**, not a software reason to invent subjects or silently move students. Core marks-only candidate may be considered for classes with valid catalog+enrollment once certified, with explicit unavailable/not-configured messaging for uncovered grades. School/Academic owner must separately confirm Nine/Pre Nine First Term subject plans.

## Core implementation and protection contracts
- Added shared `schoolClassOrder` comparer; central academic `activeClasses` and `classNames` now present real class names in Starter, Mover, Flyer, One→Eight, Pre Nine, Nine, Ten natural order (no merging Pre Nine into Nine). Marks Entry includes the official First Term classes even if `academic/setup` is partially empty and does not create exams or students.
- Added **optional** `GET /api/exams?include_subjects=1` under existing signed school-tenant endpoint. Only Principal/Admin/Superadmin/Teacher or explicitly scoped service may read; Student denied. Query uses authenticated `school_id`, saved exam IDs and active `exam_subjects`; returns section/class/order/subject details. Old `/api/exams` callers without flag retain original response shape; no new public Nginx location needed.
- Marks Sheet uses actual per-exam/per-class offerings first, deduplicating repeated same subject only in UI while retaining per-section database rows; for official First Term an empty authoritative list is a HARD missing-catalog state, never replaced by fabricated Grade Nine subjects. For ordinary older assessments with no `exam_subjects` rows, legitimate configured academic subjects remain available (regression prevented).
- Student search uses existing teacher/school-scoped exact class aliases, no unrestricted all-school roster fallback. Backend enforces teacher class/section/subject writes and tenant isolation; zero marks distinguished from blanks.

## Actual tests on integrated source
- Backend signed/teacher HTTP/tenant suite **17/17 PASS**; new actual Express HTTP contract checks opt-in student 403, signed-school query parameters, One Blue+Yellow section metadata and default backwards compatibility PASS.
- Source pure subject/class model tests PASS: First Term id9, canonical school class order including Pre Nine/Nine, partial academic setup, authoritative First Term empty Nine offerings, conventional assessment subject fallback, marks/zero and alias roster.
- Real Chromium synthetic fixture updated to use opt-in school/section catalog; saved exam9 selected, Blue+Yellow distinct source offerings yield correct unique visible subjects, alias roster and zero vs pending save/reload PASS.
- Nine premium Result Card mark calculations and real browser Result Designer print PASS; 25-student A4 PDF page count PASS; original six protected Paper template hashes PASS; changed-file ESLint EXIT0; optimized Vite frontend build EXIT0.
- New compiled private frontend preview at `/var/www/assps-firstterm-preview-da5a8a39`, **89/89 build files SHA256 match**. App-only synthetic full Nginx config parser PASS with this exact preview root and original `api.assps.edu.pk` Connect virtual host preserved bytewise; existing public `app.assps.edu.pk` still old.
- Live 77 restrictive+77 permissive signed policies, private managed green `127.0.0.1:5091` health200, anonymous GET `/api/exams?include_subjects=1` HTTP401, existing old app/API HTTP200; protected pre/post-signed backups independently restored to isolated PostgreSQL earlier. Green PM2 alone restarted to pick up new backend source; no legacy/Connect restart intentionally performed in this stage.

## Missing final certification/rollout
- Real logged-in Principal/teacher school account browser approval and roster/marks acceptance, including authorized student/class/section under school1, saved subject catalog and nine Result Cards; do not ask user to disclose passwords/JWT/student identity. The existing Principal screenshot is genuine login evidence but cannot be injected into private agent Chromium sessions.
- Controlled reversible cutover ONLY of `app.assps.edu.pk` frontend root and approved Marks-only paths via dedicated signed green backend, under latest current-source ancestry, change freeze and monitored 200/401/school-role checks; preserve Connect `api.assps.edu.pk` and all legacy SaaS modules. Stop/revert immediately on any unexpected redirect, auth/tenant leak, downtime or missing enrollment data.
- Grade Nine and Pre Nine academic offering approval is a **separate specific scope gap**, not grounds to claim those cohorts are operational or to block verified Starter–Seven workflows without a documented partial release boundary.

**Current verdict: `SOURCE_QA_AND_PRIVATE_STAGE_PASS; PUBLIC_RELEASE_CERTIFIED=FALSE`.**
