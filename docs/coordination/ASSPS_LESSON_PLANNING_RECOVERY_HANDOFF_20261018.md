# ASSPS SaaS Core + Paper Studio — Lesson Planning Recovery Checkpoint

**Date:** 18 October 2026. **Status:** SOURCE QA & operational diagnosis; **NO PRODUCTION DEPLOYMENT.**

## Ownership and immutable controls

- Paper Studio Master owns Lesson Planning Workspace, Daily Diary/Weekly Notebook, Term Planner, print/export and all academic source content and approval.
- SaaS Core Master owns identity, tenant/RLS, employee permissions, lesson-plans API/storage, deployment integration, availability, rollback and final certification.
- Do not publish 59 academically blocked original-source candidates or infer teacher grants from display names.
- No changes to production users, grants, papers, students, result marks, attendance, lesson plan payloads or services during this checkpoint.

## Independently verified live findings

1. `app.assps.edu.pk/login` HTTP200 and `api.assps.edu.pk/health` HTTP200. Some recent server logs demonstrate **actual successful** auth login HTTP200 and principal private lesson-source GET HTTP200; some other requests to `/api/auth/me` returned HTTP401, which alone does **not** demonstrate invalid valid-credential login. An anonymous GET `/api/lesson-plans` HTTP401 is intentional.
2. `public.lesson_plans` in live apexos/School1 has **3 total** Term Plans: one class 5, one class 6, one Primary. All three owned by teacher-role account(s); **0 marked sent_to_portal**. The manager LIST sees school plans, teacher LIST scopes `created_by=req.user.id` (not all institution plans).
3. Of **19 active teacher user accounts**, **17** have `paper_generator` in their stored `permissions`; **2** do not. `/paper-generator` requires `academicStaff` role and this permission in `App.jsx`. Do **not** grant automatically: independent teacher assignment and policy verification required. The real School1 `teacher_class_assignments` table has **0 active rows and 0 linked teacher user accounts**; neither missing-paper-permission user has an active class link.
4. The authentic principal-only school source bundle `/root/secure-archive/composer-review-20261014/manifest_plus_classone_private.json` SHA256 `4d2ccdce5ec644750a530c890df5a0a41eaee5b76f1e4ba47d912617db5c0cda` contains **59 original candidates, 59/59 review-required, 59/59 publish BLOCKED, 0 approval signatures, and Class One 18 visual-review weeks**. It is **not teacher-publication-ready**. The later Paper Studio source has **51 active subject rows in 10 classes**, six A/B merges, and exclusions Class Eight Urdu and Pre-Nine Islamiyat; source details must remain intact and teacher statements professionally revised only by the Paper Studio owner.
5. New `GET /api/school/public-branding?school_code=assps` exists in canonical source and is verified in mock tests, but remains **HTTP404 on live backend**, demonstrating frontend/backend release mismatch and generic login branding fallback. Branding 404 is not itself proof that every valid login fails.
6. `LessonPlanningWorkspace.jsx` currently handles initial `listLessonPlans({limit:200})` failure with a swallowed `.catch(()=>{})`, and planning-context failure with a silent `setContext(null)`. Teacher may see empty content without error. Paper Studio should render explicit actionable 401/403/404/503/session/retry states and avoid treating stale data as success.
7. Backend `lessonPlanRoutes.js` uses tenant transactions; unsigned legacy GUC mode remains separately known insecure for strict future signed-RLS production enablement. No bypass or live RLS flag flips authorized.

## Reproduction QA

- Isolated principal-only Chromium `weeklyNotebookBrowserQA.mjs` **PASS**: synthetic principal/synthetic students; source import, Save→Reopen, A4 PDF (~125430 bytes); no real DB writes.
- Isolated `termPlannerBrowserQA.mjs` **PASS**: protected page spans, six subjects, revised term draft, Save→Reopen, A4 PDF (~41186 bytes); no real DB writes.
- `plannerABBrowserQA.mjs` original test line 63 incorrectly expects one global term English row while five synthetic student term sheets generate five such rows. Verified with **temporary QA-only test copy**, expected 5 and all remainder Chromium assertions PASS: Class One–Three A/B, 10 classes/51 subject rows, and student cards 2/3/4-per-sheet print pagination. No product code change and temporary copy removed. **Paper Studio owner** should update permanent assertion to one canonical subject per student sheet, not one globally.
- `node --test al-siddique-backend/src/tests/public-school-branding-login-20261017.test.cjs`: **3/3 PASS**; `node ops/production-safety-check.js` **PASS**.
- Additional broad backend lesson HTTP test command produced 34 passed/4 failed owing to **missing Express dependency in isolated worktree**. Inspection found some test files perform test-user/school SQL INSERTs and DELETEs. They MUST NOT be re-run with live DB `NODE_PATH`; use properly isolated PG16 synthetic database and safe inject fixture. Do not treat missing dependency as proven production logic failure.

## New SaaS Core read-only readiness gate

