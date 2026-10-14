# ASSPS Connect — Permanent teacher-login root cause, HTTPS full-chain acceptance and release architecture

**14 October 2026 — independently executed isolated QA only; public production cutover remains unperformed.**
Authoritative four-workstream release coordination: GitHub issue #4. SaaS Core owns all production promotions. No real teacher, principal, marks or passwords were used or modified.

## User-reported real failure, independently reproduced

Principal login on `app.assps.edu.pk/dashboard` works. SaaS's temporary-password generation for an existing teacher succeeds; APEX Connect `api.assps.edu.pk` shows the mandatory password-change challenge for an instant, then flashes back to `/login?cleared=1`, including in incognito. This is **not explained by browser-cache/cookies alone**.

There are **three separate correctable failure boundaries**:

1. **Async client-session race** in older Connect's shared Axios response interceptor: an expected anonymous `/api/auth/me` HTTP 401 during pending temporary-password challenge causes an unissued refresh attempt and global `window.location.replace('/login?cleared=1')`. Original integrated source `1db504e` was reproduced FAIL in actual Chromium, then corrected in `5bd6124` / `a67e29c`, preserving protected-route fail-closed semantics.
2. **Wrong compiled deployed Next artifact**: live stored/served build `XI7EvxpUMkKOxK5ByM2BH` still predates corrected compiled Next `ONDwxEIZlx5onDIKY7wYf` even though `src/proxy.ts` source content matches reviewed hash `2d4d9be579952c780d09f8ed66f9981a6c6fef40af4042fb842ca9aa38414193`. On-disk source parity does NOT prove running compiled code parity.
3. **Upstream unconditional Nginx redirect**: public TLS vhost directly intercepts `/dashboard` and `/dashboard/*` with 307 `/admin`, independently of the Next authentication proxy. Older live `next.config.ts` separately hardcodes the same admin redirect. Replacing ONLY the runtime compiled build will NOT fix this ingress layer.

**Permanent architectural rule:** session-state ownership lives in server-verified HttpOnly cookie /auth/me; temporary password challenge remains unauthenticated until successfully rotated and subsequently signed in; anonymous hydration 401 cannot cause global navigation from public challenge; protected routes remain fail-closed; Core signed role+tenant guards are authoritative for school data; no unconditional admin projection upstream, and Next+Nginx deploy as one reviewed release transaction with corresponding provenance.

## New ACTUAL integrated proof (not only isolated component tests)

Compiled reviewed Connect Next 16.2.6 BUILD_ID `ONDwxEIZlx5onDIKY7wYf` started on **127.0.0.1:3018**, backed ONLY by an independently restored full production database schema in **separate PostgreSQL16 socket port55475**; `BACKEND_URL` forced to an unused 127.0.0.1:59997 upstream so test credentials could not proxy to real Core. Only the disposable restored database received synthetic QA school `9901/QA-ONLY/qa-tenant-9901` and random synthetic teacher login; **real restored school rows unchanged**. A complete copy of current public Nginx TLS vhost was prepared under a separate root-private nginx.conf with private own pid/logs listening **127.0.0.1:3019**, removing both dashboard forced-location redirects and proxying only to local Next3018. Real TLS certificate was used; Chromium's hostname was mapped to loopback, and it ignored TLS trust errors for this isolated test. **Production TCP 443, Nginx instance, PM2, Core backend, real DB5432 were NEVER used by this test.**

The **real Chromium browser from public-like APEX hostname over actual HTTPS/Nginx/Next/full-schema QA** completed **15/15 PASS**:

- Anonymous /dashboard cannot bypass role-aware session routing and is redirected to login rather than /admin.
- Synthetic teacher temporary password is accepted but never initializes an authenticated session.
- Expected delayed anonymous /auth/me 401 does not eject from the password-change challenge.
- Full temporary password rotation and second login with the NEW password succeed.
- Signed HttpOnly browser cookie + own /api/auth/me canonical teacher identity verify.
- Teacher reaches teacher dashboard on the isolated HTTPS origin.
- Forged `school_id=1&tenant_id=assps` query parameters cannot escape QA tenant9901.
- SaaS-admin school inventory denied HTTP403; /admin UI teacher denied; no uncaught browser JavaScript errors.

