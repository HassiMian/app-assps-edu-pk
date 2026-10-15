# ASSPS / APEX Connect — 15 October 2026 20:39 PKT (15:39 UTC)
# Active live three-route invariant, concurrent Marks Register P0 and 23:00 recovery

## One authoritative live source
The active Nginx site for `app.assps.edu.pk` is **NOT** the archived Grade root `/var/www/assps-grade910-draft-save-print-b18a8aae`, nor the previous Diary-only P0 source. During this exact mission, another authorized workstream switched the active root to `/var/www/assps-marks-register-p0-4ce2c5e3`. Root was independently derived from `/etc/nginx/sites-enabled/apex-app-ssl`, and its index SHA256 is `aa29d4980a73d085a64c02ad14edd0d189531f5c727cc66ab49237bf1f9090c1`. Current public HTML references `assets/index-CHeCVU9a.js`. This matters: checking the prior root yielded a deliberately rejected stale-root gate. No Connect agent overwrote the concurrent release.

## Current active production
- Protected Diary active import route `assets/index-CHeCVU9a.js` → `assets/PaperGenerator-CsFUlEyb.js` → `assets/DailyDiaryWorkspace-BgvYYxMP.js`, live actual controller guard **11/11 PASS**, including subject typography/bold, row height, footer/logo, print and saved-library settings.
- Same actual public root's Lesson Planner V5 contract: **FAIL**.
- Same actual root's Early Years print companion/preserved printer contract: **FAIL/HOLD**.
- Thus Diary-only P0 relief is live but the owner's **whole system** readiness condition is not fulfilled. A stale old asset's mere presence is not a reachable function.
- `api.assps.edu.pk/health` and public app HTTP200 at mission start. No evidence yet of a real successful 16 Oct Diary Save→Reopen→physical print.
- Read-only live School1 daily_diaries date grouping: 15 October = 3 saved records with homework rows; **16 October = 0** saved diaries. Never copy 15 October homework and present it as fresh 16 October data.

## Latest clean full-source candidate
The Paper Studio-owned clean integrated full-route regression source is `qa/paper-studio-full-route-postflight-20261015`, **`c66a5ae205545e41dbd445e58543ad5f938296a9`**, descendant of Core/Connect/Paper integrated `f1e6f3d852d9afafa64ad467ad0738c00bff2458`. Its reviewed built HTML SHA256 `9d0d07585831504c82a4d37c39354ff5ccc9c006447ac5d15335abe4b7f40255`. Built active Diary all 11 controllers PASS; Lesson Planner contract PASS; Early Years print companion PASS; guarded rollout **dry run only** `READY_FOR_CORE_GATE`. Read-only four 3-route postflight adversarial rollback tests **4/4 PASS**.
No Git ancestry changed by this Connect agent in the Paper branch.

## New Connect-owned cross-system guard
Extended `ops/connect/verify_joint_frontend_connect_core_20261015.py` to accept `--nginx-site-config`, verify actual Nginx active /var/www root exactly equals the requested SHA-pinned root, and independently test public live **Diary + Lesson Planner + Early Years**. Stale-root release probes fail closed. Existing candidate checks, Connect role-neutral/first-login/HTTP401/public guard checks and actual official SaaS Core verifier remain required. Fourteen-to-eighteen synthetic tests including a Diary-only regression and fake Nginx roots: **18/18 PASS**.

New actual read-only joint result with root SHA `aa29d4980a73d085a64c02ad14edd0d189531f5c727cc66ab49237bf1f9090c1`:
- staged cross-owner technical candidate `PASS`.
- active Nginx root matches expected `true`.
- live Diary `PASS`, live Lesson `FAIL`, live Early Years `FAIL`, whole live frontend recovery `false`.
- official Core `HOLD` / process exit `2`; full release not authorized.
- current receipt JSON SHA256 `1ddc43abe54dd0d3c2a6037f560cd99a9af9d198ce8b0ca4384479bf48ef3ced`.

## Institutional release constraints
SaaS Core owns the production worker/backend/DB and cutover. Official receipt intake `/etc/assps/connect-login-precutover-core-receipts.json` was absent during current window and reviewed worker module was absent from running backend. Real teacher first-login/re-login, independent authorized School2 denial, independent human-signed recovery, core worker production activation/transport and post-cutover rollback receipts cannot be fabricated.
The user delegates academic editorial approval, not independent institutional cryptographic verification or permission to reset school data. Live school exam results (last independently checked School1 Exam9 1762 rows, 213 genuine numeric zero marks, 0 NULL) are immutable during frontend remediation.

**Immediate Core action for 23:00 deadline:** certify narrow frontend-only integrated release if separately permitted by reviewed policy, otherwise complete official unified worker/recovery/tenant gates before release. Promote SHA-pinned full V5 current-route candidate only with pre/post Diary 11 + Lesson PASS + Early Years PASS + available Marks View/Edit/Print and real 16-Oct authenticated Diary Save→Reopen→physical print. Do not let concurrent jobs overwrite one another or silently regress working Diary controllers. No live production configuration, data or credentials changed in this Connect QA run.
