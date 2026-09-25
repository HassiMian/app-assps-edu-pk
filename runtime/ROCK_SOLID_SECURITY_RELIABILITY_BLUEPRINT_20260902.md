# ASSPS Rock Solid Security & Reliability Blueprint

Date: 2026-09-02

## Immediate Fixes Completed

### Daily Diary Print Margin

Issue:

- Daily Diary print output used near-zero browser margins.
- A4 content width plus internal padding could clip or shift on real printers.

Fix applied:

- `DailyDiaryFeature.jsx` print CSS now uses A4 portrait with `4mm` page margin.
- Printable sheet width now uses `width: 100%` with `max-width: 202mm`.
- Popup/print-window CSS and normal print media CSS were both aligned.

Verification:

- Frontend build passed.
- Production deploy completed to `/var/www/apex-os`.
- Production asset contains `@page { margin:4mm }` and `max-width:202mm`.
- `https://app.assps.edu.pk/paper-generator` returns HTTP 200 and unauthenticated smoke renders login without console errors.

### Critical Mock Token Auth Bypass

Issue:

- Protected endpoints on both `app.assps.edu.pk` and `api.assps.edu.pk` accepted:
  - `Authorization: Bearer mock-jwt-token`
- This exposed protected APIs with a hardcoded mock/service identity path.

Fix applied:

- Removed unconditional `mock-jwt-token` acceptance from the active production runtime file:
  - `/var/www/apex-backend/middleware/auth.js`
- JARVIS service identity now requires the real server-side `JARVIS_SCHOOL_SERVICE_TOKEN`.
- `DEMO_LOGIN_ENABLED=false` is explicitly set in production runtime config.
- JWT verification logging no longer prints secret or token snippets.

Verification:

- `mock-jwt-token` now returns HTTP 401 for protected routes on both domains.
- Random invalid bearer token returns HTTP 401.
- No-token protected route checks return HTTP 401.
- PM2 process `apex-backend` is online.

### Production Demo UI And Mock Login Removal

Issue:

- Production login page showed an "Auto-fill Demo Sandbox" button.
- Frontend API fallback could create a browser-side mock login response if demo fallback was allowed.
- Even when guarded, shipping this code/text in production reduced trust and increased accidental exposure risk.

Fix applied:

- Removed the demo autofill button and handler from `LoginPage.jsx`.
- Removed frontend mock login fallback from `api.js`.
- Added an additional production guard around backend mock-token demo auth logic.

Verification:

- Production login smoke shows `hasDemo=false`.
- Current deployed entry JS scan shows no targeted demo/mock-login strings.
- Protected routes still return `401` for `Bearer mock-jwt-token`.

### Notification Center Fake Delivery Guard

Issue:

- Notification Center contained hardcoded mock recipients.
- If backend sending failed, the UI could still create simulated "sent" logs.
- This could make fake notification data appear operationally real.

Fix applied:

- Production host now blocks mock-recipient preview/send flows.
- Backend send calls now use the authenticated API client instead of unauthenticated `fetch`.
- Simulated delivery success fallback was removed.
- Failures now show a failure toast instead of logging fake sent events.

Verification:

- Frontend build passed.
- Production bundle contains the source-backed-recipient guard.
- Unauthenticated `/notifications` still redirects to login.

## Current Evidence

Protected route checks:

```text
app.assps.edu.pk/api/students       no token -> 401
app.assps.edu.pk/api/fees           no token -> 401
app.assps.edu.pk/api/dashboard      no token -> 401
app.assps.edu.pk/api/notify/inbox   no token -> 401

api.assps.edu.pk/api/students       no token -> 401
api.assps.edu.pk/api/fees           no token -> 401
api.assps.edu.pk/api/dashboard      no token -> 401
api.assps.edu.pk/api/notify/inbox   no token -> 401

app.assps.edu.pk/api/students       mock token -> 401
app.assps.edu.pk/api/fees           mock token -> 401
app.assps.edu.pk/api/dashboard      mock token -> 401
app.assps.edu.pk/api/notify/inbox   mock token -> 401

api.assps.edu.pk/api/students       mock token -> 401
api.assps.edu.pk/api/fees           mock token -> 401
api.assps.edu.pk/api/dashboard      mock token -> 401
api.assps.edu.pk/api/notify/inbox   mock token -> 401
```

