# ASSPS RC2 Targeted Backend Deployment Report

Date: 2026-09-14

## Scope

RC2 deployment was executed as a targeted backend-only deployment.

The full deployment helper dry-run passed, but full `Both` deployment was not used because it would replace the entire frontend build and entire backend source tree from the isolated RC2 worktree. To avoid overwriting unrelated real-school production changes, only the selected RC2 backend hardening files were deployed.

## Production Server

```text
Hostinger VPS
Host: 187.127.121.221
SSH user: root
PM2 app: apex-backend
PM2 script: /var/www/apex-backend/server.js
Backend root: /var/www/apex-backend
Frontend root: /var/www/apex-os
```

SSH host key:

```text
ED25519 SHA256:DQTFFeD8s6TmAtxw74aceDsZSR79K6mOQA481TItcio
```

## Deployed Files

These files were deployed to both root runtime paths and the mirrored `src` paths:

```text
/var/www/apex-backend/server.js
/var/www/apex-backend/middleware/auth.js
/var/www/apex-backend/routes/authRoutes.js
/var/www/apex-backend/routes/dashboardRoutes.js
/var/www/apex-backend/routes/aiAnalyticsRoutes.js

/var/www/apex-backend/src/server.js
/var/www/apex-backend/src/middleware/auth.js
/var/www/apex-backend/src/routes/authRoutes.js
/var/www/apex-backend/src/routes/dashboardRoutes.js
/var/www/apex-backend/src/routes/aiAnalyticsRoutes.js
```

No frontend files were deployed in this pass.

## Backup

Selected-file backup:

```text
/var/www/apex-backend.rc2-selected-bak-20260914-014027
```

Environment backup:

```text
/var/www/apex-backend/.env.bak-rc2-20260914-014027
```

## Environment Adjustment

Added/set:

```text
AUTO_MIGRATE_ON_BOOT=false
```

Secret values were not printed or copied into local files.

## Verification

Deployment artifact hash:

```text
206fc2379fe2b8ad62a7db15d5670abcdc61ffde1a4fc3c40d8278f830c5d604
```

Remote syntax checks passed:

```text
node -c server.js
node -c middleware/auth.js
node -c routes/authRoutes.js
node -c routes/dashboardRoutes.js
node -c routes/aiAnalyticsRoutes.js
```

PM2:

```text
apex-backend online
apex-connect online
```

Health checks:

```text
http://127.0.0.1:5000/health PASS
https://api.assps.edu.pk/health PASS
https://app.assps.edu.pk/ PASS
```

Live contract:

```text
app frontend: 200
api health: 200
apex root redirect: 307
protected app/api routes without token: 401
protected app/api routes with mock token: 401
PASS
```

Hash verification:

```text
server.js                 aab08d4d6263414ebc179d413718b21e77c5fa0087ca271e682ecc9350006c9d
middleware/auth.js        7e4786e264fe4f9c6ce8eed898b129dc952914daad1aa6c8b3a54aed75945657
routes/authRoutes.js      64f0f58dadf8e659fbac78a1c3baf8c850a748589b93ade6f7a275e43687b972
routes/dashboardRoutes.js 4416d2f7cb8760cfc186d6393b631d7a770af1d5fdce25c34e96c3f89acf8d4f
routes/aiAnalyticsRoutes.js dc455c2f489c9786af2597835c396ceb6fec5f0aafbfba48fd38217082ceb9bd
```

The same hashes are present under `/var/www/apex-backend/src`.

## Remaining Notes

Service-token machine identity remains unconfigured:

```text
JARVIS_SCHOOL_SERVICE_TOKEN_SHA256=MISSING
```

This means JARVIS machine-to-machine private School access is still intentionally blocked until a real service token and claims are configured.

PM2 logs show an existing notification inbox SQL bind error in `notifyRoutes.js`. That route was not part of this targeted RC2 deployment and should be handled as a separate, scoped fix.

## Final Status

```text
RC2_TARGETED_BACKEND_DEPLOYED
PRODUCTION_BACKEND_HEALTHY
LIVE_ROUTE_CONTRACT_PASS
FRONTEND_UNTOUCHED
SERVICE_TOKEN_IDENTITY_PENDING
NOTIFICATION_INBOX_SQL_ERROR_REMAINS_SEPARATE
```
