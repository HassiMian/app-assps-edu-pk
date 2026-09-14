# ASSPS Release Candidate RC1 - Local Foundation Gates

Date: 2026-09-14

Status: `RC1_SELECTED_LOCAL_ONLY_NO_DEPLOY`

## Decision

RC1 is intentionally small.

It contains only local release/ops safety tooling, documentation, and ignore hygiene. It does not include product UI, backend route, database migration, student, fee, attendance, notification, or paper-generator behavior changes.

This keeps real school workflows out of the first foundation release bucket until each module gets its own targeted review and smoke test.

## Include In RC1

Local release and ops tooling:

- `ops/deploy-production.ps1`
- `ops/live-route-contract-check.js`
- `ops/production-safety-check.js`
- `ops/release-candidate-manifest.js`
- `ops/verify-local.js`
- `ops/tests/deploy-script.test.js`
- `ops/tests/production-auth.test.js`
- `ops/tests/release-manifest.test.js`
- `ops/README.md`

Root release plumbing:

- `package.json`
- `.gitignore`
- `DEPLOYMENT.md`

Runtime planning reports, not deploy artifacts:

- `runtime/ASSPS_FOUNDATION_MASTER_PLAN_20260912.md`
- `runtime/ASSPS_FOUNDATION_LOCAL_PROGRESS_20260914.md`
- `runtime/ASSPS_RELEASE_CANDIDATE_RC1_20260914.md`

## Exclude From RC1

All current app behavior/source changes are excluded from RC1 and require separate targeted review:

- `al-siddique-backend/**`
- `al-siddique-frontend/**`

Reason:

- They include high-risk auth, route, DB, fee, attendance, student, dashboard, paper, notification, and mobile changes.
- The current dirty tree has too much mixed scope for one safe production release.
- Real school data is active, so broad deploy is not acceptable without module-by-module acceptance.

## Validation Completed

`npm run verify:local`

- Production safety check: PASS.
- Backend and ops syntax check: PASS, 64 files checked without executing them.
- PowerShell deploy helper parse: PASS.
- Ops regression tests: PASS, 11 passed, 0 failed.
- Frontend production build: PASS.

`npm run live:contract`

- app frontend: PASS, 200.
- api health: PASS, 200.
- apex root redirect: PASS, 307.
- app/api protected routes without token: PASS, 401.
- api/api protected routes without token: PASS, 401.
- app/api student route with `mock-jwt-token`: PASS, 401.
- api/api student route with `mock-jwt-token`: PASS, 401.

`npm run deploy:production:dry-run`

- PASS.
- No production copy, restart, or data mutation.

`npm run release:manifest`

- PASS.
- Current dirty tree count: 63 files.
- Review-risk files: 57.
- Runtime/report files: 6.

## RC1 Guarantees

RC1 improves local safety gates. It does not claim that the SaaS product changes are production accepted.

RC1 proves:

- production mock-token behavior is tested locally;
- deploy helper cannot auto-confirm production from npm;
- deploy helper requires explicit production identity and strict known-host checking;
- native command failures in the deploy helper fail closed;
- release inventory does not corrupt filenames or silently approve unknown files;
- live protected routes reject unauthenticated and mock-token requests.

## RC1 Non-Guarantees

RC1 does not prove:

- full tenant isolation;
- parent/student/teacher IDOR safety;
- fee/challan correctness;
- attendance mobile correctness;
- daily diary behavior;
- notification delivery truth;
- database migration safety;
- production deployment atomicity.

Those remain separate phases.

## Next Release Buckets

RC2 should be selected only after choosing one narrow product area.

Recommended order:

1. `RC2-security-auth-source-authority`
2. `RC3-fee-challan-readonly-audit`
3. `RC4-mobile-attendance-student-challan`
4. `RC5-daily-diary-print-save`
5. `RC6-notification-truth-and-audit`

Each bucket should have its own:

- included file list;
- excluded file list;
- targeted tests;
- live read-only contract;
- rollback note;
- explicit deploy decision.

## Final Position

`RC1_READY_FOR_HUMAN_REVIEW_NO_DEPLOY`

No production deployment should occur until the operator explicitly approves a reviewed release candidate and production access identity is proven.