Runtime:

```text
apex-backend: online
health: success true, env production
```

## Specialist Council Findings

### Security Architect

Highest priority:

- Demo and mock paths must never work in production.
- JWT or service token snippets must never appear in logs.
- Service accounts must be scoped and audited.
- Add route-level tests for unauthenticated, malformed token, demo token, expired token, role mismatch, IDOR, and school/tenant swapping.

### Backend/API Engineer

Highest priority:

- There are duplicate runtime trees: root-level backend files and `src/` files. PM2 currently runs root-level `server.js`.
- This duplication can make fixes appear applied while production uses another copy.
- Unify the production runtime source, or make deployment copy one canonical source tree every time.

### Frontend Reliability Engineer

Highest priority:

- Module crashes must be caught and reported with exact lazy chunk/module name.
- Demo UI such as "Auto-fill Demo Sandbox" must be hidden in production.
- Print workflows need route-specific smoke tests for generated HTML, popup creation, and A4 fit.

### Data Integrity Analyst

Highest priority:

- Fees/challans need pre-generation preview and post-generation reconciliation.
- Notification bell must distinguish server-authoritative notifications from local draft/browser notifications.
- LocalStorage-generated paper notifications are likely the reason fake notification counts appear.

### DevOps/SRE

Highest priority:

- Deploys need an atomic release process.
- Every deploy must normalize static permissions: directories `755`, files `644`, owner `www-data`.
- TLS expiry monitoring is required because `api.assps.edu.pk` recently reached Cloudflare 526 due to expired origin certificate path.
- Cloudflare asset cache must be purged or asset hashes must change after failed deploys.

### Product/Ops Designer

Highest priority:

- Critical workflows should show "source of truth" labels: live DB, local draft, cached, failed, or unavailable.
- Fee generation should show before/after totals before write actions.
- Admin actions need visible audit trail and rollback instructions.

## Remaining Risks

1. Production backend has duplicate root-level and `src/` route/middleware trees.
2. Frontend still contains demo/localStorage behavior that should be production-gated.
3. Notification bell may include browser-local generated notifications instead of only DB-backed events.
4. Existing git worktree is noisy; urgent fixes can be mixed with unrelated changes.
5. Some modules still depend on optimistic local state and need source-authority labels.
6. No complete automated security regression suite exists yet for role isolation and IDOR.
7. Root SSH/password access exists; key-only non-root deploy user is safer.

## Rock Solid Execution Blueprint

### Phase 1 - Production Safety Gate

- Hide all demo sandbox UI in production builds.
- Fail startup if `DEMO_LOGIN_ENABLED=true` in production unless a dedicated non-production flag is present.
- Add tests proving `mock-jwt-token` is rejected in production.
- Remove secret/token snippets from all auth and integration logs.
- Rotate exposed/shared credentials after a stable access path is confirmed.

### Phase 2 - Notification Truth Repair

- Make production notification bell read only from `/api/notify/inbox`.
- Keep localStorage notifications only as "Local Draft" inside Paper Generator, not global bell.
- Add notification source badges:
  - Server
  - Local Draft
  - Failed Send
  - Pending Approval
- Add DB-backed notification audit page for admins.

### Phase 3 - Fee/Challan Reliability

- Add "Preview September challans" before generation:
  - active students
  - monthly fee
  - previous arrears
  - discount
  - payable total
- Add post-generation reconciliation:
  - missing challans
  - duplicate challans
  - arrears mismatch
  - inactive student included
- Keep one-click backup before bulk fee writes.

### Phase 4 - Print Reliability

