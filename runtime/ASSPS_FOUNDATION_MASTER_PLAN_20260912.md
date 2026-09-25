# ASSPS SaaS Foundation Master Plan

Date: 2026-09-12
Last updated: 2026-09-14

Status: LOCAL_FOUNDATION_GATES_ADDED_NO_DEPLOY

## Operating Rule

This platform contains real AL SIDDIQUE SCHOLARS PUBLIC SCHOOL data. All foundation work must preserve data integrity, avoid broad redesign, and keep production deployment separate from local planning and development.

No production deploy is approved by this plan.

## Powerful Master Prompt

You are improving an existing production school SaaS used for real school operations at:

- app.assps.edu.pk
- api.assps.edu.pk
- apex.assps.edu.pk

Treat this as a live school operating system, not a demo app.

Primary objective:

Make the platform more reliable, simpler for daily school work, safer for real student/fee/staff data, cleaner for development, and easier to operate without breaking existing workflows.

Hard constraints:

- Do not deploy without explicit approval.
- Do not modify production DB without an approved backup and rollback path.
- Do not introduce demo/mock data into production behavior.
- Do not weaken role controls, tenant/school isolation, or approval gates.
- Keep current architecture unless a change directly removes risk or operational pain.
- Every production-facing change must have syntax/build checks and a smoke test.
- Every high-risk workflow must show source authority, audit trail, and recovery path.

Specialist review lenses:

1. Release/Ops:
   Atomic deploys, dry-run, rollback, health checks, TLS monitoring, PM2/Nginx/Cloudflare, repo hygiene.

2. Security/Data:
   Auth, role isolation, tenant isolation, IDOR, mock/demo removal, notification truth, audit logs, backups.

3. Frontend/UX:
   Mobile-first workflows, print reliability, module error boundaries, clear navigation, fast daily actions.

4. Product/School Ops:
   Principal/admin/teacher/accountant daily workflows, fewer clicks, safer bulk actions, stronger reporting.

Expected output:

- Evidence-backed findings.
- P0/P1/P2 execution phases.
- Exact safety gates before deploy.
- No vague redesign.
- No deployment until approved.

## What This Platform Is

ASSPS SaaS is a real school operations platform with:

- React/Vite frontend for app.assps.edu.pk.
- Express/PostgreSQL backend behind `/api`.
- Cloudflare/Nginx/PM2 production runtime.
- Modules for students, families, admissions, attendance, fees, exams, paper generation, timetable, employees, notifications, transport, expenses, cards, settings, and academic setup.
- Super app / apex surface on apex.assps.edu.pk and api.assps.edu.pk.

The product is already powerful, but its main risk is not missing features. Its main risk is operational trust:

- Is this data live or demo?
- Did this bulk action really write correctly?
- Can this be rolled back?
- Will the mobile view work for teachers?
- Will print output work under real office pressure?
- Will a small deploy break unrelated modules?

## Current Foundation Signals

Good signals:

- Protected live API routes return 401 without authentication.
- Mock token bypass has been repaired in production.
- Production safety preflight exists locally.
- Frontend build passes.
- Deployment helper supports dry-run and now requires explicit production confirmation, explicit host, strict known-host checking, and backend production-env preflight before apply.
- Student/fees/attendance modules have role gates.
- Error boundaries prevent full blank-screen collapse.
- Local release manifest inventory exists and treats every high-risk or unknown changed file as review-required.
- Local verifier now runs static safety, backend/ops syntax checks, PowerShell deploy-script parsing, ops regression tests, and frontend build.

Risk signals:

- Repo is dirty and noisy with many modified files.
- Backend has had duplicate runtime tree drift between `/src` and active runtime root.
- Some mock/demo/localStorage behavior still exists in source and must remain production-gated or be split out.
- Health route contracts are not fully aligned across docs, deploy script, and live endpoints.
- Print workflows are fixed case-by-case rather than through one shared print engine.
- Mobile tables still need systematic responsive design.
- Role-scoped IDOR regression tests need real fixture strategy.
- The production deploy helper is safer but is still not an approved atomic deployment system. Backend dependency staging, runtime readiness checks, and rollback activation remain P0/P1 work before any real deploy.
- Health endpoints prove process reachability but not full route readiness. Critical route-contract checks must remain separate.

## Specialist Counseling Summary - 2026-09-14

Release/Ops review:

- Native command failures in PowerShell deployment scripts can continue unless `$LASTEXITCODE` is checked. This is now guarded in the local helper.
- Auto-confirming production deployment from an npm script is unsafe. The npm script no longer passes `-ConfirmProduction`.
- SSH must use strict host key verification. The helper now requires strict known-host checking for apply mode.
- Backend deploy must not restart a runtime where production env and `AUTO_MIGRATE_ON_BOOT=false` are not proven.
- Static source checks are useful but not enough. Behavior tests and route contracts are now part of local verification.

