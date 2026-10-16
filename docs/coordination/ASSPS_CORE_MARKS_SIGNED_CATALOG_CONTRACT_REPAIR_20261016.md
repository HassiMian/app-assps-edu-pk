# ASSPS SaaS Core — Marks P0 signed catalog regression correction (16 October 2026)

**Sole owner:** SaaS Core & Production. **Release:** HOLD. **Production changes in this checkpoint:** none.

## Exact lineage and reproduced defect

Base is isolated clean Core `integration/core-marks503-paper-diary-unified-20261016@4df452c2bfbb5f3a1b6bef73795f78b4c2ecb9e5`. The original backend signed-policy unit test checked obsolete inline conditions `state.forced !== 77` / `state.signed !== 77`, and exact predicate counts in `database.js`. The real reviewed code moved fail-closed catalog comparison into `signedRlsCatalogGuard.js`: **82 FORCE enabled total; 77 original signed policies (73 signed school and 4 signed tenant), plus five independently exact checked academic policies**; the separately protected `student_class_movement_audit` is explicitly excluded from this original signed catalog count. Reproduced before correction: old running-green source test 0/1, exact Core base test 0/2. This is a **stale test expectation, not evidence of a new production signed-guard failure**.

## Isolated source fix, no runtime mutation

Changed only `al-siddique-backend/src/tests/signed-runtime-catalog-contract.test.js`, corresponding narrow GitHub CI workflow and this report. New test requires real FORCE/ENABLE, original restrictive policy predicate/role signing, delegated `signedCatalogComplete` before tenant setup, five exact academic protection contracts and scoped exception for movement audit; adversarial helper inputs reject missing/extra counts, strings/booleans/nulls and wrong academic counts. Crucially, no `database.js`, runtime worker, auth route, RLS SQL or school data changed. CI now calls the updated contract test on relevant branch/PR paths.

## Executed evidence

- New direct signed contract: **4/4 PASS** after previous **2/2 FAIL** on exact predecessor.
- Synthetic backend combined signed helper/catalog + classroom marks HTTP/teacher scope: **20/20 PASS**, Node22. Existing source dependencies for synthetic backend resolved from installed live backend `node_modules`, **no live DB mutation or actual user login**.
- Frontend Marks Save failure/session persistence/marks truth combined: **9/9 PASS**, exact SHA256-equal pinned frontend package lock, full isolated local copy of previously installed dependencies.
- Class One root-only baseline read-only PG16 integrity checker: **152 existing First Term Class One marks, six numeric zeros unchanged**; **10/10** adversarial integrity-checker tests PASS. Whole school: **1763 exam results, 213 numeric zeros, 0 NULL**. No failed submitted score payload recovered, no invented/mutated results.
- Active Nginx routes only Marks POST to the existing signed 5093; `/health` on 5091/5092/5093: 200, app HTTPS 200; API domain root may 302 to login, **public Marks POST without authentication 401 on both hosts**. Current production accepted static index SHA256 `760b232b493c300fe78908704aef4989c24c25028faac1821dd41f6480210f3c`, scoped Nginx map SHA256 `9ad70bc982cabe8bd29448a775111caee54e55c1e7d2a784b236982d181526cd`. Production frontend release-meta `24cbcae3`, backend `16ab8f34`, Marks service `f0f87e1b`; all component-specific.
- Workflow YAML parsed; new contract test wired, `git diff --check` clean. No deployed bundle change and no new Vite build claimed for test/CI-only descendant; predecessor Core `4df452c2` had its own independently documented Vite build PASS.

## Unresolved release conditions

1. No authentic existing authorized staff session or recovered original missing Class One score values were available. Therefore **live legitimate Marks POST success / savedCount / GET reload has NOT been witnessed**, and failed historical Class One upload is **NOT recovered**. The First Term 152 existing scores must remain unchanged.
2. Public frontend scoped Marks Save POST401 non-logout patch remains **source-only**. Do not overwrite the accepted public static tree to release it without protected review and rollback.
3. Full independently signed SaaS Core release remains **6/13 / HOLD** pending reviewed full ACL backup, independently signed off-host recovery, signed restricted worker transport, exact reviewed adapter deployed live, separately authenticated persistent global worker, independent effective-grants signoff, and independently authenticated real School2 / unassigned-subject denial. Physical Urdu Diary print remains unwitnessed. A synthetic two-school test or green QA cannot substitute for these live signed gates.

**No cross-owner source/worktree modification, no data DML/DDL, Nginx/PM2 restart/reload, credential read or forged signature.** Future source-only code integration must preserve exact ancestry and never imply this QA-only commit is production certification.
