# ASSPS Architecture V1 — Post-release Question Bank Scope Hardening

Date: 2026-10-07
Scope: Question Bank governance/teacher visibility plus active backend runtime drift reconciliation. No unrelated SaaS modules changed.

## Defect closed

The governance lifecycle was authoritative, but the legacy teacher list still filtered on `question_bank.is_approved=true`. A linked legacy question promoted Candidate -> Reviewed -> Ready therefore remained hidden from assigned teachers because `transitionQuestionLifecycle()` did not project Ready/Retired status back to the compatibility row.

The lifecycle service now keeps governance as source of truth while projecting only compatibility visibility: Ready => linked legacy `is_approved=true`; Retired => linked legacy `is_approved=false`. Candidate and Reviewed remain teacher-hidden. Teacher mutation permissions remain denied.

## Test safety correction

The previous `question-bank-teacher-scope.test.js` defaulted to production port 5000 and production `.env`, created synthetic records through the production API, and assumed admin legacy POST created immediately approved questions. It was replaced with a fail-closed integration test that requires `NODE_ENV=test`, rejects `DB_NAME=apexos`, starts an isolated Express server, uses a disposable production clone, and proves Candidate -> Reviewed -> Ready -> Retired behavior.

Evidence on disposable clone:
- Question Bank governance HTTP: 9/9 PASS
- AI import governance HTTP: 9/9 PASS
- Legacy governance HTTP: 8/8 PASS
- Teacher lifecycle/scope: 10/10 PASS
- G40 staged portal-create HTTP: 4/4 PASS
- G43/G44 projection + production-safety: 7/7 PASS
- Alternate-port backend release smoke: PASS

## Active runtime drift audit

PM2 production executable is `/var/www/apex-backend/src/server.js`, cwd `/var/www/apex-backend`, `PORT=5000`, `NODE_ENV=production`.

A hash audit of active source (`config`, `middleware`, `routes`, `services`, `shared`, `server.js`) against release `55778ff...` found one production-loaded drift: `services/paperStudioProjectionService.js` was still the exact older known blob from `ef627e5/a59ed83`, while release metadata claimed G43/G44. The expected G43 metadata-only projection was verified by G40/G43/G44 tests and then scoped-synced. No broad rsync or deletion of unknown runtime files was used.

After deployment, active runtime source hash audit against `fe610e3e7d86554297a603a3d0d2a08edbe6a7d4` reported 289 active source files, 0 modified, 0 missing.

## Production closure

Backend release: `fe610e3e7d86554297a603a3d0d2a08edbe6a7d4` (`harden/archv1-qbank-scope-20261007`).
Production release smoke: PASS.
Production school smoke: PASS for school 1, class Eight, section Blue.
Production QBank read-only integrity after deploy: legacy=59, masters=59, revisions=59, lifecycle candidate=59. No synthetic production mutation was used.

Rollback snapshot: `/var/backups/assps-qbank-scope-predeploy-20261007T144731Z`.
Backend tar SHA-256: `5a549820015cb047bae3f2a7faa8c30bde0b801fe4720f66b92e1b242bf695de`.
DB dump SHA-256: `34b47e35526e7249f884c0795ca78a37b52118c69a1ebbef95bf4e7b3fdb9e9e`.