Mobile/print review:

- Existing print screens should converge on a shared A4 print lifecycle instead of one-off popup fixes.
- Mobile tables still need real authenticated module smoke tests across 375/390/430/768 widths and desktop.
- Attendance/challan/student workflows need stale-filter and role-scoped checks before release.

Security/test review:

- A third auth-test agent could not complete because of quota, so the auth behavior tests were implemented directly in this repo.
- Current auth tests are offline and synthetic. They prove key production guard behavior without network or DB writes, but they do not replace full role/tenant fixture tests.

## Local Work Completed - 2026-09-14

- Added `ops/release-candidate-manifest.js` with porcelain `-z` parsing so filenames, renames, and leading status spaces are not corrupted.
- Added release manifest tests for leading status padding, renames, unusual filenames, runtime exclusions, and unclassified review handling.
- Added `ops/verify-local.js`.
- Added production auth behavior tests:
  - production refuses to load without `JWT_SECRET`
  - missing token returns 401
  - `mock-jwt-token` returns 401 in production even if demo flag is enabled
  - valid active user plus active school reaches middleware `next()`
- Added deploy helper tests:
  - deploy npm script does not auto-confirm production execution
  - deploy helper checks native command failures
  - deploy helper requires explicit host and strict host key checking
  - backend preflight checks production env and disabled auto migrations
- Hardened `ops/deploy-production.ps1`:
  - no hardcoded default production host
  - no automatic npm-level confirmation
  - strict SSH known-host checking for apply mode
  - explicit host/key/known-host checks for apply mode
  - native command exit-code checks
  - backend preflight for `NODE_ENV=production` and `AUTO_MIGRATE_ON_BOOT=false`
- Hardened `ops/live-route-contract-check.js` with per-request deadlines and immediate output.
- Added git hygiene ignores for local secrets, private keys, SQL backups, and runtime server snapshots while preserving `.env.example` templates.

Validation evidence:

- `npm run verify:local` PASS.
- Backend/ops syntax check: 64 files PASS, not executed.
- PowerShell deploy script parse: PASS.
- Ops regression tests: 11 passed, 0 failed.
- Frontend production build: PASS, 2318 modules transformed.
- `npm run live:contract` PASS:
  - `app.assps.edu.pk` 200
  - `api.assps.edu.pk/health` 200
  - `apex.assps.edu.pk` 307
  - app/api and api/api protected routes without token return 401
  - app/api and api/api student route with `mock-jwt-token` returns 401
- `npm run release:manifest` PASS, currently reports 63 changed files and no file is approved by inventory alone.
- `npm run deploy:production:dry-run` PASS, no production changes.

Deployment status:

- No production deployment was executed.
- No production DB writes were executed.
- Current work is local release/security tooling only.
- RC1 has been selected as `LOCAL_FOUNDATION_GATES` in `runtime/ASSPS_RELEASE_CANDIDATE_RC1_20260914.md`.
- RC1 excludes all current backend/frontend behavior changes until they receive separate module-level review.
- RC2 security/source-authority local guards are documented in `runtime/ASSPS_RELEASE_CANDIDATE_RC2_SECURITY_SOURCE_AUTHORITY_20260914.md`.
- RC2 added local fail-closed guards for production demo login, service-token claims, and dashboard DB-source failure behavior.

## Execution Blueprint

### Phase 0 - Freeze And Baseline

Goal: create a trusted baseline before more changes.

Actions:

- Do not deploy.
- Do not add new feature work.
- Capture current git status.
- Separate modified files into buckets:
  - production safety
  - mobile/print fixes
  - JARVIS integration
  - old runtime reports
  - experiments
- Decide which files are allowed into the next release.
- Keep `runtime/` reports out of deploy artifacts.

Acceptance:

- A reviewed release candidate file list exists.
- Unrelated work is not mixed into urgent hotfixes.

### Phase 1 - Release Discipline

Goal: make every deployment boring, repeatable, and reversible.

Actions:

- Keep `npm run production:safety` mandatory in dry-run and deploy.
- Add one command for:
  - frontend build
  - backend syntax check
  - production safety check
  - smoke checklist
- Add rollback documentation for:
  - frontend `/var/www/apex-os.bak-*`
  - backend `/var/www/apex-backend.bak-*`
- Add route-contract check list:
  - app frontend 200
  - api health 200
  - protected route no-token 401
  - protected route mock-token 401
  - critical SPA routes render login or module shell
- Add TLS expiry check for app/api/apex.

Acceptance:

- Dry-run shows exact commands.
- Deploy cannot proceed if safety check fails.
- Rollback path is documented before deploy.

### Phase 2 - Source Authority And Demo Cleanup

Goal: no operator confusion between real, cached, local, and demo data.

Actions:

- Add a shared source badge contract:
  - Live DB
  - Local Draft
  - Cached
  - Failed
  - Demo Disabled
