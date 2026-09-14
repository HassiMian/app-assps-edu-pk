# ASSPS Production Deployment Report

Date: 2026-09-14

## Scope

Controlled low-traffic production deployment was performed after the operator confirmed nobody was using the system.

Deployment was intentionally targeted. Full frontend replacement and full backend tree replacement were not performed.

## Release Source

```text
Branch: release/assps-production-hardened-20260914
Commit: a8dedfb
```

## Files Deployed

The following backend files were deployed to both `/var/www/apex-backend` and `/var/www/apex-backend/src`:

```text
server.js
middleware/auth.js
routes/authRoutes.js
routes/dashboardRoutes.js
routes/aiAnalyticsRoutes.js
routes/notifyRoutes.js
```

## Predeploy Backups

```text
Database and backend copy:
/var/backups/assps/predeploy-20260914-142336

Targeted code backup:
/var/www/apex-backend.targeted-release-a8dedfb-bak-20260914-142535
```

## Safety Controls

```text
AUTO_MIGRATE_ON_BOOT=false verified before deploy.
NODE_ENV=production verified before deploy.
No database migration was executed.
Frontend static build was not replaced.
Secrets were not printed or committed.
```

## Verification

```text
Local syntax checks: PASS
Remote staged syntax checks: PASS
PM2 apex-backend restart: PASS
PM2 apex-backend status: online
PM2 apex-connect status: online
Production API health: PASS
Production app frontend: PASS
Live route contract: PASS
Notification authenticated inbox: PASS
JARVIS service-token read-only School API: PASS
```

## Public Checks

```text
https://app.assps.edu.pk = 200 OK
https://api.assps.edu.pk/health = ok
Protected no-token routes = 401
Protected mock-token routes = 401
```

## Notes

Recent backend logs include expected `JWT verification failed` entries from protected-route mock-token contract checks. Older tenant guard errors existed before this deploy and were not produced by the final verified health path.

## Result

```text
FINAL_STATUS=TARGETED_PRODUCTION_DEPLOY_PASS
ROLLBACK_AVAILABLE=YES
FRONTEND_UNTOUCHED=YES
DB_BACKUP_AVAILABLE=YES
```
