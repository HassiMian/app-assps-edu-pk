# ASSPS Promote/Demote Students — live authentication hotfix, 2026-10-30

Production affected: https://app.assps.edu.pk/students/promote
Original source provenance: 575438b839d73b5c03f9721380231a44363f593b.
Source branch: hotfix/promote-auth-20261030.
**Purpose:** Principal moving the 11 active Class Eight / Blue students to Pre Nine / Blue before fee voucher generation.

## Root cause
The original frontend /src/services/api.js unconditionally cleared session on any HTTP 401; PromoteDemote used that API for the non-idempotent POST without first verifying/refreshing the token. Backend /api/auth/refresh already supports a signed, school-scoped refresh token. The protected endpoint correctly rejects invalid or expired JWTs.

## Minimal production repair (frontend-only)
- Promoter checks GET /api/auth/me immediately before POST, validating signed actor ID, school and role against the existing session.
- On access-token 401, it uses the genuine POST /api/auth/refresh endpoint, verifies same signed actor and GET /api/auth/me response, updates only its own validated auth tokens, then performs exactly one class-assignment POST.
- If refresh identity fails or expires, fails closed with a clear sign-in message and zero student writes.
- A small promotion-route-only bootstrap restores access before AuthProvider mounts on a fresh reload; other SaaS routes use the original bootstrap.
- Requires exact server acknowledgment for all assigned students before displaying success.

## Production artifacts and activation
- Nginx root active: /var/www/assps-releases/promotion-auth-v2-20261030
- Live baseline preserved: /var/www/assps-releases/baseline-20261022-1404
- Previous tested hotfix candidate preserved: /var/www/assps-releases/promotion-auth-20261030-urgent
- Only index.html changed and these two new assets were added:
  assets/PromoteDemote-ASSPS-AUTHREFRESH-20261030.js
  assets/ASSPS-PROMOTION-SESSION-BOOT-20261030.js
- Existing module JS, fee/voucher assets, result cards, front-end legacy repairs, backend and PostgreSQL are unchanged.
- Existing importmap now resolves /assets/PromoteDemote-CRYooUy5.js to the versioned hotfix module.
- For the versioned compiled chunk, its import paths use the exact active production index-D_DnmAgX.js and useAcademicStore-B6h8VBAS.js, not paths from an independent build. Vanilla source bundle matched live production bytes after neutralizing only those two import hashes.
- Original Nginx config snapshot: /root/secure-archive/assps-promote-auth-nginx-20261030.predeploy
- Prior V1 Nginx config snapshot: /root/secure-archive/assps-promote-auth-nginx-20261030.v1
- Rollback: restore the original Nginx config snapshot and test/reload Nginx. Never rewrite student records to roll back frontend.

## Evidence
- Production HTTPS 200 on /students/promote and new assets, Nginx config test passed.
- Chromium browser exercised the **real production frontend and served JS** with intercepted synthetic APIs: 11 synthetic Eight -> Pre Nine Blue assignments; expired access -> refresh -> exactly one signed POST, pass.
- Invalid refresh scenario: zero POST, clear non-success message, pass.
- Fresh-load expired access token bootstrap scenario: refreshed before normal auth module rendered, pass.
- No real authenticated Principal promotion was executed in this release test.
- PostgreSQL read only: student class Eight count 11, Pre Nine count 0, 1,854 historical First Term mark rows. No SQL changes made.

## Release boundaries
Production hotfix is deployed and smoke tested. Actual Principal account save/reopen, class destination, 11-student roster and fee vouchers printing cannot be certified from synthetic credentials. Do not bypass role guards or fabricate account acceptance. Do not deploy the separate unified review branch directly to live on the basis of this hotfix.

## Root cause correction confirmed Oct 30, 13:35 UTC — Nginx backend mismatch

Actual Nginx logs: at 13:31:14 UTC GET /api/auth/me returned 200 and POST /api/students/bulk-class-assignment returned 401; POST /api/auth/refresh returned 200. Thus expired access tokens alone cannot explain this error.

**Root cause:** exact promotion endpoint in the Nginx included snippet was routed to isolated October 11 review process PORT 5091, while /api/auth/me and /api/students were handled by live production PORT 5000. The inconsistent backend JWT validation caused a valid login to be rejected by the movement endpoint.

**Production repair:** exact POST-only Nginx promotion endpoint now routes to 127.0.0.1:5000. JWT Principal/Admin checks, atomic SQL updates, audit table RLS and rollback retained. No real user identity forged, password reset or student records changed.

Source-of-truth copy: ops/nginx/assps-marks-only-locations.conf
Nginx rollback snapshot: /root/secure-archive/assps-promotion-route-5091-before-fix-20261030.conf
Nginx syntax test and reload successful; unauthenticated POST still returns 401.
Core backend promotion regression tests 8/8 passed; signed audit role has INSERT and two matching RLS policies.
Real Principal promotion after routing correction has not been verified or executed by the assistant.

Pre Nine / Blue class exists and is active; the school fee rate for Pre Nine in 2026-2027 is PKR 3,000 monthly. The bulk fee voucher path uses the destination class fee configuration. Existing payment history must not be rewritten.