**Exact evidence:** `docs/coordination/APEX_CONNECT_FULL_TLS_REAL_BROWSER_15OF15_20261014.txt` SHA256 `7ceffd87854c4e0b53782a487d1e8554de9e7af85ee474f9a7ec22fb0b51dea4`. Incremental source QA patch `docs/coordination/APEX_CONNECT_FULL_TLS_REAL_CHROMIUM_20261014.patch` SHA256 `3e638003f84e90d7ee325031cef681c83c12073387f3d9a481b28d24d7438e6a`; apply only to exact standalone Next parent `9c4ed6556b457a3b078d399c58b01a68d31df5ce`, NOT to the Vite monorepo frontend. Test branch `test/connect-entire-tls-teacher-chain-20261014`, commit `c9de089362c3d170d0da3a84140069cf6402014b`; source client/runtime fixes came from earlier verified `5bd6124`. This commit extends TEST coverage, not runtime behavior.

**Focused QA regressions:** auth path 12/12, host-independent signed auth 9/9, temporary boundary 6/6, postlogin redirect 19/19, Nginx blue/green 9/9, signed-release evidence adversarial fixtures 10/10 — all PASS. QA password never printed; test logs contain no real school credentials, signed production actor tokens, session cookie values or user record content. Full-schema clone Exam9 school1 unchanged at 1,762 saved marks, 213 numeric zeros and original 301-row digest `bcdc098a3e6cabb6f4c31736b14e39b9`.

## Stronger A/B/C release architecture, refusing circular proof

**Release A (Connect login-only):** Do NOT allow unrelated unapproved First Term scores/Grade IX/X content to block a functional login build for reasons unrelated to authentication. But do NOT override independent global Core tenant/RLS safety failure, owner signing roots, teacher-session permission acceptance or release rollback readiness.

Split A into **pre-cutover** and **post-cutover** gates:
- Pre: exact latest reviewed Next build and public Nginx config paired; reproducible QA browser 15/15; signed tenant security semantics, existing genuine staff identity verified on restricted authenticated Green, full current backup and actual isolated restore; verified rollback *capability*, original artifact/blue route preserved. Must be independently approved by Core authority.
- Atomic cutover: Core promotes reviewed compiled Next and BOTH Nginx intercept removals **as one controlled deployment transaction** only after pre-gates; never copy isolated 3018/3019 ports or QA-only JWT key/DB settings into public.
- Post: verify public 6-route matrix, genuine existing teacher password challenge/login/relogin, actual signed tenant peer denial and no unassigned marks access, timestamp/actor-bound authenticated Core traces and zero-loss marks fingerprints. Verify public rollback is actually executable and release owner certifies it. If failure, immediately restore pinned Blue and verify. No false requirement to provide an evidence receipt for a future cutover before any cutover; no fake retrospective acceptance afterward.
- Academic results and official paper publication stay OFF in A.

**Release B (Paper Studio + results operations):** Canonical teacher-facing Paper Workspace remains sole editor. Stage independently marked/view/edit/print and Save→Reopen→Print browser/OS acceptance with Urdu RTL and marks totals. Preserve existing live Exam9 entries and true numeric zeros, distinguish unentered blanks. Lesson composer/source groups remain private review-only drafts; do not auto-publish. Release separately from Grade IX/X publication.

**Release C (Grade IX/X official academic questions):** Code and AI advisory may run in restricted review mode but selected/public questions require authentic textbook adoption/edition/pages, independently qualified subject/Urdu review, revision-bound real signer identity and enrolled school trust roots. No fake Principal/teacher signature, inferred maxima or unapproved 2,581 research candidate promotion. Publication stays gated until evidence exists, but draft-only work need not block A/B.

## Current release blockers from independent Core audit (not fixed by browser test)

Latest coordination issue #4 reports Core signed runtime catalog source guard `fix/core-signed-runtime-catalog-20261014` SHA `67e73aa7...` identified **six unscoped privileged public tables with RLS disabled** (organizations, campuses and four AI/queue/admin event tables). A Core-owned least-privilege worker/tenant authorization plan and clone negative tests are necessary, not a blind live ACL revoke. Four other non-FORCE-RLS but policy-scoped relations need actual signed peer-school acceptance.

Production trust root `/etc/assps/release-evidence-ed25519.pub` absent; actual authorized Muhammad Imran employee temporary password login and real live signed Core tenant acceptance not verified. Core read-only academic results integrated preflight remains HOLD. Do not claim this 15/15 clone-based browser evidence as genuine staff or production certification, or deploy while authoritative gate returns FAIL.

**The only valid remaining Release A sequence is Core-signed preflight → restricted true production-like Green genuine acceptance → atomic Next+Nginx promotion → genuine live postflight and proven Blue rollback.**
