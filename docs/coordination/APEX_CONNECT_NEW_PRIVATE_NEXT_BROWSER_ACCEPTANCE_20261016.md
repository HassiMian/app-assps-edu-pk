# APEX Connect — Reviewed isolated Next build and real browser acceptance

**16 October 2026. Scope: source and private HTTPS testing only; production cutover remains HOLD.**

## Reconciled source/build

- Exact original reviewed Next Git source: `9fcca4320bdbeb834f6494d1af82d82f1d9b818f`.
- Isolated source worktree: `/root/workspace/apex-connect-eslint-full-source-reconcile-20261016`. The ESLint flat-config repair matches the published source snapshot SHA256 `520ddbd1a0d347a8e3d12e2fce14c4a2ca8b700cb87cf93be3c65efb449b8b83`. This worktree does not replace public Connect.
- New local compiled `.next/BUILD_ID`: **`EvBJH9KRqqtM5ldAhJKtT`**. The standard build command hit the bounded tool timeout, so **no successful optimized-build process exit was independently observed**. In particular, a generated BUILD_ID by itself is insufficient for release.
- Actual fresh Node Next.js 16.2.6 process booted in production mode on **127.0.0.1:3129**; HTTP **5/5 PASS**: anonymous `/login` HTTP200, `/dashboard` and `/dashboard/history` HTTP307 to neutral `/login`, `/teacher` HTTP302 to `/login?next=%2Fteacher`, anonymous `/api/auth/me` HTTP401. Port 3129 was terminated.
- Actual ephemeral HTTPS Nginx 127.0.0.1:3017 -> compiled Next 127.0.0.1:3016 using the valid hostname certificate; real Chromium intercepted synthetic login/temporary-password-change/return-to-login and password-eye events, **14/14 PASS**, no uncaught page errors, mock login and change-password posts only, all other network destinations blocked. Both ports closed afterwards. This is **not** real staff login evidence or independent School2 RLS certification.
- Actual immutable SHA256 hashes for seven critical compiled and source files now published at `ops/connect/recovery/private-next-build-20261016.json`. `ops/connect/verify_private_next_build_20261016.py --stage <source-worktree>` compares exact reviewed source commit, Build ID, renderer source attestation, and compiled route digests. **Private provenance PASS** on the VPS, **10/10 adversarial unit tests PASS** in CI; rejects fake production GO and independent evidence claims.

## Core release dependency

Most recent independently verified Core `integration/core-phased-paper-readiness-20261016@97382ccd113679572af0764028ecaf5dd242ab2b` has an authenticated, stage-only **owner evidence self-upload** contract. **The school will supply its authentic evidence itself**. APEX Connect must not mint attestations, silently seed staff credentials or consume any privileged School 2 account. The current live signed receipt path `/etc/assps/connect-login-precutover-core-receipts.json` and installed production AI worker remain absent.

The current public Next Build ID remains `ONDwxEIZlx5onDIKY7wYf`; public anonymous dashboard still routes to `/login?next=%2Fadmin`, unlike both verified private candidates. Existing owner-accepted Result Cards/Diary/Marks frontend, 1,763 saved exam results including 213 genuine numeric zeros, and printer receipts must remain intact.

**Decision: Private Connect browser and compiled-artifact integrity verified. Full optimized-build exit and signed Core 13/13 release gate not certified; do not switch public Nginx or restart PM2.**
