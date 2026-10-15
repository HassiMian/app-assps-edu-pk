# ASSPS Daily Diary — Active Bundle No-Regression Production Handoff

**15 October 2026, School-reported urgent recurrence:** Teacher/Principal manually restores Diary editor font controls, footer and row-height settings while using the live system. Later unrelated deployments overwrite prior frontend builds and appear to remove those controls. The correct fix is to make canonical code + current runtime **the source of truth**, and fail any future cutover whose _actual active index imports a stale Diary bundle_, not merely preserve a collection of orphan JS chunks.

## Factual read-only live evidence

- Live Nginx TLS site `app.assps.edu.pk` currently has root `/var/www/assps-grade910-draft-save-print-b18a8aae`. Do NOT replace this root or mutate student marks in Academic/Paper Master.
- Current live HTML SHA256 `0af53ae824340f2ddc0b91e848163f8bddad4263d1bb7a7cf92a2bcda923325a`, active import `index-C5HG5flw.js` → `PaperGenerator-Dy5oebvW.js` → `DailyDiaryWorkspace-UmxZExBI.js` + `DailyDiaryWorkspace-BDofWbd2.css`.
- The live root also contains **multiple old `DailyDiaryWorkspace-*.js` files**. Their mere existence is not evidence of the working UI. The actual imported active bundle contains all tested Diary controls at this time. This does not prove the user's previous regressions did not occur; it exposes a credible and preventable stale artifact/branch regression path.
- The latest canonical Paper/Grade integration (already remote `6cc793167bffb07da20313f50042e123a50c0536`) has separately extracted and immutable staged frontend candidate at `/root/assps-release-candidates/paper-current-canonical-6cc7931-source-qa-20261015/reopened/dist`; candidate `index-CVQti4GY.js` → `PaperGenerator-CWnU78Ou.js` → `DailyDiaryWorkspace-DXjGkW7T.js` + same preserved Diary CSS. Staged active Diary SHA256 `a0327bb77f4f1251d38a41a1a64a38a143a19165691309a3e5c87f04329e0eed`.
- Both true active routes contain 11 expected Diary controller markers including subject bold/font size, row height, Diary/footers/logo font controls and saved library/print references. Exact active imports and SHA256s captured in source-only `/tmp/assps-diary-protected-current-live-entry-20261015.json` (SHA256 `ba12727a0d9a58a9b940e4c63eae4443f10741bb60dab32311a37718141c1506`) and staged `/tmp/assps-diary-protected-staged-entry-20261015.json` (SHA256 `15cb39f969df95ee2b6209691b5464690a415d0f9f03a3c2dda95d68335eb1a3`).
- Independent LOCAL preview server `127.0.0.1:17971` serving the staged read-only dist returned **200** for `/`, active index, active Paper module, active Diary JS and active Diary CSS. Server was stopped; no live Nginx or application traffic changed.

## Implemented permanent source gate

`ops/release/verify-diary-controls-in-active-bundle-20261015.cjs`

Run **before** a candidate frontend promotion and **again** on the newly routed production root during SaaS Core postflight:

`node ops/release/verify-diary-controls-in-active-bundle-20261015.cjs --dist /path/to/COMPLETE_REVIEWED_BUILD_DIST`

Do not approve cutover if this source gate fails. It parses candidate's actual index `script`, reads only the exactly referenced active Paper Generator dynamic route, reads that route's specifically referenced Diary JS and CSS, checks every required Diary controller token, verifies real regular files and rejects missing, duplicated or stale imports and symlinks. It deliberately does NOT accept a nonreferenced old Diary bundle which happens to contain the right strings.

Isolated regression tests `ops/tests/paper-diary-active-controller-immutable-release-gate-20261015.test.cjs`: **9/9 PASS**, including current-live and current-staged source files, missing active code, orphan stale file, missing CSS, ambiguous dynamic route and symlink. Companion nonbrowser Daily Diary scope tests **3/3 PASS**, so combined **12/12 PASS**. A bulk Playwright browser attempt was not valid acceptance because required authenticated UI navigated to `/login` and browser tests timed out in isolated environment; do not invent signed actor/browser acceptance.

## Production release owner — urgent but fail-closed

SaaS Core current joint read-only verifier `verify-joint-current-candidates-20261015.py --with-core-gate` returned 20/20 technical checks PASS, **official Core HOLD (exit 2)**. Its six machine blockers include current offhost independent recovery, reviewed worker deployment/transport and effective separated worker role, and signed cross-school denial proof. The school owner's need for daily Diary deployment is real, but a green Diary static canary does **not** authorize replacing active school routes or skipping recovery/security controls.

**Required Core owner action:** Evaluate an isolated independently certifiable **frontend-only** immutable candidate promotion excluding AI worker/backend/DB/auth/RLS migrations; verify exact source SHA and live frontend namespace compatibility, app marks/papers preservation, backup & rollback, pass this active-bundle gate BEFORE AND AFTER a Core-controlled atomic cutover. If official release gate still applies and says HOLD, refrain from mutation until Core obtains genuine proof. Only Core owner may touch production Nginx, PM2, DB and deploy. Keep the locked runtime save/print rules, font assets, Jameel Noori and student scores intact. Never deploy from an older Paper/Diary branch or dirty live-derived tree.

**Status:** Code and read-only canary inspection complete, isolated guard tests PASS; **production deployment not performed here**, **actual school Diary print acceptance not certified by this test**.

## SaaS Core V5 descendant test isolation (2026-10-15)

The original guard unit suite used hardcoded real and live VPS directories; this conflated immutable candidate validity with mutable production state. The V5 Core descendant parameterizes integration tests by `ASSPS_DIARY_CANDIDATE_DIST` and `ASSPS_DIARY_LIVE_DIST`. Source fuzz fixtures remain deterministic. Run pre-release candidate tests with only candidate set. Run the **separate genuine live/post-cutover gate** with both set: any live failure must abort/roll back, and a skipped live check is not production certification. Active-bundle CLI with `--dist` remains fail closed.
