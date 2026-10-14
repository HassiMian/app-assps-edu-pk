# APEX Connect isolated real-school-schema tenant regression and scoped release gate

Date: 14 October 2026, GitHub issue #4. This is a **source/QA checkpoint**, NOT authorization or certification of a production cutover.

## Verified code checkpoints

- Reviewed standalone Connect Next.js source: `fix/connect-browser-auth-challenge-bounce-20261014` at child commit `a67e29ca8c3956e4fbc250f82c7e572294a2a84a`. Parent functional fix `5bd61247fd2d3343708ffc27149eff2e12a5bdf7`, integrated prior teacher-login/report-card parent `1db504e3020c58aa005db1876b3a223a2770249f`. Child only broadens the isolated QA browser test, **no new runtime source change** beyond 5bd.
- Optimized Next.js build from functional fix: BUILD_ID `ONDwxEIZlx5onDIKY7wYf`; optimized compile, TypeScript, postbuild PASS.
- Source focused host-independent 9/9, auth path 12/12, temporary session boundary 6/6, static auth 7/7 PASS.
- New restored-school-schema fixture test source is attached as `APEX_CONNECT_RESTORED_SCHEMA_TENANT_QA_20261014.patch`, SHA256 `8abe10db45847ad065379d97502eabac5df45dd66340062911a027559bcaa8d8`. It reverse-applies cleanly to the exact child code; apply this *incremental test-only* patch after existing browser-fix handoff.

## Real production-schema QA — isolated, no production writes

- Used the prior root-restricted `pg_dump -Fc` snapshot `/root/assps-release-backups/connect-protect-live-20261014T1545Z/apexos_consistent_20261014.dump`; restored successfully into a **separate PostgreSQL16 cluster** on Unix socket port 55445. Do not confuse a restored *historical snapshot* with a current live source.
- Snapshot's school1 Exam ID9 rows = 1,762, numeric zeros = 213; original score fingerprint `bcdc098a3e6cabb6f4c31736b14e39b9`. Confirmed unchanged in QA after login tests. No production marks, students, real users, credentials, passwords, privileges, marks or academic approvals were modified.
- Added a separate synthetic school with ID 9901, code `QA-ONLY`, tenant `qa-tenant-9901` **only in disposable clone**. Real cloned school rows stayed untouched. Connect candidate Next.js started on loopback port 3015 with DB_HOST pointing only at cloned PG socket/port55445; BACKEND_URL pointed to **non-existent loopback** port59997 to ensure no accidental forwarding of QA signed credentials or API calls to live Core backend.
- The actual Chromium teacher UI test generated random synthetic credentials (never printed), rotated the temporary password, verified HttpOnly signed session, own `/api/auth/me`, teacher route and admin-route denial. Newly added checks proved that attempting to override own school via `/api/school/settings/current?school_id=1&tenant_id=assps` returns **only the signed QA school ID9901/tenant**, and `/api/saas-admin/schools` rejects the signed teacher actor with 403.
- All **12/12 browser checks PASS**. Evidence file `APEX_CONNECT_RESTORED_SCHEMA_BROWSER_PASS_20261014.txt`, SHA256 `c46e2173ff444896029e45f38a0011bf499c2fc505176e0ae4ad3ae88834d28b`. Test rejects database port5432 and any non-isolated DB host and refuses to run without `CONNECT_ISOLATED_QA=yes`.
- Scope of the acceptance: actual Next.js + restored original schema with a **synthetic** teacher, live school1 records preserved; not a genuine employee login, production active tenant RLS trace, actual marks save, independent signed school-B peer denial or principal approval.

## Release readiness / ownership

Production `api.assps.edu.pk` was rechecked; still serves `/dashboard` as 307 to `/admin` (wrong pre-middleware redirect) and old deployed Next build ID `XI7EvxpUMkKOxK5ByM2BH`. Live PM2 Connect was not restarted, no switch performed. Source fix can now be promoted ONLY under SaaS Core's verified independent **login-only** release sequence:

1. Recheck latest active Core and Connect heads/worktrees; install reviewed integrated source plus both incremental browser and QA patches on a new clean release candidate; verify review of any drift and release artifact provenance.
2. Verify current live DB snapshot and restore/rollback plan *again* immediately before a scheduled cutover. Guard login-only from publishing First Term results or modifying marks.
3. Require genuine existing teacher authentication (not a synthetic clone) and owner-approved role and school session acceptance, current signed tenant isolation, school-B denial, real logout/refresh, unassigned mark denial, active backend permissions and reliable rollback.
4. Only SaaS Core owner may select/promote a verified build; immediately recheck 5/5 anonymous routes, actual staff password-change/re-login, signed tenant and report-card protection, PM2/Nginx version and zero-loss score invariants. Roll back on any mismatch.
5. **Full academic results publication is a separate NO-GO** until official First Term exact subject maxima, genuine teacher grants and academic approvals / outstanding Exam9 coverage are reconciled without guessing missing marks.

This checkpoint is complete for source/clone QA, **NOT for live production release**. No evidence has been fabricated to bypass signed full-application release gates.