- Apply first to:
  - Notifications
  - Fees/challans
  - Paper Generator daily diary
  - Dashboard cards
- Move demo/local fallback code behind explicit dev-only modules over time.
- Ensure production startup fails if dangerous demo flags are enabled.

Acceptance:

- Production UI never silently shows mock recipients or fake sent logs.
- Any local draft is visibly local and not counted as server notification.

### Phase 3 - Data Integrity For School Money And Records

Goal: bulk fee/student operations become auditable and reversible.

Actions:

- Add read-only challan audit command:
  - active students
  - challan count
  - missing challans
  - duplicates
  - arrears mismatch
  - inactive student included
- Add pre-generation preview:
  - monthly fee
  - previous arrears
  - discount
  - payable total
  - excluded inactive students
- Add audit events for:
  - challan generation
  - payment update
  - student class/section change
  - active/inactive status change
  - attendance edits

Acceptance:

- Bulk fee action has preview before write.
- Post-generation reconciliation returns clean or exact exceptions.

### Phase 4 - Mobile-First School Workflows

Goal: teachers and office staff can use core tasks on phones without table collapse.

Actions:

- Convert mobile tables into compact cards for:
  - Student records
  - View challans
  - Mark attendance
  - Daily diary saved list
  - Notifications recipient list
- Keep desktop tables dense and fast.
- Add mobile smoke script for key routes.

Acceptance:

- Student names, father names, fee status, class/section, and action buttons fit on mobile without broken wrapping.
- Mark Attendance class/section options are consistent on desktop and mobile.

### Phase 5 - Shared Print Engine

Goal: stop fixing each print screen manually.

Actions:

- Create a shared print utility/spec for:
  - A4 portrait/landscape
  - safe margins
  - logo sizing
  - header info box
  - table sizing
  - popup open timing
  - print preview fallback
- Migrate gradually:
  - Daily Diary
  - Performance Sheet
  - Fee voucher
  - Result card
  - Admission print
- Add print smoke checks:
  - popup created
  - no blank window
  - content contains expected title
  - print CSS contains expected page size/margins

Acceptance:

- Print output is predictable on A4.
- Heavy pages do not freeze the browser before preview.

### Phase 6 - Role Security Regression

Goal: prove privacy, not just assume it.

Actions:

- Build test fixtures or token strategy for:
  - principal/admin
  - accountant
  - teacher
  - parent
  - student
- Test:
  - no token -> 401
  - invalid token -> 401
  - mock token -> 401
  - parent cannot access another child
  - student cannot access another student
  - teacher cannot access unassigned records
  - accountant cannot change academic records
  - tenant/school ID swap blocked

Acceptance:

- Security matrix can run before production deploy.

### Phase 7 - Daily Command Center

Goal: make the app simpler and more useful for the principal.

Actions:

- Build a single daily operations view:
  - attendance not marked
  - absent/late count
  - fee due today
  - unpaid/partial challans
  - new admissions
  - pending diary/paper tasks
  - failed notifications
  - system health
- Every card links to the exact action.
- No decorative marketing UI; quiet operational dashboard.

Acceptance:

- Principal can understand school status in under one minute.
- Each urgent card has one clear next action.

## Suggested Feature Additions

Only after foundation phases:

- Fee generation assistant with preview/reconcile.
- Parent communication inbox with source-backed templates.
- Teacher daily mode: attendance + diary + homework + assessments.
- Student timeline: fees, attendance, results, notes, documents.
- Admin audit center: what changed, who changed, when, rollback note.
- System health center: API, DB, backups, SSL, PM2, queues.

## Do Not Do Yet

- Do not redesign the whole UI.
- Do not merge JARVIS deeper into production data until SaaS role/source authority is proven.
- Do not add automation that sends real messages without approval.
- Do not add bulk write features without preview, backup, and audit.
- Do not deploy until release candidate is clean.

## Immediate Next Local Execution

Recommended next safe implementation, no deploy:

1. Review the 59 changed files from `npm run release:manifest` and decide the smallest release candidate set.
2. Add real role/tenant fixture tests for principal/admin/accountant/teacher/parent/student.
3. Add read-only data integrity audit commands for fees/challans, attendance, notifications, and diaries before any write feature.
4. Prepare the shared print lifecycle for A4 output and migrate one print workflow at a time.
5. Prepare mobile authenticated smoke tests for Student Records, View Challans, Mark Attendance, and Daily Diary.
6. Improve deploy architecture before any apply:
   - staged dependency install
   - readiness route contract after restart
   - atomic frontend/backend activation
   - verified rollback command
   - explicit production host identity and known-host proof.

## Final Principle

ASSPS should feel like a calm school control room:

- real data clearly labeled
- every bulk action previewed
- every change auditable
- every deploy reversible
- every mobile workflow usable
- every print output predictable
