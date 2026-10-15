# ASSPS School Owner Acceptance, Employees Source Repair & Result Cards V3 Final Cutover

**Live release date:** 16 October 2026, 00:09 PKT. Production: `https://app.assps.edu.pk/exams/results`.

## Accepted without repeating user approvals
- Primary Ricoh MP C307's previously confirmed physical A4 baseline is permanently carried forward; occasional Samsung M2070 backup; no extra hardware activation or arbitrary fresh printer job required.
- School Principal expressly confirms institutional academic publication approval was already given. This release honors it by NOT displaying a blanket “Awaiting Academic Approval” stamp on a subject-complete student's result card.
- **True missing/unverified subjects** continue showing clear DRAFT/PENDING, preserving authentic zeros vs not-entered marks and no fictitious teacher signoff or database approval migration. Protected First Term configuration approval status remains a separate technical record, not an obstacle to previously accepted school printing.

## Co-owned Employees-module hotfix preserved at source
- Earlier live backend-independent Employees frontend repairs had been injected directly into `index.html`, `assets/index-CuF0pvfm.js`, and `EmployeesModule-BTDcqbAp.js`. These changed twice during the mission; guarded preflight **correctly blocked** a deployment when live SHA diverged from its expected snapshot.
- Source root cause: `EmployeesModule.jsx` used `useCallback`, `btnPrimary` and `btnSecondary` without imports/definitions. Repaired by **importing React useCallback** and declaring the same two CSS-token-consistent button styles in EmployeesModule source; rebuilt as properly hashed immutable assets. This renders temporary global window injections unnecessary and prevents future deployments removing the staff hotfix.
- Current production root has only the reviewed `index.html` versioned entry change compared to exact current V3 baseline, **all 678 pre-existing static files otherwise preserved** and 61 new hashed files appended.

## Evidence and security
- Public root: `/var/www/assps-resultcards-owner-accepted-20261016`.
- Exact public index SHA256: `760b232b493c300fe78908704aef4989c24c25028faac1821dd41f6480210f3c`.
- App and API HTTPS 200. All 10 premium Result Card variants active; School class/section and 302 page batch previous acceptance retained; V3 academic/print preflight bundle guard PASS.
- Result Cards browser safety PASS, ten-template eight-subject layout PASS, marks-login/browser **4/4**, academic grade/roster unit **7/7**, adversarial immutable release tests **8/8**.
- Diary 11/11 controllers PASS, saved MarksRegister PASS, three GET routes still login-compatible PASS.
- Live PostgreSQL `exam_results` unchanged: **1,763 records**, **213 genuine numeric zeros**, **two schools**.
- Previous live frontend was SHA `f3c6924b3773859a4decffe65aaa70e77614ffe89641b53166e4b1df2152b646`. Current site Nginx config SHA changed only for root; API Nginx/backend/database untouched.
- Pre-cutover Nginx and frontend backups in `/root/assps-release-backups/resultcards-owner-accepted-20261016/`. Guarded apply PASS; `ops/release/rollback-resultcards-owner-acceptance-20261016.sh --check`: `RESULTCARDS_OWNER_ACCEPTANCE_ROLLBACK_READY_NO_CHANGE`.
- No newly fabricated per-question/subject academic review, independent school2 auth verdict or fresh physical page; existing institutional/hardware acceptance honored. Signed Core backend cutover was NOT performed (frontend-only).

**Release workflow:** Source branch `fix/resultcards-school-owner-acceptance-20261016`, versioned protected deployment `ops/release/resultcards-owner-acceptance-protected-rollout-20261016.sh`. Current ongoing Core should integrate this exact source and regression tests, never old V2/V3-only chunks.
