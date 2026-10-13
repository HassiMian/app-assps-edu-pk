# SaaS Core Teacher Exam Security — isolated candidate, not deployed

Date 13 October 2026. Reviewed base Core owner SHA `224fee87b880bbbc31fbeb15401aff5db350d41a` at new independent worktree `assps-core-exam-teacher-scope-qa-20261013`; no other agent worktree or production source changed.

## Exact fixes

- Distinguish privileged exam/grade definition management (`principal`, `admin`, `super_admin`) from assigned Teacher Marks submissions. Teachers must not POST/DELETE arbitrary exam definitions or PUT grade settings.
- `/api/portal/teaching-options` now requires school-bound actor and exact active `teacher_class_assignments` with case-normalized class/section match; missing/unassigned teacher sees no roster. Blank `tca.section` does not become a wildcard. Principal/admin can see only their verified school cohorts.
- Marks inputs preserve real numeric zero; null, empty, whitespace, boolean, absent and malformed values no longer coerce to zero using JavaScript `Number(...)`. Bounds validation remains in `examRoutes.js`.
- Existing Core owner `examMarksTeacherScope.js` write/read authorization stays untouched. No teacher assignment inserted and no official result mutated.

## Independent QA

Actual Node `--test` cohort source/security + previous teacher Marks scoping/HTTP suites: 11/11 pass, zero failures, Node syntax checks pass. Private owner-only read-only production SQL transaction: scoped unassigned Teacher cohort count 0; school general cohorts 13; rolled back. This is NOT authenticated Teacher HTTP acceptance.

## Required further gates before release

1. Reconcile this source onto the latest canonical Core backend SHA; deployed runtime file differs from base and must not be overwritten.
2. Tests must cover actual restricted login signed runtime/tenant peer denial, not only synthetic scope tests; do not bypass RLS.
3. Official exam-subject policy must be approved and defined by school Principal; e.g. Exam9 class/subject totals 25, 50 and 100 coexist. Connect source `6f2437312c4f2bc500b5a55900cc922f20c8ad2e` fail-closes absent subject maxima. No Core policy endpoint/database approvals exist yet.
4. Authorized approved Teacher–Class–Section–Subject register required: current produced register has 49/49 decisions marked Unreviewed, 0 assignments in DB. Do not publish approximate names or alias Fatma/Fatima or absent Miss Asma.
5. No Teacher Marks save until genuine staff login/first-password rotation, unauthorized-peer denial, separate full frontend/backend rollback and actual Exam9 Save->Reload->Result Card acceptance. Preserve all existing results and zero rows.

Current release certificate: ISOLATED SOURCE QA PASS; PRODUCTION CUTOVER HOLD.
