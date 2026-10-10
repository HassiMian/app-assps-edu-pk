# ASSPS Core — Marks Entry database structural readiness and actor school-ID binding (2026-10-10)

## Deployment boundary
This evidence does **not** authorize or certify live deployment. Separate exact deployed baseline backend `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9` was preserved. Scoped Marks Entry API release candidate `4aa4213294728c749186ab1533315a5bf1270953` was further hardened; this document accompanies the revised branch.

## New read-only direct production PostgreSQL SCHEMA evidence (no school/student marks queried or changed)
- Connected database `alsiddique_db` through authorized Hostinger manager `db_query`. All queries were introspection/COUNT only.
- `information_schema.columns`: `exam_results` includes school_id/exam_id/student_id/subject/marks_obtained/total_marks/grade. `teacher_class_assignments` includes school_id/teacher_user_id/class_name/section/subject/is_active. `exams` and `students` also have school_id and class.
- `pg_class`: all four `exams`, `exam_results`, `students`, `teacher_class_assignments` have `relrowsecurity=true` and `relforcerowsecurity=true`. `pg_policies`: on all four, `apex_app_runtime` has restrictive `app_runtime_school_guard` plus permissive school access.
- `pg_indexes`: exam results has unique `(exam_id,student_id,subject)` used by existing UPSERT; teacher assignment indexes on school+teacher+active and school+class+section+active exist.
- Important security limitation: inspection connected as existing `apexos_user` with `rolbypassrls=true` (NOT a restricted application actor). `apex_app_runtime` is `NOLOGIN` and `NOBYPASSRLS`; this is **not** the disposable restricted login required for signed JWT/tenant PostgreSQL acceptance. Do not misrepresent catalog metadata as live RLS actor proof or extract production credentials.
- Name-only lookup for exact school display name `al siddique scholars public school` returned **TWO** matching `schools` rows. School identity is therefore never established by name. Do NOT inspect/reconcile any school's students or exams through name or raw owner bypass; the verified authenticated actor and school_id binding must select the exact user-authorized tenant. No school row IDs or other tenant records disclosed.

## New fail-closed actor hardening
`examMarksTeacherScope.js` now rejects a teacher POST if `req.user.school_id` is missing, not a positive integer, or differs from the verified request school scope, even if a query/header `school_id` fallback was provided. Teacher results GET SQL requires BOTH an independent bound school ID predicate (`s.school_id = $...`) and the active school/class/section/subject teacher-assignment EXISTS. Principal/admin legitimate tenant-scope behavior preserved.

Tested against the actual production-base candidate using local synthetic Express HTTP router+isolated database doubles and pure guard tests. **9/9 focused tests PASS** after new actor school-ID negative cases; wrong school teacher POST rejected before SQL UPSERT, missing actor school claim resulted in DB query clause `AND 1=0`, existing assigned teacher GET/POST and principal flow PASS. Not real production JWT, teacher assignment or restricted PostgreSQL acceptance.

## Fresh external release gates
- Isolated signed test PostgreSQL endpoint 127.0.0.1:55432 accepts connections, but `CORE_SIGNED_TEST_KEY` and disposable test `DB_PASSWORD` remain unprovisioned; fail-closed restricted signed harness exits **2**. No authorization token or password forged.
- Seven-site Nginx cutover candidate source exactness PASS against rollback manifest SHA256 `a0bd6bcebb57f0b4831f49c15d38617f61b47bc7e8d95345a195da6445ea945a`, staged alias check and staged isolated `nginx -t` PASS. Live checker continues FAIL with five unsafe generic aliases across four sites. No live Nginx write/reload (earlier privileged cutover execution safety-restricted).
- Live frontend and backend artifact metadata remained `24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92` and `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9`; both independent marks release candidates have verified one-commit ancestry (backend now additional hardening commit). No production teacher/student/fee/marks/attendance modification.

**RELEASE_CERTIFIED=FALSE; SIGNED_REAL_NONBYPASS_E2E=BLOCKED; LIVE_UPLOAD_INGRESS=FAIL; MARKS_ENTRY_LIVE_FIX_DEPLOYED=FALSE; DEPLOYMENT_HOLD.**
