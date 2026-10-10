# SaaS Core — First Term Marks Entry: server-side teacher assignment authorization and split release

**Date:** 10 October 2026. **Status:** isolated candidate, tests PASS, **production NOT deployed**. Issue #4 remains the coordination authority.

## Provenance
- Marks Entry frontend source parent: `54121d7f93012c27cb7fe0491a53ccd56d6990c3` (actual Windows Chrome showed current live subject selector empty for Class One; source fix restored exact official 75-paper/11-class subject lists).
- Verified live frontend artifact: `24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92`. Verified live backend artifact: `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9`. Both are ancestors of the Core source. Production source must not be overwritten from an older worktree.
- Exactly one inherited backend `examRoutes.js` change between live backend and source parent (two columns: `student_class` and `student_section` added to detail GET). Future component releases must have independent exact ancestry and rollback.

## New actual API authorization defect and fix
The existing `/api/exams/results` POST checked only that students/exams belong to the same tenant, allowing any teacher with `canManageExams` role to attempt marks against **any** class/subject within that tenant. Result GET route built `portalStudentScope` for parent/student but returned an **empty teacher scope**, risking a teacher reading another classroom's scores.

- New Core-only pure guard `services/examMarksTeacherScope.js` enforces school, active assignment, teacher ID, class, section and subject; validates candidate exam's class against each student. It checks actual DB-backed assignment rows inside the existing marks write transaction, before any UPSERT. Batch fails atomically with HTTP403 and `EXAM_MARKS_TEACHER_ASSIGNMENT_REQUIRED` when even one result lacks assignment. Principal/admin roles still use original existing tenant scope.
- All three teacher read routes (`/results`, `/results/:exam_id`, `/student-results/:student_id`) now use parameterized SQL teacher-class+section+subject `EXISTS`. Missing teacher ID fails closed. Role checks, parents/student scopes and existing transactional, tenant/RLS gates preserved.
- Deliberately does not relax existing `teacherStudentScopeClause` in student roster; exact class/section assignment compatibility remains. Any mismatch requires legitimate assignment data correction, NOT privileged teacher escalation.

## Executed tests
- Pure teacher-scope role/class/section/subject + same-tenant positive and six-negative checks: **4/4 PASS**.
- ACTUAL Express HTTP router and transaction execution under fully synthetic isolated DB/auth doubles: **1/1 PASS**, including read queries embedding exact assignment predicate, valid assigned teacher POST COMMIT, six forbidden teacher POST 403 with **zero** unintended SQL UPSERTs and ROLLBACK, principal path not blocked. This is **not actual signed PostgreSQL E2E**.
- Combined backend source tests (teacher scope, HTTP, First Term schedule, Core static signed context & permission): **25/25 PASS exit0**, `/tmp/assps-marks-auth-integration-backend-20261010.tap`.
- Exact combined frontend source pure First Term parity and real Chromium UI synthetic API PASS; official 75-paper/11-class source mapping, restored subject selector, student class alias matching, saved mark preserve, edited-only zero, invalid total, no duplicate exam and failure mode remain protected.
- Frontend focused ESLint PASS and optimized build PASS exit0 (`/tmp/assps-marks-assignment-candidate-build-20261010.log`), six original result template integrity fixtures PASS.
- No actual live marks, teacher session, hidden credentials, PostgreSQL school data, Nginx or PM2 touched by tests.

## Gates and component release requirements
- Fresh signed restricted PostgreSQL/JWT/RLS test preflight **EXIT2** because approved disposable SCRAM actor/test credentials absent. Live Nginx private uploads checker **EXIT2** (5 unsafe generic aliases across 4 sites). Both remain hard NO-GO.
- Any controlled release must independently stage **frontend hotfix on current verified live frontend ancestry** and **backend security guard on current verified live backend ancestry**, retest exact bundles and check protected module regressions before backups, authorized promotion, live HTTPS/browser/role tests, rollback & certification. Never deploy entire noncanonical old branch or silently combine with Paper Studio/Academic/Connect unpublished changes.

**Verdict:** `API_TEACHER_SCOPE_SYNTHETIC_TESTED=PASS`; `REAL_JWT_TENANT_RLS=BLOCKED`; `LIVE_MEDIA_INGRESS=FAIL`; `PRODUCTION_MARKS_ENTRY_OPERATIONAL=FALSE`; `PRODUCTION_RELEASE=HOLD`.
