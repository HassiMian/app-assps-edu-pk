# ASSPS Foundation Local Progress Report

Date: 2026-09-14

Status: `LOCAL_FOUNDATION_GATES_ADDED_NO_DEPLOY`

## Scope

User approved local foundation work only. No production deploy, no production database writes, no feature redesign, and no live data mutation were performed.

The work focused on release discipline, source/auth safety evidence, and deployment guardrails for the existing production school SaaS repository.

## What Changed Locally

- Added release manifest tooling under `ops/`.
- Added local verification tooling under `ops/`.
- Added offline production auth behavior tests.
- Added deployment safety tests.
- Hardened the production deploy helper so apply mode now requires:
  - explicit host
  - explicit SSH key
  - known-host file
  - `-ConfirmProduction`
  - strict SSH host key checking
  - native command exit-code checks
  - backend preflight for `NODE_ENV=production`
  - backend preflight for `AUTO_MIGRATE_ON_BOOT=false`
- Hardened live route contract checker.
- Updated `.gitignore` for local secrets, private keys, SQL backups, and runtime snapshots.
- Updated the foundation master plan and deployment/ops notes.

## Validation

`npm run verify:local`

- Production safety check: PASS.
- Backend and ops syntax check: PASS, 64 files checked without executing them.
- PowerShell deploy helper parse: PASS.
- Ops regression tests: PASS, 11 passed, 0 failed.
- Frontend build: PASS, 2318 modules transformed.

`npm run live:contract`

- `https://app.assps.edu.pk`: 200.
- `https://api.assps.edu.pk/health`: 200.
- `https://apex.assps.edu.pk`: 307.
- Protected app/api and api/api routes without token: 401.
- Protected app/api and api/api student route with `mock-jwt-token`: 401.

`npm run release:manifest`

- PASS.
- Current dirty tree inventory: 63 changed files.
- Output is inventory only. It does not approve any file for deployment.

`npm run deploy:production:dry-run`

- PASS.
- Safety lint ran.
- Planned steps printed.
- No remote copy, restart, file deletion, or production change occurred.

## Specialist Counseling Incorporated

Release/Ops:

- Native command failures must fail closed.
- No npm command should auto-confirm production deployment.
- SSH host identity must be verified through known hosts.
- Backend restarts must not run when auto-migrations are enabled.
- Static checks must be paired with behavior tests and route contracts.

Mobile/Print:

- Build a shared A4 print lifecycle instead of repeated one-off fixes.
- Add authenticated mobile smoke tests for real modules and common phone widths.
- Keep desktop tables dense, but make mobile views intentional cards or compact rows.

Security/Data:

- Current offline auth tests prove key production guard behavior.
- Full role/tenant isolation still needs fixture-backed tests.
- Bulk fee/student operations need read-only reconciliation before writes.

## Remaining Blockers Before Production Deployment

- The repo has many unrelated modified files. A minimal release candidate has not been selected yet.
- Role/tenant regression matrix is not complete.
- Backend dependency staging is not solved for a safe production deploy.
- Deploy activation is not yet fully atomic.
- Readiness health checks still need route-level proof, not only `/health`.
- Rollback command has to be proven against the actual production layout before apply.
- Production host identity and known-host evidence must be configured through `ASSPS_DEPLOY_HOST`, `ASSPS_DEPLOY_SSH_KEY`, and `ASSPS_DEPLOY_KNOWN_HOSTS`.

## Recommended Next Step

Select the smallest next release candidate from the manifest, then run targeted smoke tests for only those files. Do not deploy until the release candidate is reviewed and the deployment blockers above are closed.

## RC1 Selection

RC1 has now been selected as a local-only foundation gate release candidate:

- `runtime/ASSPS_RELEASE_CANDIDATE_RC1_20260914.md`

RC1 includes only ops/release tooling, docs, `.gitignore`, and package scripts. It explicitly excludes all current `al-siddique-backend/**` and `al-siddique-frontend/**` behavior changes from this release bucket.

## RC2 Security/Source Authority

RC2 local security guard work has started and is documented here:

- `runtime/ASSPS_RELEASE_CANDIDATE_RC2_SECURITY_SOURCE_AUTHORITY_20260914.md`

Local fixes added:

- production demo login disabled regardless of accidental `DEMO_LOGIN_ENABLED=true`;
- production service-token auth now requires explicit identity, tenant, and school claims;
- service-token tenant mismatch fails closed;
- dashboard critical DB failures now return `503` instead of silently returning zero metrics;
- production safety and auth tests cover these guards.

Validation after RC2 guard changes:

- `node --test ops/tests/*.test.js`: 13 passed, 0 failed.
- `npm run verify:local`: PASS.
- `npm run live:contract`: PASS.
