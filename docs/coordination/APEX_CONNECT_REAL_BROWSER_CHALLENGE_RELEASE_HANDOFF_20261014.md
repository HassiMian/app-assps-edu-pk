# APEX Connect teacher temporary-password browser redirect — verified recovery

14 October 2026, GitHub coordination issue #4. **Connect Next.js source only**, NOT SaaS monorepo Vite frontend; no live deployment.

## Verified new diagnosis: real Chromium caught a bug missed by earlier synthetic HTTP checks

Independent production-built Connect source 1db504e3020c58aa005db1876b3a223a2770249f passed previous route and 14/14 HTTP checks but FAILED a **real Chromium** teacher-login test on a disposable isolated PostgreSQL school/test teacher.

- Browser opened the teacher login, signed in with a synthetic temporary password and navigated to /auth/change-password?userId=9901.
- The global Axios 401 interceptor in src/utils/api.ts reacted to an EXPECTED anonymous /api/auth/me 401 (from AuthContext session hydration). It tried to refresh an unissued session, then sent window.location.replace('/login?cleared=1'), ejecting the teacher from the mandatory password change.
- Browser failure captured BEFORE the fix: real input form disappeared, Playwright could no longer fill the temporary-password field. This directly reproduces the visible symptom of the role/login selection page briefly flashing and returning.

## Isolated corrective change, tested against actual compiled Next

The new source branch fix/connect-browser-auth-challenge-bounce-20261014, commit 5bd61247fd2d3343708ffc27149eff2e12a5bdf7 is a child of the newer Connect integrated head 1db504e. It prevents an expected 401 from a public/login/password-change screen or public school settings request from triggering a global session-refresh/redirect. A protected portal 401 still invokes the existing normal fail-closed refresh/logout behavior; signed cookie verification in proxy/auth/me remains unchanged.

Verified **real headless Chromium UI 10/10 PASS** against newly built Next 16.2.6 on isolated loopback 127.0.0.1:3014 plus independent QA-only PostgreSQL 127.0.0.1:55443. Includes real teacher form, temporary password login, redirect to challenge, late 401 NOT ejecting from challenge, full form password rotation, second signed login, teacher dashboard, verified real HttpOnly cookie + own /api/auth/me, teacher denied admin, zero JS exceptions. Synthetic school marker checked before QA DB writes; no real staff credential or production database involved. Exact output artifact APEX_CONNECT_REAL_CHROMIUM_PASSWORD_LOGIN_20261014.txt SHA256 87c98cc7961d7e74bd94bdc4b93c108fb9b19e641ce085a311d14336c37320c5.

Focused existing regression scripts checked: auth-path 12/12, context logout 3/3, temporary session boundary 6/6, host-independent auth 9/9, static security 7/7 PASS. New optimized Next build PASS, postbuild NEXT_EXTERNAL_LINKS_NORMALIZED 0, BUILD_ID ONDwxEIZlx5onDIKY7wYf, full build log SHA256 f0cfbdf6a15165fba939bb877eb39fd8d568cdd42aa05cac5d4abfed934df0394. Source branch is clean. Existing Paper/ReportCard integration from 1db504e is preserved.

The source-only patch APEX_CONNECT_BROWSER_AUTH_CHALLENGE_FIX_20261014.patch SHA256 bdfd0b372ad1a7ef697a7713eb4229523d03a34c11df2d36d5708283102cee05 passes `git apply --check` against the exact 1db504e Connect parent. It is an incremental patch after the prior integrated auth/report-card handoff, not a standalone replacement for older/stale production source.

## Remaining production release gates

The current live Connect service still runs older Next build ID XI7EvxpUMkKOxK5ByM2BH; its /dashboard 307 to /admin is wrong and needs reviewed next.config+proxy promotion. Neither 1db504e nor this new 5bd6124 patch is live. SaaS Core is the sole production release owner. A staged authenticated synthetic teacher does NOT prove an actual authorized existing teacher's live browser identity/marks grant. A principal/admin's own signoff, production rollback drill, tenant role isolation, exact teacher permissions, signed full application RLS and real staff browser test remain unreconciled.

**Scoped recommendation for Core:** treat urgent Connect teacher login ONLY as a separate release from First Term Exam9 academic marks publication. Forward-port this patch on the verified latest Connect parent; verify compiled build/PM2/nginx/rollback provenance; run fresh real signed authorized teacher browser login + change + logout/relogin and role/tenant negative tests. Promote only with its own complete scoped release gates. Do not invent owner signatures, install unpinned keys, create fake live actor tokens, or silently approve 0/81 missing First Term maxima. Academic marks publication remains separately HOLD (Core integrated run exits 2 and preserves 1762 records/213 zeros). No user account, school DB, paper, marks or production service was changed by this QA.
