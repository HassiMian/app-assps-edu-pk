# ASSPS Core integration of Results Phase11 printer and record guards

Date: 10 October 2026. **Release status: NO-GO, production unchanged.**

## Integration lineage and ownership
- Core integrated Results Phase10 clean HEAD: `d7b38c6cdd3fa3064fc78333a9bd9fc43502222d` (`release/core-integration-gates-20261010`).
- Independently verified Results owner Phase11 clean pushed SHA: `3303cad03b01189a3da9c114f77addd6a5d01e9c` (`feat/results-printer-neutral-auth-acceptance-phase11-20261010`).
- Created separate review-only worktree `/root/workspace/assps-core-resultprinter-phase11-20261010` based *directly on Core's integrated Phase10 source*; applied ONLY the exact Phase10->Phase11 delta of nine Results-owned frontend/synthetic QA paths plus one Result owner evidence document. No Paper/Grade/Connect/Core auth/DB/RLS/PM2/Nginx mutation and no original protected school papers/template baselines touched.
- This selective cherry-port is needed: do **not** replace current Core with the earlier Result feature branch wholesale, as that branch has different ancestry and must not regress independent owner fixes.

## Print-device behavior and limitations
Native OS/browser printer dialog opens when teacher selects `Print · Choose Printer`; user can choose any installed USB, Wi-Fi, LAN/network/shared printer using that computer's configured OS driver/spooler; A4 portrait and print scale explained; no fixed printer ID/model/port is stored or silently used. Browser print support unavailable, unrendered official SaaS school logo, ungraded/missing records or overlong page data fail closed before Print. All nine designs are preserved. This is an OS-native print path, **not** direct cross-origin/remote printer queue management. There is no CUPS spooler on VPS. Attached Windows workstation remained `STANDBY` and Get-Printer was not executed on Windows; cannot certify physical hardware, queue state or paper output.

## Actual executed PASS (ON THIS NEW combined Core source)
- `node scripts/test-nine-premium-mark-accuracy.mjs`, `node scripts/test-result-print-planning.mjs`, `node scripts/test-result-student-identity.mjs`, `node scripts/test-live-result-access-boundary.mjs`, `npm run verify:templates`: ALL EXIT0; `/tmp/assps-core-resultprinter-data.log`. Live anonymous 4 result APIs HTTP401; NO logged-in session, real data or signed tenant role acceptance.
- `node scripts/test-result-designer-real-browser.mjs`, `node scripts/test-nine-result-print-overflow-guard.mjs`: real Chromium UI printer button and 3-student popup, distinct PDF action, invalid grading/missing ID/subject/official-logo blocking, teacher comments preserved; good print once / overlong block / no-print-API block. ALL EXIT0; `/tmp/assps-core-resultprinter-browser.log`.
- `CARDS=25 node scripts/test-result-batch-pdf-a4.mjs` and `RESULT_EXTRA_SUBJECTS=1 node scripts/test-premium-result-a4.mjs`: exactly **25 PDFs pages for 25 synthetic students** across nine styles; 9/9 twelve-subject A4 fits, EXIT0; `/tmp/assps-core-resultprinter-a4.log`.
- `npm run build` and scoped ESLint: EXIT0; `/tmp/assps-core-resultprinter-build.log`, optimized frontend build 3.15s.
- `git diff --check` and original protected source SHA files unchanged.

## Explicit production blockers, NOT CERTIFIED
The official consolidated SaaS Core owner issue #4 document `6092544879`, and later Core Results integration checkpoint `6092905209`, both state `RELEASE_CERTIFIED=FALSE`, `PRODUCTION_DEPLOYMENT=HOLD`. Authentic independently password-authenticated restricted Node/JWT+PostgreSQL tenant-role tests cannot be completed because the disposable RLS login has no authorized SCRAM credential; no bypass or secret fabrication. Real tenant/student/teacher authenticated negative matrix and grade data acceptance require a user-approved signed-in session. Live private-upload ingress checker reported five unsafe aliases among seven sites; staged configuration testing is not live remediation. Current Windows PC disconnected/standby, so printer enumeration/spool and actual page proof cannot be performed. Source-only integration DOES NOT grant authority to deploy, reload Nginx, restart backend or alter live DB/grades.

### Definitive handoff
- Core release owner: provision independent restricted test account credentials through authorized secure credential flow, then execute real signed Node/Postgres tenant/role matrix; verify/migrate live private upload security with tested rollback and production catalog policies. Avoid broad production changes until certification.
- School owner: reconnect printer-attached machine; open already-authorized school session to compare actual stored marks/grade bands against result card and select installed printer; prove A4 physical pages.
- Only upon positive Core release certificate: include this exact combined Core branch, complete source ancestry/backups/rollback and controlled deployment. Until then existing live app remains unchanged.
