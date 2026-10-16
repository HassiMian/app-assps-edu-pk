# APEX Connect — complete optimized Next.js build and private browser acceptance

**16 October 2026. Connect-owned isolated candidate. Source QA milestone, not Core-signed production GO.**

## Actual successful build process (new since previous checkpoint)

Reviewed private Next source: **`9fcca4320bdbeb834f6494d1af82d82f1d9b818f`**, isolated tree `/root/workspace/apex-connect-eslint-full-source-reconcile-20261016`. Scoped ESLint flat configuration SHA256: `520ddbd1a0d347a8e3d12e2fce14c4a2ca8b700cb87cf93be3c65efb449b8b83`. Its corrected flat-config source was already published in the Connect-owned recovery package, not applied to live.

After resolving Next 16's cross-root `node_modules` Turbopack symlink limitation with a distinct local dependency tree, actually executed **`npm run build`** using exact reviewed Git provenance. Unlike earlier bounded attempts, this time the complete process terminated with **real exit status 0**, not merely a generated BUILD_ID. Actual console evidence includes compilation successful, full TypeScript validation, all **103/103 static routes/pages generated**, final optimization and completed `postbuild` normalization `NEXT_EXTERNAL_LINKS_NORMALIZED 0`. The build produced **`SAsg3cC_el5cq2_nN2a46`**. Existing public `ONDwxEIZlx5onDIKY7wYf` remains active, unchanged.

Private proof (never commit or publish raw logs):
- `/root/assps-release-evidence/connect-optimized-next-build-20261016/build-proof.log`, mode 0600, SHA256 `03686583b567ce5b653fd91cb24d2c046f659eef65daac2d996f802ed1063e8f`
- `/root/assps-release-evidence/connect-optimized-next-build-20261016/build-proof.rc`, mode 0600, literal `0`, SHA256 `9a271f2a916b0b6ee6cecb2426f0b3206ef074578be55d9bc94f6f3fe3ab86aa`.

New sanitized compiled artifact manifest `ops/connect/recovery/successful-optimized-next-build-20261016.json` locks the exact private build, reviewed source SHA and seven critical compiled/provenance/source files. Tool `ops/connect/verify_successful_next_build_20261016.py` fail-closes on forged build-exit, changed log, altered source/compiled routes, absent code or stale Build ID. It returns `OPTIMIZED_NEXT_BUILD_PROVENANCE_PASS` on VPS. Adversarial unit tests are versioned in CI.

## Real current-build acceptance

The existing strict anonymous-route HTTP harness now permits this **one exact isolated worktree** only when Build ID `SAsg3cC_el5cq2_nN2a46`, Git source commit `9fcca432...` and correct approved lint config digest match. It does not permit arbitrary `/root/workspace`, production `/var/www/apex-connect`, stale builds or unsafe redirects. Real disposable localhost Next process tested **5/5**: login 200, dashboard 307 neutral login, nested dashboard 307 neutral login, teacher 302 scoped login, `api/auth/me` anonymous 401; ephemeral listener terminated.

Actual private HTTPS Nginx + real Chromium against **this newly successful build** (not merely the older precompiled `rc1v...` stage) returned **14/14 PASS** for intercepted synthetic teacher temporary-password/change-password/visibility/re-login flow, with no uncaught browser errors. Only mocked synthetic credentials/requests were used; no public staff session created, no cross-tenant identity impersonated. Ephemeral private ports closed afterward.

**Limits:** This proves optimized compile and synthetic browser acceptance, not independent signed staff/peer-school tenant isolation, active SaaS backend restricted queue worker integration, authorized official production switch, or off-host signed recovery. The latter remain under SaaS Core + school's genuine evidence-upload process.

Production data protection: unchanged accepted Result Cards V3, saved 1,763 examination result rows including 213 genuine numeric zeros, existing Daily Diary and protected examination materials. No Nginx reload, PM2 restart, SQL record mutation, password reset, or printer job was performed.

**Core adoption:** Reconcile the existing exact 10-file reviewed Connect source patch and lint config through the latest protected Core source, then Core must run its actual trusted 13/13 release gate, five-feature browser acceptance, live authenticated tenant test and backup/rollback gates. No direct public promotion from this isolated worktree.