- Add automated Playwright checks for:
  - Daily Diary print popup opens
  - voucher batch print popup opens
  - print CSS contains expected A4 margins
  - no blank page after lazy chunks load

### Phase 5 - Source Authority Cleanup

- Make one canonical backend source path.
- Production deploy must copy/build from that path only.
- Remove stale `src_backup`, old route copies, and temporary hotfix fragments only after backup and diff review.
- Add `.gitignore` rules for runtime reports, backups, logs, and build output.

### Phase 6 - Security Test Matrix

Authorized non-destructive tests only:

- No token -> 401.
- Invalid token -> 401.
- Hardcoded demo/mock token -> 401.
- Valid low-role token cannot access admin records.
- Parent token cannot access another parent's child.
- Student token cannot access another student.
- Teacher token can see only assigned records.
- Direct object ID swapping is blocked.
- Tenant/school ID swapping is blocked.
- Read-only service token cannot write.
- Password reset cannot disclose whether an account exists beyond safe messaging.

### Phase 7 - Operations

- Add uptime checks for:
  - app frontend
  - app API health
  - api domain TLS
  - database
  - PM2 process status
- Add daily encrypted backup and monthly restore drill.
- Add TLS expiry alert at 30, 14, and 7 days.
- Add a deployment checklist requiring smoke tests before "done".

## Recommended Next Implementation Order

1. Disable production demo UI and frontend mock session creation.
2. Build the security regression tests for mock token, role isolation, and IDOR.
3. Repair notification bell source to remove fake/localStorage data from production.
4. Create canonical deploy script and remove duplicate runtime ambiguity.
5. Add fee/challan preview and reconciliation commands.
6. Add print popup smoke tests for Daily Diary and vouchers.
7. Clean git in reviewed groups, not by deleting random files.

## Current Status

```text
DAILY_DIARY_MARGIN_FIX = DEPLOYED
APP_PROTECTED_NO_TOKEN = 401
API_PROTECTED_NO_TOKEN = 401
MOCK_TOKEN_BYPASS = FIXED
BACKEND_RUNTIME = ONLINE
PRODUCTION_DEMO_LOGIN_UI = REMOVED
FRONTEND_MOCK_LOGIN_FALLBACK = REMOVED
NOTIFICATION_SIMULATED_SEND = REMOVED
NOTIFICATION_FAKE_DATA_RISK = SOURCE_BACKED_RECIPIENT_LOADING_DEPLOYED
FULL_ROCK_SOLID_ACCEPTANCE = NOT_YET_COMPLETE
```

## Verification Update - 2026-09-02

Commands/checks completed:

```text
npm run build                                      PASS
app protected routes with mock token               401
api protected routes with mock token               401
backend health                                     success true, env production
PM2 apex-backend                                   online
login browser smoke                                hasDemo=false, console errors=0
current deployed entry JS targeted string scan     bad chunks=0
```

Production backups created before deploy/hardening:

```text
/var/www/apex-os.bak-*-before-demo-notification-hardening
/var/www/apex-os.bak-*-before-final-demo-clean
/var/www/apex-os.bak-*-before-mock-login-removal
/root/assps-code-backups/*-auth-root-hardening
/root/assps-code-backups/*-remove-hardcoded-mock
/root/assps-code-backups/*-line67-hardening
/root/assps-code-backups/*-demo-guard
```

## Implementation Update - 2026-09-02 Notification Source Authority

Scope stayed narrow: notification fake data / simulated send hardening only.

Repairs deployed:

```text
Backend notify route now exposes authenticated source-backed recipient loading:
GET /api/notify/recipients?type=attendance|fee|results|custom

Backend bulk send now supports both legacy:
{ phones, message }

and frontend per-recipient payload:
{ recipients: [{ phone, message }] }

Pakistan phone normalization fixed:
+92300..., 0092300..., 0300..., and 300... no longer become +9292...

Frontend production mode:
- no dummy/mock notification recipients are shown on app.assps.edu.pk/api.assps.edu.pk
- recipients load through /api/notify/recipients
- empty source-backed lists show a safe empty state
- simulated send fallback remains removed
```

