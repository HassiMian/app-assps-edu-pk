# ASSPS Core first-day Marks Entry + nine premium Result Cards — independently staged LIVE-FRONTEND descendant
Date: 2026-10-10. Release authority: SaaS Core. Deployment: **HOLD**, no app artifact promoted.

## Exact provenance
- Original independently verified live frontend SHA: 24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92.
- Isolated production-descendant frontend worktree: /root/workspace/assps-core-marks-nine-results-livebase-20261010, branch release/core-marks-nine-results-livebase-20261010.
- Selected source: tested integrated Core Marks→nine Results branch test/marks-results-firstday-combined-20261010 SHA 97d7815f78acac817d6ee38bce6d22774abf1e84 (with newer companion real signed HTTP test branch 7ee2055a, test only).
- Copied ONLY scoped examination/Marks/ResultCards source and relevant frontend scripts/fixtures from reviewed integration. DID NOT merge or cherry-pick older unrelated Paper Studio, Grade IX–X or APEX branches. Original six protected templates preserved exact bytes.
- REQUIRED separate production-descendant backend candidate now SHA 322c8262dbad947df8b54b0145d431b65983aad8 from live backend 16ab8f346ba27aa6b2e29a8f03c68db32a326cb9. It preserves restricted teacher school/class/section/subject result GET and POST guards and adds exact already tenant-scoped s.class AS student_class and s.section AS student_section projections. These two components MUST be deployed/rolled back independently and neither is currently live.

## Source-level issue discovered and repaired during exact live-base forward-port
- Integrated Result Cards file premiumResultCardTemplates.jsx exported reusable utility functions, template catalog and print HTML with React visual components. Exact frontend ESLint initially reported five errors (one setState-in-effect in ResultCards.jsx plus four Fast Refresh mixed non-component exports). Instead of muting lint or changing the nine designs, separated data functions/options/catalog into pure premiumResultCardData.js, print/CSS/render-to-static into premiumResultCardPrint.js using createElement, and kept JSX component-only exports in premiumResultCardTemplates.jsx. Updated consumer and all SSR test fixtures to import their matching API modules. One ResultCards effect now schedules its existing guarded results load after the commit phase and cancels scheduling when selected exam changes; stale-request response guard still prevents overwrite.
- Tests exposed existing stale copy literal assertion 'always included' that contradicted actual user UI 'Both analytics charts are included on every card'. Aligned test to real actual toolbar text; no analytics hiding permitted.
- Dedicated Result Student Identity frontend test initially failed on source counterpart because older separately staged backend did not project class and section. Corrected companion BACKEND, not fake frontend data. Test can now use ASSPS_TEST_BACKEND_SOURCE pointing to verified companion backend route file for split component acceptance.

## On EXACT live-frontend descendant: actually executed
- npm/Vite original production-base dependency lock via reuse of existing audited installed node_modules (no disk-heavy reinstall); optimized Vite full build EXIT0 3.32s, focused ESLint all 13 affected runtime source modules and critical tests EXIT0 zero errors, protected six legacy result templates PASS.
- Original official First Term schedule 75 paper/11 class subject parity and tenant-bound roster four-alias dedupe tests PASS.
- Actual real Chromium/Vite synthetic Marks Entry GET/zero saved results/browser test EXIT0: first-day empty results remain empty (not zero); students visible, no blind write, saved zero only new edited value, prior scores preserved, invalid 101 denied; six official subjects without Academic Setup.
- Marks Zero print 16 tests PASS; Marks→nine premium Results first-day data PASS: zero records no grade/print, one recorded 0 plus unentered subject grade pending for all nine, later 70/200=35% configured grade for all nine. No synthetic fixture treated as real marks.
- Actual designer Chromium browser EXIT0, failed tenant logo print blocked, native printer selection, A4 three-card batch and PDF popup, preserved teacher remarks. Nine premium A4 browser pages PASS, all template SSR nine out of nine PASS, fractional/zero/term math, missing subject, full marks denominator and printing policy PASS.
- Adversarial layouts nine out of nine, no content cropping; overflow blocks print rather than silently clipping; mixed-template A4 batch generated 3-page sample PDF; student class/section SSR 15 checks PASS only when tested against accompanying backend RC.
- No real authenticated school marks posted, no production DB modification, no Nginx/PM2 application restart or live deployment. Browser flows use deliberately synthetic first-day fixtures.

## Deployment gate
Existing live Nginx private ingress secured, 32/32 TLS+media and anonymous endpoint 7/7 pass. Disposable restricted signed PostgreSQL 13/13 and new genuine signed JWT HTTP Marks-empty-results test PASS using clone 127.0.0.1:55432, not production. Actual live backend /var/www/apex-backend/.env DB_USER=apexos_user; catalog says login=true/BYPASSRLS=true, strict signed-tenant runtime switches are not configured, so REAL production signed role acceptance cannot be certified. This is a hard NO-GO. Separate Paper/Assessment clone tests still lack verified fixtures/owner acceptance.

## Safe decision
Frontend now reproducible as scoped production-descendant READY SOURCE. It is NOT deployed. Do not roll back live production by deploying the older firstday-combined branch directly, and never promote frontend alone with old backend class/section projection. Core certification must include verified non-BYPASS signed production actor/JWT, cross-tenant negatives and Paper owner integration before deployment.

STATUS: FRONTEND_BUILD_LINT_BROWSER=PASS; NINE_PREMIUM_RESULT_CARDS=PASS; REAL_PROD_ACTOR_RLS=FAIL_NOT_CERTIFIED; APPLICATION_DEPLOYMENT=HOLD.
