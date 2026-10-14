# APEX Connect — Teacher Login + Confidential Report Cards: Unified Release Candidate

Status: SOURCE INTEGRATED, BUILT AND TESTED. **NOT PRODUCTION DEPLOYED / STAFF E2E NOT VERIFIED**.
Coordinator: HassiMian/app-assps-edu-pk issue #4. SaaS Core owns final production release.

## Exact standalone Connect Next.js source

- Parent: bafebdbaef7170009990e42a329546c5fea57c14
- Source branch: fix/connect-auth-reportcard-integrated-20261014
- Exact committed source SHA: 1db504e3020c58aa005db1876b3a223a2770249f
- Combined descendant of the verified teacher-login/temporary-password fix b231fa7808f512b0ea71d91572ba81dda88fe7c2, authenticated HTTP QA 221d5c72a164220cdcc111153636b4bc34699ca0 and the independent report-card HOLD fix c1bee801d32f39a7f3016f9d582aee0a85ce6465.
- All six touched source/test files are in APEX_CONNECT_AUTH_REPORTCARD_INTEGRATED_20261014.patch; SHA256 8b1ea6d1ea1011a1b3b55985e2c4de609fc79bbe8d0f92a79ed57dd83f007d54.
- **Verified clean replay:** git apply --check on an isolated worktree at bafebdb PASS, source worktree clean. The GitHub patch is intentionally a coordination artifact because the monorepo al-siddique-frontend is Vite and this is a separate standalone Next.js project; never copy this patch into Vite paths or cherry-pick unrelated full-tree changes.

## Verified actual build and regression results

- Optimized Next.js 16.2.6 complete (build exited 0), .next/BUILD_ID **Fv6zSgsgqL-I571TupXRH**, 103-route build family, external link normalization PASS, exact renderer source hash attestation PASS.
- Standalone tsc --noEmit PASS after expected generated build provenance step.
- Paper Studio cross-stream boundary PASS.
- Focused regressions (verified in the same clean integrated source): temporary-password login-session boundary 6/6; release-unapproved report-card preview 3/3; Connect host/session security 9/9; postlogin redirect 19/19; role-bound teacher route 3/3; stale logout/relogin epoch 2/2; logout fallback 3/3; safe auth path query 12/12 = **57/57 PASS**.
- Separate source branch 221d5c7 has prior actual isolated Next HTTP+disposable PostgreSQL signed-teacher login/password-change **14/14 PASS**, but this is *not real school staff or live accepted browser print* and cannot be counted as such.

## Actual independently checked LIVE system

- Live Next Connect /var/www/apex-connect/.next/BUILD_ID **XI7EvxpUMkKOxK5ByM2BH**, not this candidate.
- Live anonymous /dashboard historically 307 to /admin (misrouted) whereas canonical source auth middleware routes to /login?next=/admin; no signed teacher login validation in this candidate run.
- Live /teacher/assessments/report-cards returns 302 to Login. The page guard renders DRAFT preview and does not project uncertified grade letters after this source patch; no official results are mass-changed.
- School Exam9 live 1,762 marks/213 real numeric zeros as of run. Active official teacher assignments 0, school signed academic approvals 0, approved First Term maxima 0/81, school-wide official full signed RLS traffic still shadow-only; original 301 marks and 36 genuine zeros protected.
- No principal/teacher credential extracted/reset; no JWT forged. No production PM2, Nginx, PostgreSQL, teacher marks, roles or academic publication changed by this source candidate.

## Core owned release steps (do not waive)

1. Verify current canonical Connect/standalone source HEAD and potential concurrent upstream changes; apply only missing patch hunks. Compare against actual live deployed Next.js compiled source and remove any extra pre-proxy /dashboard redirects.
2. Require real authorized staff login and password challenge via its own authenticated account, then verify /api/auth/me, correct teacher role and class/section/subject scope. Check unauthorized admin, cross-school access and revoked/expired sessions over real signed HTTP.
3. Require real Principal/Admin actor review and exact per-paper school First Term approved maxima; do not substitute five monthly paper-vault records.
4. Keep existing 40% pass policy, do not fake result-card grade labels, and preserve exam results 1,762/213 and Class Eight promotion rules.
5. Run genuine teacher Save only when authorized -> Reload -> entire-class Result Cards -> real browser OS Print Window; no fake marks.
6. Pin an independently controlled Ed25519 release attestor public trust root and obtain actual signed staff/peer-school/rollback receipts. RLS shadow 77+77 alone is not production certification.
7. Core production owner captures fresh signed current backup, tests restore and zero-risk rollback; canary with exact source and API; release only when every active gate passes. Record actual post-cutover BUILD_ID, owner approval events, full school isolation and browser acceptance in issue #4.

**Status: SAFELY PREPARED AND TESTED SOURCE; FULL PRODUCTION CUTOVER HOLD.**