Verification after deploy:

```text
node -c notifyRoutes.js                            PASS
npm run build                                      PASS
nginx -t                                           PASS
PM2 apex-backend                                   online
app.assps.edu.pk                                  200
api.assps.edu.pk/health                           200
app/api/whatsapp/status                           200
app protected routes without token                 401
api protected routes without token                 401
app protected routes with mock token               401
api protected routes with mock token               401
deployed JS scan for demo/mock-token strings       no bad strings detected
VPS RAM                                           3.8Gi total, 635Mi used, 3.2Gi available
```

Visual browser smoke:

```text
Playwright automation could not run because the local Playwright browser binary is not installed:
chromium_headless_shell-1148 missing.

Manual/curl smoke and production asset/API checks passed.
```

Remaining before full rock-solid acceptance:

```text
Authenticated notification recipient UI should be checked from an existing real admin browser session.
Role-scoped IDOR tests still need valid parent/student/teacher fixtures.
Canonical deployment script still needs cleanup around duplicate backend runtime paths.
WhatsApp production remains blocked by Meta production asset/public webhook readiness.
```

## Implementation Update - 2026-09-02 Route Registration And Privacy Hardening

Defects found during live smoke:

```text
/api/attendance and /api/exams returned 404 instead of 401.
Root cause: active runtime /var/www/apex-backend/middleware/auth.js was older than source and did not export:
- requireScopeForServiceOnly
- adminOrServiceScope

Because of that, attendance/exams route registration failed at startup.
```

Repairs deployed:

```text
Synced fixed auth middleware to both:
/var/www/apex-backend/src/middleware/auth.js
/var/www/apex-backend/middleware/auth.js

Hardened attendance read routes:
- parent/student list/history reads are scoped to their own linked records
- attendance analytics/report are restricted to admin/principal/teacher/service

Hardened exam routes:
- production database failures now fail closed
- mock exam/result fallback is allowed only outside production
```

Post-repair verification:

```text
app /api/attendance no-token                       401
app /api/exams no-token                            401
app /api/attendance mock-token                     401
app /api/exams mock-token                          401
api /api/attendance no-token                       401
api /api/exams no-token                            401
api /api/attendance mock-token                     401
api /api/exams mock-token                          401
PM2 apex-backend                                   online
```

## Implementation Update - 2026-09-02 WhatsApp Route Dependency Repair

Defect found:

```text
Production runtime had a partial/mixed WhatsApp service folder.
/api/whatsapp route registration previously failed because required service modules did not match:
- admissionWorkflowEngine.cjs missing in one runtime attempt
- ../../shared/entity-extractor.cjs missing in another runtime attempt
```

Repair deployed:

```text
Backed up current runtime folder:
/var/www/apex-backend/services/whatsapp.bak-*

Synced coherent WhatsApp service folder from the commissioned JARVIS candidate source.
No tokens, app secrets, webhook secrets, or Meta configuration were printed or changed.
```

Post-repair verification:

```text
app /api/whatsapp/status                           200
api /api/whatsapp/status                           200
app /api/whatsapp/webhook without verify token     403 expected
api /api/whatsapp/webhook without verify token     403 expected
PM2 apex-backend                                   online
```

Updated remaining blockers:

```text
Real authenticated admin browser check still needed for source-backed notification UX.
Role-scoped IDOR tests still need valid parent/student/teacher fixture tokens.
Canonical deployment script still needs cleanup around duplicate backend runtime paths.
Meta production WhatsApp still needs production WABA/phone/app secret/public webhook readiness.
Playwright visual smoke still needs browser binary installation before automated screenshots.
```

## Implementation Update - 2026-09-02 Auth Session Trust Hardening

Defects found:

