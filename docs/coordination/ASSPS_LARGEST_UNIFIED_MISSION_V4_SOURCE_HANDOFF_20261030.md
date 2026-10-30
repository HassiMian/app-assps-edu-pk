# ASSPS Largest Unified Mission: V4-safe Lesson Planning source-review handoff

**Prepared 30 October 2026. SOURCE ONLY, NOT RELEASED.**

## Scope and immutable constraints

This candidate was branched from audited V4-safe Core review commit `e31b3f2880d029f2abd31aee6833e08040b6cf00`, which includes the six pre-reviewed Grade Eight Second-Term + signed historical-marks revisions. It cherry-picked the two 29 October school 3-up Lesson Planning commits, without touching the **currently LIVE Paper Studio V4 asset**. It does not authorize editing grades, changing students, loosening RLS, impersonating roles, resetting passwords, or deploying the old Core build.

The user-approved **private** all-students print PDF remains SHA256 `53d61f68306e6368b6e8544ca35effa5d18b187f91aea03e8a876670fb008519`, 302 student cards on 104 A4 LANDSCAPE sheets (3 PORTRAIT-style cards per sheet). **Do not commit or publish the PDF or student names/GRs.** The source prints using authenticated `/api/students` and the saved class term plan, not fake identity data or inferred marks. Jameel Noori Nastaleeq is the preferred local Urdu font but is NOT bundled; if the rendering workstation lacks it, the print's typography is NOT a certified exact-Jameel render.

## Additional focused source fixes (30 October)

1. `studentTermDiary3Up.js`: term/section/class guard, Starter–Seven allowlist, class-specific subject completeness, A/B assessment-source separation, teacher-source extra subjects preserved, real-calendar date validation, duplicate assessment slots denied, five date cells per subject, text/HTML escaping, false GR/MIG label avoidance, active student filtering, print-layout overflow preflight.
2. `DailyDiaryWorkspace.jsx`: never silently rewrite a *term* lesson plan as `daily` through Diary Save, Smart Paste or daily auto-generation; print only when a current class roster loaded successfully; invalidate old/stale roster on API failure; `active=true` on GET `/api/students`. Preserves the original normal Daily Diary Print control and its previous layout.
3. `lessonPlanRoutes.js`: class alias read-only search (`5`/`Five`) and date-range overlap lookup for existing weekly and term plan (`plan_date <= requested date <= end_date`), while preserving **school_id**, authored-document and role guards. No migration, write handler or RLS bypass introduced. The separate historical `Primary` plan is NOT guessed into another class.

## Verified QA, bounded by evidence

- 48/48 frontend unit checks including subject typography and weekly engine: PASS.
- 41/41 backend SAFE static and mocked checks: PASS. Deliberately excludes the integration HTTP fixture that INSERTs into a configured school database; genuine tenant-account acceptance must use authorized isolation.
- 6/6 actual Chromium print geometry checks: PASS (Starter, Mover, Three, Six, Seven and fail-closed 10-subject overflow).
- Full Vite frontend bundle build: PASS. New print module ESLint: PASS. Existing `DailyDiaryWorkspace.jsx` inherited a pre-existing React refs-in-render lint error from the 22 October baseline (not introduced in this patch).
- Live unmodified Paper Studio V4 isolated VM strict numeric and canonical merge tests: 17/17 PASS, SHA256 `2fef72105e31be2beec25ff8f09f316f2fdaf25e9ead97f2d9aeeff848b2a751`.
- Protected 1,855 exam-record SHA baseline: PASS; zero SQL writes in this review.
- 30 October daily critical **on-host** backup service: SUCCESS; four SHA256SUMS files PASS (PostgreSQL 5432/55432 dumps + live app/config archive + vault result), directory `assps-critical-20261030T013502Z`. **Not an encrypted independently-restored off-host certificate.**
- CDN private cache HEAD/GET 30-site scan: cached private HTTP200 count zero, static tests 27 PASS; authenticated provider purge and global POP source-pinning still HOLD.

## Outstanding authentic gates

Owner GitHub review + write/merge authorization, Principal/Teacher Save–Reopen–Edit–Print in authenticated accounts, independent School2 access-denial witness, original teacher/source approvals (including live 10-class Second Term plan storage), 11 historical marks decisions, independently encrypted and decrypted off-host PostgreSQL globals/roles/ACL restore, signed current-V4 release manifest and rollback/cutover. DO NOT mark these green based on source tests. User-facing offline PDF is already ready for school printing; this code candidate is **not** yet on live SaaS.

## Safe owner review

Review the bounded commit difference against the V4-safe base, replay the patch into a clean detached Core worktree, run listed tests, compare live V4 asset hash and the 1,855 exam-row SHA guard, and require authentic owner deployment permission + staged tenant acceptance + rollback attestation. Never substitute a sourceless PDF import for a genuine teacher-approved `termCoverageRows` document. No production deployment was requested/authorized through this review identity.