- `ops/release/lesson-planning/lesson_readiness_gate.py --live`: production `BEGIN READ ONLY` aggregate counts and anonymously accessible HTTP response code checks, plus SHA-pinned private manifest metadata only. No personal information, source text or secrets printed.
- Current exact five blockers: `ACADEMIC_PUBLICATION_HOLD`, `NO_SHARED_LESSON_PLANS`, `TEACHER_MODULE_PERMISSION_REVIEW`, `TEACHER_CLASS_ASSIGNMENTS_MISSING`, `PUBLIC_BRANDING_ROUTE_NOT_LIVE`.
- `python3 ops/release/lesson-planning/test_lesson_readiness_gate.py`: **7/7 PASS**, synthetic values only.
- Even if four blockers clear, `REQUIRES_AUTHENTICATED_ACCEPTANCE` remains until actual teacher/independent peer-school actor tests.

## Ordered unified release mission (no disconnected deployments)

1. **Paper Studio owner:** Repair observable load/errors in diary/weekly/term workspace, correct A/B personalized-print browser test assertion, protect original 59-source/51-active and 18 weeks; do not invent chapter/page facts; keep 59 candidates unpublishable until per-source academic approvals.
2. **Core owner:** Verify 2 missing paper-generator permissions versus authenticated employee/teaching assignments and whether role restrictions are intentional. Never globally grant access; test authorized teacher vs peer-school denial.
3. **Core + Paper joint:** Validate source bundle principal-only; create reviewed/signed teacher-visible subset, recipient-specific access to approved plans, and explicit teacher receipt/download. Private review drafts are not public publications.
4. **Core release candidate:** Integrate exact newer source ancestry (live release SHA unattested), public-branding endpoint, lesson backend/role/RLS compatibility, privacy. Keep Timetable and Notice Studio candidate protected.
5. **Authentic acceptance:** Reproduce login, lesson load, Save→Reopen→Print and bilingual A4 quality with real authorized teacher/principal, plus School2 denial and protected marks/Diary/Paper regression. Never report mocked Chromium as real teacher access.
6. **Final release:** signed tenant migration compatibility, backup/rollback/provenance and deliberate controlled cutover **only when no-deployment instruction is superseded by explicit release authorization**. Existing user instruction remains **DO NOT DEPLOY**.

Branch preserved: `feature/core-official-timetable-notices-20261018` at base `41b71d8e3b0cb1501eebf40a4c99d7c75733a20d`. This file is a Core coordination artifact, not Paper Studio source modification.


## Late production drift and timetable/lesson interaction (18:22:39 UTC)

At 18:22:39.767469 UTC, **another concurrent workstream inserted 347 School1 timetable rows**; this SaaS Core Lesson audit did not run any production DML. Live total changed from **58 historical** (all remain) to **405**. Six weekday profiles (Mon–Sat including Friday) now each contain 56 teaching rows; other school-wide entries total 11 (Friday lacks break). The new daily rows claim `staff_identity_reviewed=true`, but **teacher_class_assignments still has 0 active/total rows**, so verified timetable teacher display is not sufficient to authorize teacher receipt of curriculum.

New Core read-only `ops/release/timetable/audit_daywise_reconciliation_readonly.py` compares all 336 daily teaching slots against SHA-pinned 16-Oct final approved print source:
- 0 missing slots, 0 duplicate keys, 0 bell timing differences;
- **6 minor staff-display divergences**, all Class Nine/Fatima Period Seven: approved PDF says **Sir Fida-ul-Rehman**, new day rows say **Qari Fida-ul-Rehman**. Same account may be intended, but independently confirm rather than automatically conflate titles;
- all **336 daily teaching rows** carry the older 14-Oct `source_sha256=263941c6...` instead of final printed PDF `9ac81002...`. Cannot assert authenticated PDF provenance on these rows;
- original 58 Regular rows remain unmodified, including 08:15 old bell slots.

Synthetic source comparator tests `ops/release/timetable/test_daywise_reconciliation_readonly.py`: **5/5 PASS**. **DO NOT** revert, duplicate-import, grant teachers, publish lessons, edit other agents' worktree, or claim final authorization without confirming this external actor's live import origin and retention of correct history. GitHub central Issue #4 concurrent-drift comment #6253506637. No deployment by this mission.


## Permission-scope correction after live day-wise import

A second 18-Oct read-only join of the **new Monday timetable** against real users and employees confirmed **56/56 teaching slots point to active teacher-role users and active employee rows**, **12 distinct teaching user accounts**, and **all 12/12 actually scheduled teachers already have the paper_generator permission**. The other two active teacher-role accounts missing the permission have **no current scheduled teaching slots and no active teacher_class_assignments**, so they must not be granted permissions just to make 19/19.

Two same-teacher, same-period Class Four/Five pairs appear in the approved Monday source: **Period Five English** and **Period Eight Nazra**. Treat these as combined-class teaching candidates requiring actual school room/policy attestation, not automatically as conflicts or cross-class data leaks.

The Lesson readiness gate now blocks ONLY if an actually scheduled teacher lacks paper permission. Current blocking findings are five (not earlier provisional six): ACADEMIC_PUBLICATION_HOLD, NO_SHARED_LESSON_PLANS, TEACHER_CLASS_ASSIGNMENTS_MISSING, TIMETABLE_STAFF_IDENTITY_NOT_CERTIFIED, PUBLIC_BRANDING_ROUTE_NOT_LIVE. `python3 ops/release/lesson-planning/test_lesson_readiness_gate.py` **9/9 PASS**. School1 still has zero formal active teacher-class assignments, so there is no teacher-specific approved lesson delivery certification. No grants or publications by this mission.