```text
Protected-route middleware verified JWT signature but trusted role/school claims from the token payload.
If a user's role changed or account was disabled, an old access token could remain valid until expiry.

Auth route school lookup could still return a development mock school on database errors.
Demo fallback around a missing users table was not strictly limited to non-production paths.
```

Repairs deployed:

```text
Protected-route middleware now rehydrates normal users from the production users table on every request.
Disabled/missing users fail closed with 401.
DB role/school identity is authoritative over JWT payload claims.
Virtual branch signed sessions remain supported through settings lookup.
Service-token machine identity path remains separate and scoped.

Production school lookup now fails closed on database errors.
Development mock school fallback remains available only outside production.
Production demo fallback on missing users table is blocked.
JWT failure logs are sanitized to avoid noisy/sensitive token parsing output.

Synced hardened files to both active runtime paths:
/var/www/apex-backend/src/middleware/auth.js
/var/www/apex-backend/middleware/auth.js
/var/www/apex-backend/src/routes/authRoutes.js
/var/www/apex-backend/routes/authRoutes.js
```

Post-repair verification:

```text
node -c auth.js                                    PASS
node -c authRoutes.js                              PASS
PM2 apex-backend                                   online

app /api/students no-token                         401
app /api/fees no-token                             401
app /api/attendance no-token                       401
app /api/exams no-token                            401
app /api/notify/recipients no-token                401

api /api/students no-token                         401
api /api/fees no-token                             401
api /api/attendance no-token                       401
api /api/exams no-token                            401
api /api/notify/recipients no-token                401

app protected routes with mock token               401
api protected routes with mock token               401

app.assps.edu.pk                                   200
api.assps.edu.pk/health                            200
app /api/whatsapp/status                           200
api /api/whatsapp/status                           200
VPS RAM                                            3.8Gi total, 644Mi used, 3.2Gi available
```

Updated remaining blockers:

```text
Authenticated real-admin UI smoke still needs browser session verification.
Role-scoped IDOR tests still need valid parent/student/teacher fixture tokens.
Canonical deployment script still needs cleanup around duplicate backend runtime paths.
Meta production WhatsApp still needs production WABA/phone/app secret/public webhook readiness.
Playwright visual smoke still needs browser binary installation before automated screenshots.

FULL_ROCK_SOLID_ACCEPTANCE                         NOT_YET_COMPLETE
```

## Implementation Update - 2026-09-02 Canonical Deployment Guardrail

Defect addressed:

```text
Production backend has two code surfaces:
/var/www/apex-backend/src
/var/www/apex-backend active runtime root

Earlier emergency fixes had to be copied to both places manually.
That creates drift risk and can make a fixed source file fail in production.
```

Repair prepared:

```text
Added reviewed manual deploy helper:
ops/deploy-production.ps1

Added package scripts:
npm run deploy:production:dry-run
npm run deploy:production

Updated DEPLOYMENT.md with canonical deployment instructions.
```

Guardrails in helper:

```text
Default mode is dry-run only.
Real production deploy requires -Apply and -ConfirmProduction.
Frontend deploy creates timestamped backup, uploads built dist, normalizes permissions, runs nginx/app smoke.
Backend deploy excludes .env/node_modules/uploads/logs, preserves server .env, syncs /src and active runtime root, validates JS, restarts PM2, runs health checks.
```

Verification:

```text
package.json parse                                PASS
npm run deploy:production:dry-run -- -Mode Frontend PASS
npm run deploy:production:dry-run -- -Mode Backend  PASS
No production deploy was executed by this helper during validation.
```

Updated remaining blockers:

```text
Authenticated real-admin UI smoke still needs browser session verification.
Role-scoped IDOR tests still need valid parent/student/teacher fixture tokens.
First real deployment through the canonical helper should be supervised once before treating it as standard.
Meta production WhatsApp still needs production WABA/phone/app secret/public webhook readiness.
Playwright visual smoke still needs browser binary installation before automated screenshots.

FULL_ROCK_SOLID_ACCEPTANCE                         NOT_YET_COMPLETE
```
