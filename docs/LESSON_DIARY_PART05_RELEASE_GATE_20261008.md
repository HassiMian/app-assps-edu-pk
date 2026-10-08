# ASSPS Cognitive Lesson Planning and Daily Diary Studio — Part 05 release gate

Status: **CANDIDATE READY FOR ISOLATED DATABASE CERTIFICATION; NOT DEPLOYED**.

## Source reconciliation

- Previous development checkpoint: `b703d0c013012cf1d8d3547978cc1dc762c878eb` on `feat/lesson-diary-cognitive-20261008`.
- Verified live frontend at assessment: `9fe7b560f879a8193171e7588abf1f744256298e` (2026-10-08T12:34:38Z).
- Verified live backend at assessment: `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9` (2026-10-08T09:48:57Z).
- This forward-port starts from the verified newer frontend lineage `9fe7b560` and cherry-picks only the missing least-privilege `lessonPlanningContext.js` settings-read guard from `b703d0c`.
- The existing frontend Cognitive Lesson Planning, Daily Diary, Paper Workspace, Question Bank and scoring features have not been overwritten.

## Completed isolated candidate verification

- `npm ci` completed for frontend and backend dependency trees using checked-in lockfiles.
- New Lesson Planning / Daily Diary browser acceptance: **2/2 PASS** (including multi-subject planning, save/reopen, student card personalization and A4 card counts 2/3/4/5/6/8/10).
- Cognitive engine + architecture contract tests: **7/7 PASS**.
- Added `lesson-planning-settings-privilege.test.js`: **3/3 PASS** for unreadable, readable, and absent `settings` table in a mocked database context.
- Nested scoring and official Paper Workspace routing browser regressions: **2/2 PASS**.
- Urdu Paper Workspace + canonical DOCX browser regressions: **11/11 PASS**.
- Static RLS and protected DOCX/mathematics projection tests: **17/17 PASS**.
- Early Years + Lesson Plan browser tests: **13 PASS**, with a *separate* real-auth teacher/print suite blocked during module initialization (missing `al-siddique-backend/node_modules/pg`).
- Frontend production build: **PASS**. Production safety script: **PASS**.
- Unauthenticated live planner context, generation, and Daily Diary routes each returned HTTP **401**; this establishes only the expected no-token behavior, not authorized production acceptance.

## Mandatory release gates on HOLD

1. Disposable PostgreSQL **schema-only** clone and real-schema HTTP tests (`lesson-planner-cognitive-http`, `lesson-planning-cognitive-http`, `daily-diary-layout-http`) were **NOT run**. VPS command for guarded temporary role/database creation was blocked by the execution safety control. No live records were used as test fixtures.
2. Run authenticated teacher / restricted database role / RLS and cross-tenant isolation on an authorized disposable clone. The extra teacher save/reopen/print acceptance requires its exact isolated test-db naming convention and backend-level `pg`/`bcryptjs` dependency path; do not point it at `alsiddique_db`.
3. Real printer physical-output inspection, long Urdu/English overflow and full PDF-page parity remain unverified beyond the current browser CSS and A4 counts.
4. Authorized production deployment, logged-in browser acceptance, runtime/source parity and deployment rollback execution remain **NOT VERIFIED**.

## Deployment decision

**HOLD.** Do not deploy a stale branch or claim full product certification. Release only after completing the isolated database/RLS and print gates. On failure, preserve current live frontend `9fe7b560` and backend `16ab8f3`; use normal backup/rollback procedures, not an uncontrolled overwrite. No production changes were made in this continuation.

## Official curriculum source triage (8 October 2026)

These are **discovery/authority references**, not proof that a specific ASSPS class, term or school textbook uses their contents:

- National Curriculum Council notifications: https://www.ncc.gov.pk/Detail/ODQzMmE3YTAtMmFkYy00NGM0LTk2YmItNjg4ZmNiNjMwOTMw — lists National Curriculum notifications, including a 31 July 2026 Grade 9–12 rationalization entry. Verify the notification text, subject scope and Punjab adoption before applying it.
- Punjab PECTAA Curriculum and Compliance: https://pectaa.edu.pk/curriculum-compliance/ — lists distinct annual-exam smart syllabi, textbook editions, curriculum links, and Grade 9/10 resources. Annual Examination 2026 coverage is **not** automatically a 2026–27 academic-session teaching plan.
- PECTAA Books and Publications: https://pectaa.edu.pk/books-and-publications/ — official textbook discovery, but school-approved Oxford and other book mappings must be separately checked.

Policy: attach authority, edition, session, class, subject, board, source URL and reviewed chapter/page evidence to approved resources. Keep provisional SLO/chapter suggestions flagged for teacher review; do not infer holidays from subject curricula or treat Question Bank source text as approved academic evidence.
