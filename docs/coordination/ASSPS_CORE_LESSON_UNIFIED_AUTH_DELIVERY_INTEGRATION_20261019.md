# ASSPS Unified Lesson Planning — Core authentication + teacher-delivery integration checkpoint

**19 October 2026 PKT — ISOLATED SOURCE ONLY, NOT DEPLOYED, NOT A PRODUCTION CERTIFICATE.**

## Provenance and workstream preservation

- Clean integration source `integration/core-lesson-identity-delivery-20261019` is built from `test/core-lesson-first-password-journey-20261018@c9914fca80885cf0b27ee6364a09fffab9c51f9a`, which descends from the `feature/core-lesson-session-recovery-20261018@8d332e8d704cd7678736596bb2e1c9c90555e158` Core frontend recovery patch, which descends from the protected `fix/assps-lesson-release-evidence-20261018@7ae9d6f724390785db3091453509bf636381ffac` source.
- Exact reviewed Core backend authorization and read-only teacher-delivery changes: 15 files copied into a DIFFERENT worktree from `feature/core-lesson-auth-school-scope-20261018`, whose original uncommitted worktree and files were never modified; 15/15 source SHA256 matches reconfirmed after testing.
- Paper Studio and Grade IX–X academic provenance are not overridden; active untracked ARGUS paper JSON artifacts created during isolated backend startup were neither staged nor deleted.

## Functional scope

- Core frontend: existing 15-minute access JWT can refresh with identity-bound single-flight handling and safe GET-only replay; POST/PUT/PATCH/DELETE (marks, fee, diary, papers) must never auto-replay after ambiguous write. Network/5xx does not clear saved drafts; rejected/forged identity fails closed.
- Lesson UI: visible class context/saved list errors, retriable reads, durable successful Save ID/revision even when saved-list refresh fails, and no accidental duplicate writes.
- Core backend: explicit school login and reset school-identifier checks fail closed, no fallback to another school on unknown/mismatched context. Principal-only, read-only, no-store lesson delivery-readiness endpoint; teacher and peer tenant cannot retrieve readiness evidence. Teacher entitlement requires a real same-school user and employee link, active reviewed class+subject assignment, and separately approved academic source; synthetic/planned assignments never create an automatic grant.

## New independently rerun tests, with scope

- Integrated Core backend mocked security/policy tests: **59/59 PASS** (includes School2 denial, malformed school code, role-gated aggregate read-only endpoint, publication guards, private Principal source).
- Teacher-assignment Python source/policy tests: **14/14 PASS**.
- Core refresh synthetic HTTP: **12/12 PASS**.
- Real database-backed Principal private Lesson HTTP and academic publication protection in throwaway PostgreSQL 16: **17/17 PASS**, no real school data copied.
- Separate actual Express + Chromium teacher first-password-change login E2E: **1/1 PASS**. Verified mandatory change route, Paper Studio pre-change denial, change on disposable PG user, new-password hash, old-password rejection, authorized post-change module access.
- Separate actual Express + Chromium two-school Teacher/Diary/Paper/lesson Save, Reopen, Revision and PDF tests: **1/1 PASS** including peer-school/same-school other-teacher denial and stale revisions.
- UI Lesson context failure/retry and Save-success/list-refresh-failure browser tests: **2/2 PASS**.
- **106 total bounded automated tests PASS, 0 FAIL** across the above suites; counts are test cases, not 106 independent production user journeys.
- ESLint changed frontend/test source PASS, Vite production build PASS, original Paper templates 6/6 unchanged, Node syntax checks PASS, `ops/production-safety-check.js` PASS, Git diff whitespace check PASS.
- Tests that used real SQL were run **only in `pg_virtualenv` synthetic DB** and each disposable cluster was destroyed. No live authentication credentials used.

## Production prerequisites still HOLD

1. Real school live browser login/password-change acceptance for 17 existing first-change teachers, WITHOUT resetting or exposing anyone's credentials. Synthetic E2E does not prove teachers currently log in successfully.
2. Independent timetable provenance: School1 six-day timetable 336 teaching slots; 54 unique teacher/class/section/subject proposals across 12 same-school linked employee/user IDs, **12 simultaneous teacher-period overlap groups** and new rows citing older 14-Oct source SHA rather than approved 16-Oct PDF. No teacher_class_assignments exist. Proposals are review-only, not privilege grants.
3. Academic lesson source corpus **59 records review-blocked**, student-specific term/weekly publication **0 shared of 3 saved plans**. Paper Studio and Grade IX–X approval cannot be invented or bypassed.
4. Real principal/teacher/School2 browser + Urdu RTL/Jameel Noori A4 print acceptance, physical Ricoh witness, and grade-specific source approval pending.
5. Signed PostgreSQL runtime catalog **82 vs 77 guard-count discrepancy**, legacy role exposure, and complete peer-school RLS review unresolved. Strict flag MUST remain off on production.
6. Offhost independently restorable encrypted backups for both PG clusters and exact rollback/release ancestry; local two-cluster critical backup checksums PASS but not equivalent to offsite DR certification.
7. Live school branding endpoint returns HTTP404, compiled live frontend hash `2aa5a1b56a81c550b7fadfd028884503aa454740d68e5255212ce26ab2719408`, still old. No deployment permission inferred from source tests.

**Release gate: HOLD.** Do not merge/deploy automatically. This commit is intended for one source review/approval path coordinated on GitHub Issue #4, with least privilege and school record integrity intact.
